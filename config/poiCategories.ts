/**
 * Konum/çevre analizi — POI kategori konfigürasyonu ve tipleri.
 *
 * Yeni kategori eklemek için sadece `poiCategories` dizisine yeni obje ekleyin.
 * Birden fazla tag verilirse, bir POI'nin o kategoriye dahil olması için
 * TÜM tag'leri taşıması gerekir (AND mantığı — örn. cami = place_of_worship + muslim).
 */

export interface PoiTag {
  key: string;
  value: string;
}

export interface PoiCategoryConfig {
  id: string;
  label: string;
  tags: PoiTag[];
}

export const poiCategories: PoiCategoryConfig[] = [
  { id: 'school',      label: 'Okul',                        tags: [{ key: 'amenity', value: 'school' }] },
  { id: 'hospital',    label: 'Hastane',                     tags: [{ key: 'amenity', value: 'hospital' }] },
  { id: 'bus_stop',    label: 'Toplu Taşıma / Otobüs Durağı', tags: [{ key: 'highway', value: 'bus_stop' }] },
  { id: 'supermarket', label: 'Market',                      tags: [{ key: 'shop', value: 'supermarket' }] },
  { id: 'pharmacy',    label: 'Eczane',                      tags: [{ key: 'amenity', value: 'pharmacy' }] },
  { id: 'bank',        label: 'Banka',                       tags: [{ key: 'amenity', value: 'bank' }] },
  { id: 'park',        label: 'Park',                        tags: [{ key: 'leisure', value: 'park' }] },
  { id: 'mall',        label: 'AVM',                         tags: [{ key: 'shop', value: 'mall' }] },
  {
    id: 'mosque',
    label: 'Cami',
    tags: [
      { key: 'amenity',  value: 'place_of_worship' },
      { key: 'religion', value: 'muslim' },
    ],
  },
];

export function getCategoryById(id: string): PoiCategoryConfig | undefined {
  return poiCategories.find((c) => c.id === id);
}

// ── İstek / yanıt tipleri (client + server ortak) ───────────────────────────

export interface LocationAnalysisRequest {
  lat: number;
  lon: number;
  radiusKm: number;
  categoryIds: string[];
  // Rapor özeti için opsiyonel (analizi etkilemez)
  il?: string;
  ilce?: string;
  mahalle?: string;
  ada?: string;
  parsel?: string;
}

export interface LocationAnalysisItem {
  name: string;
  distanceM: number;
  distanceText: string;
  lat: number;
  lon: number;
}

export interface LocationAnalysisCategoryResult {
  categoryId: string;
  categoryLabel: string;
  items: LocationAnalysisItem[];
}

export interface LocationAnalysisResponse {
  radiusKm: number;
  center: { lat: number; lon: number };
  categories: LocationAnalysisCategoryResult[];
}
