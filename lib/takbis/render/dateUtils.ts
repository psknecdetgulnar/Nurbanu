/**
 * Tarih ayrıştırma yardımcıları — spec §3.
 *
 * Desteklenen giriş formatları:
 *   DD-MM-YYYY, D-M-YYYY      → "2021-05-20"
 *   DD.MM.YYYY, D.M.YYYY      → "2021-05-20"
 *   DD/MM/YYYY, D/M/YYYY      → "2021-05-20"
 *   "20-5-2021-07:31"         → "2021-05-20"  (Tarih alanı formatı)
 *   "20-5-2021 07:31"         → "2021-05-20"
 */
export function parseToISO(raw: string): string {
  if (!raw || !raw.trim()) return '';
  const s = raw.trim();

  // DD-MM-YYYY (olası -HH:MM veya boşluk+HH:MM soneki)
  const m1 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, '0')}-${m1[1].padStart(2, '0')}`;

  // DD.MM.YYYY
  const m2 = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, '0')}-${m2[1].padStart(2, '0')}`;

  // DD/MM/YYYY
  const m3 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m3) return `${m3[3]}-${m3[2].padStart(2, '0')}-${m3[1].padStart(2, '0')}`;

  // Zaten ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  return '';
}

/** "20-5-2021-07:31" veya "20-5-2021 07:31" → "07:31" */
export function extractSaat(raw: string): string {
  const m = raw.match(/(\d{2}:\d{2})(?:\s*$|-\s*$|$)/);
  return m ? m[1] : '';
}

/**
 * Yevmiye sayısını metin içinden çıkarır.
 * Önce metnin sonunda 3-6 haneli sayı arar; bulamazsa tarih sonrasındaki
 * ilk 3-6 haneli sayıya (yani tarih sütunundan sızan yevmiye) döner.
 */
function extractYevmiye(text: string, afterOffset: number): string {
  // 1) Metnin sonundaki 3-6 haneli sayı (standart konum)
  const fromEnd = text.match(/\b(\d{3,6})\s*$/)?.[1];
  if (fromEnd) return fromEnd;
  // 2) Tarih pattern'inden hemen sonra "- YEVMIYE"
  const afterText = text.slice(afterOffset);
  const immed = afterText.match(/^\s*[-–]\s*(\d{3,6})\b/)?.[1];
  if (immed) return immed;
  // 3) Tarih sonrasındaki ilk 3-6 haneli izole sayı (Şablon içine gömülü yevmiye)
  const first = afterText.match(/\b(\d{3,6})\b/)?.[1];
  return first ?? '';
}

/**
 * Metin içinden gömülü tescil tarihi + yevmiye çıkarır.
 *
 * Örnek: "Çanakkale - 11-12-2018 09:52 - 20442"
 * Örnek: "08-05-2018 10:07 - Tanımı) 7598"
 * Örnek: "28-12-2017 15:03 - 21940"
 */
export function extractDateYevmiye(text: string): { tescilISO: string; yevmiye: string } {
  if (!text) return { tescilISO: '', yevmiye: '' };

  // Birincil: DD-MM-YYYY HH:MM örüntüsü + yevmiye
  const m1 = text.match(/(\d{2}-\d{2}-\d{4})\s+\d{2}:\d{2}/);
  if (m1) {
    const iso = parseToISO(m1[1]);
    const yev = extractYevmiye(text, (m1.index ?? 0) + m1[0].length);
    return { tescilISO: iso, yevmiye: yev };
  }

  // İkincil: DD.MM.YYYY HH:MM
  const m2 = text.match(/(\d{2}\.\d{2}\.\d{4})\s+\d{2}:\d{2}/);
  if (m2) {
    const iso = parseToISO(m2[1]);
    const yev = extractYevmiye(text, (m2.index ?? 0) + m2[0].length);
    return { tescilISO: iso, yevmiye: yev };
  }

  // Geri dönüş: herhangi bir tarih + sondaki sayı
  const m3 = text.match(/(\d{1,2}[-./]\d{1,2}[-./]\d{4})/);
  if (m3) {
    const iso = parseToISO(m3[1]);
    const yev = extractYevmiye(text, (m3.index ?? 0) + m3[0].length);
    return { tescilISO: iso, yevmiye: yev };
  }

  return { tescilISO: '', yevmiye: '' };
}
