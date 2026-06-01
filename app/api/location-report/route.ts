import { NextRequest, NextResponse } from 'next/server';
import { createClient }               from '@/lib/supabase/server';
import { consumeCredit, getUserCreditStatus, refundCredit, checkAndResetCredits } from '@/lib/credits';

// ── Tipler ──────────────────────────────────────────────────────────────────

interface ReportInput {
  lat: number;
  lng: number;
  il: string;
  ilce: string;
  mahalle: string;
  ada?: string;
  parsel?: string;
}

interface POI {
  name: string;
  type: string;
  distance: number;
}

// ── Sabit metin ─────────────────────────────────────────────────────────────

const DISCLAIMER = `Bu rapor bilgilendirme amaçlıdır, resmi belge niteliği taşımaz.
Konum, kullanıcı tarafından harita üzerinde işaretlenmiştir.
Çevre bilgileri OpenStreetMap (OSM) açık verisine dayalıdır; eksik veya güncel olmayan kayıtlar içerebilir.
Mesafeler kuş uçuşu hesaplanmıştır.
Bu rapor içeriği sistemimizde saklanmamaktadır (KVKK).`;

// ── Haversine (kuş uçuşu mesafe, metre) ────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R    = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Overpass sorgusu ─────────────────────────────────────────────────────────

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

