'use client';

import type { TakbisRecord } from './types';

/**
 * Central column definition for the Özet sheet.
 * Change order/labels here without touching any other file.
 */
export const SUMMARY_COLUMNS: Array<{ key: keyof TakbisRecord | string; header: string }> = [
  { key: 'dogrulamaKodu',          header: 'Doğrulama Kodu' },
  { key: 'tarih',                  header: 'Tarih' },
  { key: 'il',                     header: 'İl' },
  { key: 'ilce',                   header: 'İlçe' },
  { key: 'mahalleKoy',             header: 'Mahalle/Köy' },
  { key: 'mevkii',                 header: 'Mevkii' },
  { key: 'ada',                    header: 'Ada' },
  { key: 'parsel',                 header: 'Parsel' },
  { key: 'zeminTipi',              header: 'Zemin Tipi' },
  { key: 'anaTasinmazNitelik',     header: 'Ana Taşınmaz Nitelik' },
  { key: 'bagimsizBolumNitelik',   header: 'Bağımsız Bölüm Nitelik' },
  { key: 'blokKatGirisBBNo',       header: 'Blok/Kat/Giriş/BBNo' },
  { key: 'arsaPayPayda',           header: 'Arsa Pay/Payda' },
  { key: 'atYuzolcum',             header: 'AT Yüzölçüm (m2)' },
  { key: '_malikler',              header: 'Malik(ler)' },
  { key: 'ipotekVarYok',           header: 'İpotek Var/Yok' },
  { key: 'ipotekDereceSayisi',     header: 'İpotek Derece Sayısı' },
  { key: 'toplamIpotekBorcu',      header: 'Toplam İpotek Borcu (TL)' },
  { key: 'serhBeyanOzeti',         header: 'Şerh/Beyan Özeti' },
  { key: 'kaydiOlusturan',         header: 'Kaydı Oluşturan' },
  { key: 'kaynakDosya',            header: 'Kaynak Dosya' },
];

function summaryRow(r: TakbisRecord): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const col of SUMMARY_COLUMNS) {
    if (col.key === '_malikler') {
      row[col.header] = r.malikler.map((m) => m.malik).join('; ');
    } else {
      row[col.header] = r[col.key as keyof TakbisRecord] ?? '';
    }
  }
  return row;
}

/**
 * Generate and download a multi-sheet .xlsx file from a list of TakbisRecord objects.
 * All processing happens in the browser; nothing is sent to any server.
 */
export async function downloadExcel(records: TakbisRecord[], filename = 'takbis.xlsx'): Promise<void> {
  const XLSX = await import('xlsx');

  const wb = XLSX.utils.book_new();

  // ── Özet ──────────────────────────────────────────────────────────────
  const summaryData = records.map(summaryRow);
  const wsOzet = XLSX.utils.json_to_sheet(summaryData, {
    header: SUMMARY_COLUMNS.map((c) => c.header),
  });
  XLSX.utils.book_append_sheet(wb, wsOzet, 'Özet');

  // ── Mülkiyet ──────────────────────────────────────────────────────────
  const mulkData = records.flatMap((r) =>
    r.malikler.map((m) => ({
      'Doğrulama Kodu': r.dogrulamaKodu,
      'Sistem No': m.sistemNo,
      'Malik': m.malik,
      'El Birliği No': m.elBirligi,
      'Hisse Pay': m.hissePay,
      'Hisse Payda': m.hissePayda,
      'Metrekare': toNumIfPossible(m.metrekare),
      'Toplam Metrekare': toNumIfPossible(m.toplamMetrekare),
      'Edinme Sebebi-Tarih-Yevmiye': m.edimmeSebebiTarihYevmiye,
      'Terkin Sebebi-Tarih-Yevmiye': m.terkinSebebiTarihYevmiye,
    }))
  );
  const wsMulk = XLSX.utils.json_to_sheet(mulkData.length ? mulkData : [{}]);
  XLSX.utils.book_append_sheet(wb, wsMulk, 'Mülkiyet');

  // ── İpotek ────────────────────────────────────────────────────────────
  const ipotekData = records.flatMap((r) =>
    r.ipotekler.map((ip) => ({
      'Doğrulama Kodu': r.dogrulamaKodu,
      'Alacaklı': ip.alacakli,
      'Müşterek Mi': ip.musterekMi,
      'Borç (TL)': ip.borc,
      'Faiz': ip.faiz,
      'Derece/Sıra': ip.dereceSira,
      'Süre': ip.sure,
      'Tesis Tarih-Yevmiye': ip.tesisTarihYevmiye,
      'Borçlu Malik': ip.borcluMalik,
      'Malik Borç': ip.malikBorc,
      'Tescil Tarih-Yevmiye': ip.tescilTarihYevmiye,
    }))
  );
  const wsIpotek = XLSX.utils.json_to_sheet(ipotekData.length ? ipotekData : [{}]);
  XLSX.utils.book_append_sheet(wb, wsIpotek, 'İpotek');

  // ── Şerh-Beyan ────────────────────────────────────────────────────────
  const serhData = records.flatMap((r) =>
    r.serhBeyanlar.map((s) => ({
      'Doğrulama Kodu': r.dogrulamaKodu,
      'Tür': s.tur,
      'Açıklama': s.aciklama,
      'Malik/Lehtar': s.malikLehtar,
      'Tesis Kurum-Tarih-Yevmiye': s.tesisBilgisi,
      'Terkin Sebebi-Tarih-Yevmiye': s.terkinBilgisi,
    }))
  );
  const wsSerh = XLSX.utils.json_to_sheet(serhData.length ? serhData : [{}]);
  XLSX.utils.book_append_sheet(wb, wsSerh, 'Şerh-Beyan');

  // ── Write & trigger download ───────────────────────────────────────────
  XLSX.writeFile(wb, filename);
}

function toNumIfPossible(s: string): number | string {
  if (!s) return '';
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? s : n;
}
