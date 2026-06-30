/**
 * Konum/çevre analizi — Overpass yardımcıları.
 * Sorgu üreteci, kategori eşleştirme, mesafe hesaplama.
 */
import type { PoiCategoryConfig } from '@/config/poiCategories';

// ── Haversine (kuş uçuşu mesafe, metre) ─────────────────────────────────────

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ── Mesafe metni: <1000 m → "430 m", ≥1000 m → "1.2 km" ─────────────────────

export function formatDistance(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

// ── Overpass union sorgusu (seçilen kategoriler, around filtresi) ───────────

function tagSelector(cat: PoiCategoryConfig): string {
  return cat.tags.map((t) => `["${t.key}"="${t.value}"]`).join('');
}

export function buildOverpassQuery(
  categories: PoiCategoryConfig[],
  lat: number,
  lon: number,
  radiusM: number,
): string {
  const around = `(around:${radiusM},${lat},${lon})`;
  const blocks = categories
    .map((cat) => `  nwr${tagSelector(cat)}${around};`)
    .join('\n');
  return ['[out:json][timeout:30];', '(', blocks, ');', 'out center tags;'].join('\n');
}

// ── Bir POI'yi kategoriye eşleştir (tüm tag'leri taşımalı) ──────────────────

export function matchCategory(
  tags: Record<string, string>,
  categories: PoiCategoryConfig[],
): PoiCategoryConfig | null {
  for (const cat of categories) {
    if (cat.tags.every((t) => tags[t.key] === t.value)) return cat;
  }
  return null;
}