async function fetchPOIs(latRaw: number, lngRaw: number): Promise<POI[]> {
  const lat   = Number(latRaw);
  const lng   = Number(lngRaw);
  const delta = 0.027; // ~3 km yarıçap (daha geniş alan)
  const s = (lat - delta).toFixed(6);
  const w = (lng - delta).toFixed(6);
  const n = (lat + delta).toFixed(6);
  const e = (lng + delta).toFixed(6);
  const bbox = `${s},${w},${n},${e}`;

  // nwr = node + way + relation (okul/cami/hastane için tüm geometri tipleri)
  // highway: primary/secondary + trunk/motorway/tertiary de eklendi
  const query = [
    '[out:json][timeout:30];',
    '(',
    `  nwr["amenity"="school"](${bbox});`,
    `  nwr["amenity"="place_of_worship"](${bbox});`,
    `  nwr["amenity"="hospital"](${bbox});`,
    `  nwr["amenity"="clinic"](${bbox});`,
    `  way["highway"="motorway"](${bbox});`,
    `  way["highway"="trunk"](${bbox});`,
    `  way["highway"="primary"](${bbox});`,
    `  way["highway"="secondary"](${bbox});`,
    `  way["highway"="tertiary"](${bbox});`,
    ');',
    'out center;',    // center: way/relation koordinatı + tags (zaten dahil)
  ].join('\n');

  console.log(`[location-report] Overpass query bbox: ${bbox}`);

  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    // AbortController ile timeout (AbortSignal.timeout Node ≥17.3 gerektiriyor)
    const ctrl      = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 28000);

    try {
      const res = await fetch(endpoint, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept':       'application/json',
          'User-Agent':   'NurbanDegerleme/1.0',
        },
        body:    `data=${encodeURIComponent(query)}`,
        signal:  ctrl.signal,
        cache:   'no-store',
      });
      clearTimeout(timeoutId);

      // 429 = rate limit, 406/503 = geçici hata → sonraki endpoint'e geç
      if (res.status === 429 || res.status === 406 || res.status === 503) {
        throw new Error(`Overpass HTTP ${res.status} (rate limit / unavailable)`);
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Overpass HTTP ${res.status}: ${txt.slice(0, 200)}`);
      }

      const json = await res.json();
      const elems = json.elements ?? [];
      console.log(`[location-report] Overpass OK (${endpoint}), elements: ${elems.length}, types: ${[...new Set(elems.map((e: {type:string}) => e.type))].join(',')}`);
      return parseElements(elems, lat, lng);
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err as Error;
      console.error(`[location-report] Overpass failed (${endpoint}):`, lastError.message);
    }
  }

  throw lastError ?? new Error('Overpass ulaşılamadı');
}

// ── Overpass element'lerini POI'ya dönüştür ─────────────────────────────────

const TYPE_MAP: Record<string, string> = {
  school:           'okul',
  place_of_worship: 'cami',
  hospital:         'hastane',
  clinic:           'hastane',
  health_centre:    'hastane',
};

const HIGHWAY_MAP: Record<string, string> = {
  motorway:  'ana yol',
  trunk:     'ana yol',
  primary:   'ana yol',
  secondary: 'ikincil yol',
  tertiary:  'ikincil yol',
};

// Overpass raw element tipi (lon, node/way/relation/center hepsi dahil)
type OverpassEl = {
  type: string;
  lat?: number;
  lon?: number;        // Overpass node koordinatı
  center?: { lat: number; lon: number };  // way/relation merkezi
  tags?: Record<string, string>;
};

function parseElements(
  elements: OverpassEl[],
  originLat: number,
  originLng: number,
): POI[] {
  const pois: POI[] = [];
  let skipped = 0;

  for (const el of elements) {
    const tags = el.tags ?? {};

    // ── Koordinat çıkar ───────────────────────────────────────────────────
    let elLat: number | undefined;
    let elLng: number | undefined;

    if (el.type === 'node') {
      elLat = el.lat;
      elLng = el.lon;                      // Overpass: lon (not lng)
    } else if (el.center) {
      // way ve relation için center (out center; ile gelir)
      elLat = el.center.lat;
      elLng = el.center.lon;
    }

    if (elLat == null || elLng == null || isNaN(elLat) || isNaN(elLng)) {
      skipped++;
      continue;
    }

    // ── Tip tespiti ───────────────────────────────────────────────────────
    let type = '';
    if (tags.amenity && TYPE_MAP[tags.amenity]) {
      type = TYPE_MAP[tags.amenity];
    } else if (tags.highway && HIGHWAY_MAP[tags.highway]) {
      type = HIGHWAY_MAP[tags.highway];
    } else {
      continue;
    }

    const name = tags.name || tags['name:tr'] || type;
    pois.push({ name, type, distance: Math.round(haversine(originLat, originLng, elLat, elLng)) });
  }

  if (skipped > 0) {
    console.log(`[location-report] parseElements: ${pois.length} kept, ${skipped} skipped (no coords)`);
  }

  // Yakından uzağa sırala
  pois.sort((a, b) => a.distance - b.distance);

  // Her tip için en yakın 5 tane (kalabalık önleme)
  const typeCounts: Record<string, number> = {};
  return pois.filter((p) => {
    typeCounts[p.type] = (typeCounts[p.type] ?? 0) + 1;
    return typeCounts[p.type] <= 5;
  });
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // Kullanıcı kimliği
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 });

    // Kredi reset kontrolü (aylık premium sıfırlama)
    await checkAndResetCredits(user.id);

    // Kredi kontrol
    const creditStatus = await getUserCreditStatus(user.id);
    if (!creditStatus.canUse) {
      const msg = creditStatus.isExpired
        ? 'Deneme süreniz doldu. Premium\'a geçerek rapor oluşturabilirsiniz.'
        : 'Kalan krediniz yok. Bu ayki hakkınız doldu.';
      return NextResponse.json({ error: msg }, { status: 403 });
    }

    // Input parse
    const body: ReportInput = await req.json();
    const { lat, lng, il, ilce, mahalle, ada, parsel } = body;

    if (!lat || !lng || !il || !ilce) {
      return NextResponse.json({ error: 'Eksik parametre' }, { status: 400 });
    }

    // Kredi düş
    const consumed = await consumeCredit(user.id);
    if (!consumed) return NextResponse.json({ error: 'Kredi düşülemedi' }, { status: 403 });

    // POI çek — başarısız olursa kredi iade et (rollback)
    let pois: POI[] = [];
    let poiWarning: string | null = null;
    try {
      pois = await fetchPOIs(lat, lng);
    } catch (fetchErr) {
      // Overpass başarısız → krediyi iade et
      await refundCredit(user.id);
      const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error('[location-report] fetchPOIs failed, credit refunded:', msg);
      return NextResponse.json(
        { error: `Harita verisi alınamadı. Krediniz iade edildi. Lütfen tekrar deneyin. (${msg.slice(0, 80)})` },
        { status: 502 }
      );
    }

    // Rapor JSON oluştur (içerik KAYDEDILMEZ)
    return NextResponse.json({
      summary: {
        il, ilce, mahalle: mahalle || '',
        ada: ada || undefined,
        parsel: parsel || undefined,
        lat, lng,
        generatedAt: new Date().toISOString(),
      },
      pois,
      poiWarning,
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    console.error('[location-report]', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
