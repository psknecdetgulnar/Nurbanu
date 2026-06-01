export interface EklentiItem {
  sistemNo: string;
  tip: string;
  tanim: string;
  tesisTarihYevmiye: string;
}

export interface SerhBeyan {
  tur: string;
  aciklama: string;
  malikLehtar: string;
  tesisBilgisi: string;
  terkinBilgisi: string;
}

export interface Malik {
  sistemNo: string;
  malik: string;
  elBirligi: string;
  hissePay: string;
  hissePayda: string;
  metrekare: string;
  toplamMetrekare: string;
  edimmeSebebiTarihYevmiye: string;
  terkinSebebiTarihYevmiye: string;
}

export interface Ipotek {
  alacakli: string;
  musterekMi: string;
  borc: number | string;
  faiz: string;
  dereceSira: string;
  sure: string;
  tesisTarihYevmiye: string;
  borcluMalik: string;
  malikBorc: string;
  tescilTarihYevmiye: string;
}

export interface TakbisRecord {
  // Üst bilgi
  dogrulamaKodu: string;
  tarih: string;
  kaydiOlusturan: string;
  makbuzNo: string;
  dekontNo: string;
  basvuruNo: string;

  // Tapu kayıt bilgisi
  zeminTipi: string;
  tasinmazKimlikNo: string;
  ilIlce: string;
  il: string;
  ilce: string;
  kurumAdi: string;
  mahalleKoy: string;
  mevkii: string;
  ciltSayfaNo: string;
  kayitDurum: string;
  adaParsel: string;
  ada: string;
  parsel: string;
  atYuzolcum: number | string;
  bagimsizBolumNitelik: string;
  bagimsizBolumBrutYuzolcum: string;
  bagimsizBolumNetYuzolcum: string;
  blokKatGirisBBNo: string;
  arsaPayPayda: string;
  anaTasinmazNitelik: string;

  // Alt tablolar
  serhBeyanlar: SerhBeyan[];
  malikler: Malik[];
  ipotekler: Ipotek[];
  eklentiler: EklentiItem[];

  // Hesaplanan / türetilmiş alanlar
  ipotekVarYok: string;
  ipotekDereceSayisi: number;
  toplamIpotekBorcu: number;
  serhBeyanOzeti: string;

  // İç meta
  kaynakDosya: string;
}
