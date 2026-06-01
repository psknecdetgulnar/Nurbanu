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
];

async function fetchPOIs(lat: number, lng: number): Promise<POI[]> {
  const delta = 0.0135; // ~1.5 km
  const bbox  = `${lat - delta},${lng - delta},${lat + delta},${lng + delta}`;

  const query = `
[out:json][timeout:25];
(
  node["amenity"="school"](${bbox});
  node["amenity"="place_of_worship"](${bbox});
  node["amenity"="hospital"](${bbox});
  way["highway"="primary"](${bbox});
  way["highway"="secondary"](${bbox});
);
out center;
`.trim();

  let lastError: Error | null = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    `data=${encodeURIComponent(query)}`,
        signal:  AbortSignal.timeout(25000),
      });
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);

      const json = await res.json();
      return parseElements(json.elements ?? [], lat, lng);
    } catch (err) {
      lastError = err as Error;
    }
  }

  throw lastError ?? new Error('Overpass ulaşılamadı');
}

// ── Overpass element'lerini POI'ya dönüştür ─────────────────────────────────

const TYPE_MAP: Record<string, string> = {
  school:           'okul',
  place_of_worship: 'cami',
  hospital:         'hastane',
};

function parseElements(
  elements: Array<{ type: string; lat?: number; lng?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }>,
  originLat: number,
  originLng: number,
): POI[] {
  const pois: POI[] = [];

  for (const el of elements) {
    const tags = el.tags ?? {};

    // Koordinat: node → lat/lng, way → center
    let elLat: number | undefined;
    let elLng: number | undefined;

    if (el.type === 'node') {
      elLat = el.lat;
      elLng = (el as { lon?: number }).lon ?? (el as { lng?: number }).lng;
    } else if (el.type === 'way' && el.center) {
      elLat = el.center.lat;
      elLng = el.center.lon;
    }

    if (elLat == null || elLng == null) continue;

    // Tip tespiti
    let type = '';
    if (tags.amenity && TYPE_MAP[tags.amenity]) {
      type = TYPE_MAP[tags.amenity];
    } else if (tags.highway === 'primary') {
      type = 'ana yol';
    } else if (tags.highway === 'secondary') {
      type = 'ikincil yol';
    } else {
      continue;
    }

    const name = tags.name || tags['name:tr'] || type;
    pois.push({ name, type, distance: Math.round(haversine(originLat, originLng, elLat, elLng)) });
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

    // POI çek
    let pois: POI[];
    try {
      pois = await fetchPOIs(lat, lng);
    } catch {
      // Başarısız → kredi iade et
      await refundCredit(user.id);
      return NextResponse.json({ error: 'Harita verisi alınamadı. Lütfen tekrar deneyin.' }, { status: 502 });
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
      disclaimer: DISCLAIMER,
    });
  } catch (err) {
    console.error('[location-report]', err);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
