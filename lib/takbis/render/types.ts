/** Spec §2 — veri modeli ve TakyidatItem */

export type TakyidatTip =
  | 'icrai_haciz'
  | 'ihtiyati_haciz'
  | 'kamu_haczi'
  | 'satis'
  | 'iik_150c'
  | 'ipotek'
  | 'beyan_2565'
  | 'beyan_yonetim_plani'
  | 'beyan_yabanci'
  | 'beyan_diger'
  | 'hak_intifa'
  | 'hak_irtifak'
  | 'hak_ust'
  | 'hak_gecit'
  | 'hak_sukna'
  | 'hak_kaynak'
  | 'hak_diger_ayni';

export interface TakyidatItem {
  tip: TakyidatTip;
  /** Temizlenmiş ham açıklama (şablon notları, sayfa numaraları çıkarılmış) */
  ham: string;
  /** Yetkili makam / icra dairesi */
  merci: string;
  /** Karar / haciz yazısı tarihi — kaynaktaki haliyle (§3) */
  kararTarihi: string;
  esasNo: string;
  /** Bedel — TL birimi olmadan, sayı string */
  bedel: string;
  alacakli: string;
  /** Tescil tarihi ISO 8601 (sıralama + display için) */
  tescilTarihi: string;
  yevmiye: string;
  /** Yönetim planı / ipotek için ek alan */
  extra?: Record<string, string>;
}

export interface BelgeMeta {
  alimTarihi: string;   // ISO: 2021-05-20
  alimSaati: string;    // HH:MM
  dogrulamaKodu: string;
}

export interface Tasinmaz {
  zeminTipi: string;
  il: string;
  ilce: string;
  mahalle: string;
  ada: string;
  parsel: string;
  yuzolcum: string;
  bbNitelik: string;
  blok: string;
  kat: string;
  bbNo: string;
  arsaPay: string;
  arsaPayda: string;
  anaNitelik: string;
}

export interface MalikItem {
  ad: string;
  hissePay: string;
  edinmeTarihi: string;   // ISO
  edinmeYevmiye: string;
}

export interface EklentiDisplayItem {
  tanim: string;
  tip: string;
  tescilTarihi: string;  // ISO
  yevmiye: string;
}

export interface BelgeModel {
  belge: BelgeMeta;
  tasinmaz: Tasinmaz;
  malikler: MalikItem[];
  beyanlar: TakyidatItem[];
  hakMukellefiyetler: TakyidatItem[];
  serhler: TakyidatItem[];
  rehinler: TakyidatItem[];
  rehinSerhleri: TakyidatItem[];
  eklentiler: EklentiDisplayItem[];
}
