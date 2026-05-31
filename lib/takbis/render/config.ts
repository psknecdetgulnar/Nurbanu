/**
 * FORMAT_CURRENCY_TR — spec §3 tek yerden kontrol.
 * false (varsayılan): sayılar olduğu gibi (95000, 8048.93)
 * true: Türkçe format (95.000, 8.048,93)
 */
export const FORMAT_CURRENCY_TR = false;

export function formatPara(s: string): string {
  if (!s) return '';
  if (!FORMAT_CURRENCY_TR) return s;
  const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? s : n.toLocaleString('tr-TR');
}

/** ISO tarih → DD.MM.YYYY */
export function isoToDisplay(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const [y, m, d] = iso.slice(0, 10).split('-');
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}
