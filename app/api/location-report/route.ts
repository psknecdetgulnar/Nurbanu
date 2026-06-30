import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { consume, refund } from '@/lib/credits';
import { getCategoryById } from '@/config/poiCategories';
import type {
  PoiCategoryConfig,
  LocationAnalysisResponse,
  LocationAnalysisCategoryResult,
  LocationAnalysisItem,
} from '@/config/poiCategories';
import { haversineM, formatDistance, buildOverpassQuery, matchCategory } from '@/lib/location/overpass';

export const runtime = 'nodejs';

// ── Overpass uç noktaları (sırayla denenir) ─────────────────────────────────
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

type OverpassEl = {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

// Overpass'ı çağır; hata türünü ayırt et (timeout / ratelimit / error)
type FetchFail = { kind: 'timeout' | 'ratelimit' | 'error'; message: string };

async function fetchOverpass(query: string): Promise<{ ok: true; elements: OverpassEl[] } | { ok: false; fail: FetchFail }> {
  let lastFail: FetchFail = { kind: 'error', message: 'Overpass ulaşılamadı' };

  for (const endpoint of OVERPASS_ENDPOINTS) {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 28000);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'NurbanDegerleme/1.0',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: ctrl.signal,
        cache: 'no-store',
      });
      clearTimeout(timeoutId);

      if (res.status === 429) { lastFail = { kind: 'ratelimit', message: 'rate limit' }; continue; }
      if (res.status === 406 || res.status === 503 || res.status === 504) {
        lastFail = { kind: 'error', message: `HTTP ${res.status}` }; continue;
      }
      if (!res.ok) { lastFail = { kind: 'error', message: `HTTP ${res.status}` }; continue; }

      const json = await res.json();
      return { ok: true, elements: (json.elements ?? []) as OverpassEl[] };
    } catch (err) {
      clearTimeout(timeoutId);
      const aborted = err instanceof Error && err.name === 'AbortError';
      lastFail = aborted ? { kind: 'timeout', message: 'timeout' } : { kind: 'error', message: String(err) };
    }
  }
  return { ok: false, fail: lastFail };
}

// ── Element'leri kategoriye göre grupla ─────────────────────────────────────
function groupResults(
  elements: OverpassEl[],
  selected: PoiCategoryConfig[],
  lat: number,
  lon: number,
): LocationAnalysisCategoryResult[] {
  const buckets: Record<string, LocationAnalysisItem[]> = {};
  for (const cat of selected) buckets[cat.id] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};
    const cat = matchCategory(tags, selected);
    if (!cat) continue;

    const elLat = el.type === 'node' ? el.lat : el.center?.lat;
    const elLon = el.type === 'node' ? el.lon : el.center?.lon;
    if (elLat == null || elLon == null) continue;

    const distanceM = haversineM(lat, lon, elLat, elLon);
    const name = tags.name || tags['name:tr'] || `İsimsiz ${cat.label}`;
    buckets[cat.id].push({ name, distanceM, distanceText: formatDistance(distanceM), lat: elLat, lon: elLon });
  }

  return selected.map((cat) => ({
    categoryId: cat.id,
    categoryLabel: cat.label,
    items: buckets[cat.id].sort((a, b) => a.distanceM - b.distanceM),
  }));
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const lat = Number(body.lat);
    const lon = Number(body.lon ?? body.lng);
    const radiusKm = Number(body.radiusKm);
    const categoryIds: unknown = body.categoryIds;

    // ── Doğrulama ──────────────────────────────────────────────────────────
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return NextResponse.json({ error: 'Geçerli bir konum bilgisi bulunamadı.' }, { status: 400 });
    }
    if (!Number.isFinite(radiusKm) || radiusKm < 0.1 || radiusKm > 10) {
      return NextResponse.json({ error: 'Yarıçap 0.1 ile 10 km arasında olmalıdır.' }, { status: 400 });
    }
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return NextResponse.json({ error: 'Çevre analizi için en az bir kategori seçmelisiniz.' }, { status: 400 });
    }

    const selected = categoryIds
      .map((id) => (typeof id === 'string' ? getCategoryById(id) : undefined))
      .filter((c): c is PoiCategoryConfig => Boolean(c));
    if (selected.length === 0) {
      return NextResponse.json({ error: 'Geçerli kategori seçilmedi.' }, { status: 400 });
    }

    // ── Kredi düş (yetersizse hiç düşmeden false) ──────────────────────────
    const result = await consume('location_report');
    if (!result.ok) {
      return NextResponse.json(
        { error: 'Krediniz yetersiz. Hesabınıza kredi ekleyin.', balance: result.balance },
        { status: 403 }
      );
    }

    // ── Overpass sorgusu ───────────────────────────────────────────────────
    const radiusM = Math.round(radiusKm * 1000);
    const query = buildOverpassQuery(selected, lat, lon, radiusM);
    const fetched = await fetchOverpass(query);

    if (!fetched.ok) {
      await refund('location_report'); // başarısız → krediyi iade et
      const msg =
        fetched.fail.kind === 'timeout'
          ? 'Çevre verileri alınırken zaman aşımı oluştu. Lütfen tekrar deneyin.'
          : fetched.fail.kind === 'ratelimit'
          ? 'Çok kısa sürede fazla sorgu yapıldı. Lütfen birkaç saniye sonra tekrar deneyin.'
          : 'Çevre analizi şu anda tamamlanamadı. Lütfen daha sonra tekrar deneyin.';
      const status = fetched.fail.kind === 'ratelimit' ? 429 : 502;
      return NextResponse.json({ error: msg }, { status });
    }

    const categories = groupResults(fetched.elements, selected, lat, lon);

    const response: LocationAnalysisResponse & { balance: number } = {
      radiusKm,
      center: { lat, lon },
      categories,
      balance: result.balance,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error('[location-report]', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
