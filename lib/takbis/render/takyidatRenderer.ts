/**
 * Takyidat metni oluşturucu — spec §4 / §5 / §6
 *
 * Kurallar:
 * - Açılış ve kapanış cümleleri daima basılır (§4).
 * - Sadece dolu haneler yazılır; boş hane başlığı hiç basılmaz (§4).
 * - Her hane içinde tescilTarihi asc, yevmiye asc sıralama (§6).
 * - Aynı yevmiye = aynı kayıt — sayımda bir kez (§6 dedup).
 * - Her satır `-` ile başlar, aralarında boşluk yok (§4).
 * - Parantez sonu: ` (DD.MM.YYYY tarih, N yevmiye)` (§5).
 * - Parse edilemeyen kalemlerde `ham` alanı aynen yazılır (§8).
 */
import type { BelgeModel, TakyidatItem, EklentiDisplayItem } from './types';
import { isoToDisplay, formatPara } from './config';

// ---------------------------------------------------------------------------
// Ana fonksiyon
// ---------------------------------------------------------------------------

export function renderTakyidat(model: BelgeModel): string {
  const { belge, beyanlar, hakMukellefiyetler, serhler, rehinler, rehinSerhleri, eklentiler } = model;

  const sorted = {
    beyanlar: sortItemsDesc(dedup(beyanlar)),
    hakMukellefiyetler: sortItems(dedup(hakMukellefiyetler ?? [])),
    serhler: sortItems(dedup(serhler)),
    rehinler: sortItems(dedup(rehinler)),
    rehinSerhleri: sortItems(dedup(rehinSerhleri)),
  };

  const hasAny = [sorted.beyanlar, sorted.hakMukellefiyetler, sorted.serhler, sorted.rehinler, sorted.rehinSerhleri]
    .some((arr) => arr.length > 0) || (eklentiler?.length ?? 0) > 0;

  const acilis = renderAcilis(belge, hasAny);
  const kapanis = renderKapanis(belge);

  const haneler: string[] = [];

  if (sorted.beyanlar.length > 0) {
    haneler.push('Beyanlar Hanesinde:\n' + sorted.beyanlar.map(renderItem).join('\n'));
  }
  if (sorted.hakMukellefiyetler.length > 0) {
    haneler.push('Hak ve Mükellefiyetler Hanesinde:\n' + sorted.hakMukellefiyetler.map(renderItem).join('\n'));
  }
  if (eklentiler && eklentiler.length > 0) {
    haneler.push('Eklenti Bilgileri:\n' + eklentiler.map(renderEklentiItem).join('\n'));
  }
  if (sorted.serhler.length > 0) {
    haneler.push('Şerhler Hanesinde:\n' + sorted.serhler.map(renderItem).join('\n'));
  }
  if (sorted.rehinler.length > 0) {
    haneler.push('Rehinler Hanesinde:\n' + sorted.rehinler.map(renderItem).join('\n'));
  }
  if (sorted.rehinSerhleri.length > 0) {
    haneler.push('Rehinlere Ait Şerhler:\n' + sorted.rehinSerhleri.map(renderItem).join('\n'));
  }

  const parts = [acilis, ...haneler, kapanis];
  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// Özet sayaç (§6)
// ---------------------------------------------------------------------------

/** Benzersiz yevmiye sayısı üzerinden toplam takyidat sayısı */
export function countTakyidat(model: BelgeModel): { beyan: number; serh: number; ipotek: number } {
  const uniq = (items: TakyidatItem[]) => new Set(items.map((i) => i.yevmiye || i.ham)).size;
  return {
    beyan: uniq([...model.beyanlar, ...(model.hakMukellefiyetler ?? [])]),
    serh: uniq([...model.serhler, ...model.rehinSerhleri]),
    ipotek: uniq(model.rehinler),
  };
}

// ---------------------------------------------------------------------------
// Açılış / Kapanış
// ---------------------------------------------------------------------------

function renderAcilis(belge: BelgeModel['belge'], hasAny: boolean): string {
  const tarih = isoToDisplay(belge.alimTarihi);
  const saat  = belge.alimSaati;
  if (hasAny) {
    return `Web Tapu portaldan elektronik ortamda ${tarih} tarih ve saat ${saat} itibarıyla alınan ve rapor ekinde yer alan Tapu Kayıt Belgesi'ne göre taşınmaz üzerinde aşağıda yer alan takyidatlar bulunmaktadır.`;
  } else {
    return `Web Tapu portaldan elektronik ortamda ${tarih} tarih ve saat ${saat} itibarıyla alınan ve rapor ekinde yer alan Tapu Kayıt Belgesi'ne göre taşınmaz üzerinde takyidat bulunmamaktadır.`;
  }
}

function renderKapanis(belge: BelgeModel['belge']): string {
  const tarih = isoToDisplay(belge.alimTarihi);
  return `${tarih} tarihinde alınmış olan Takbis belgesi ve Tapu senedi arasında farklılık bulunmamaktadır.`;
}

// ---------------------------------------------------------------------------
// Satır oluşturucu (tip başına şablon)
// ---------------------------------------------------------------------------

function renderItem(item: TakyidatItem): string {
  try {
    return '-' + dispatch(item);
  } catch {
    // Herhangi bir hatada ham metin kullan (§8)
    return '-' + item.ham + parens(item);
  }
}

function dispatch(item: TakyidatItem): string {
  switch (item.tip) {
    case 'icrai_haciz':    return renderIcraiHaciz(item);
    case 'ihtiyati_haciz': return renderIhtiyatiHaciz(item);
    case 'kamu_haczi':     return renderKamuHaczi(item);
    case 'satis':          return renderSatis(item);
    case 'iik_150c':       return renderIIK150c(item);
    case 'ipotek':         return renderIpotek(item);
    case 'beyan_2565':     return renderBeyan2565(item);
    case 'beyan_yonetim_plani': return renderBeyanYonetimPlani(item);
    case 'beyan_yabanci':  return renderBeyanYabanci(item);
    case 'beyan_diger':    return renderBeyanDiger(item);
    case 'hak_intifa':
    case 'hak_irtifak':
    case 'hak_ust':
    case 'hak_gecit':
    case 'hak_sukna':
    case 'hak_kaynak':
    case 'hak_diger_ayni': return renderHakMukellefiyet(item);
    default:               return item.ham + parens(item);
  }
}

// ── §5.1 Beyanlar ────────────────────────────────────────────────────────────

function renderBeyan2565(item: TakyidatItem): string {
  return `2565 Sayılı Kanunun 28. Maddesi Gereği Belirtilen Alan İçerisinde Kalmaktadır${parens(item)}`;
}

function renderBeyanYonetimPlani(item: TakyidatItem): string {
  const planTarihRaw = item.extra?.['planTarihi'] || item.kararTarihi || '';
  const d = item.tescilTarihi ? isoToDisplay(item.tescilTarihi) : '';
  const y = item.yevmiye || '';
  const hasDateYev = !!(d && y);
  const formattedPlan = normalizePlanDate(planTarihRaw, hasDateYev ? 'slash' : 'dot');
  if (!hasDateYev) {
    return `YÖNETİM PLANI: ${formattedPlan} (Tarih ve yevmiye belirtilmemiştir)`;
  }
  return `YÖNETİM PLANI: ${formattedPlan} (${d} tarih, ${y} yevmiye)`;
}

function renderBeyanYabanci(item: TakyidatItem): string {
  // Spec §5.1 — tam metin korunur; ham'dan kaynaktaki cümle alınır
  // Şablon notları cleanHam ile çıkarılmıştır
  return `${item.ham}${parens(item)}`;
}

function renderBeyanDiger(item: TakyidatItem): string {
  return `${item.ham}${parens(item)}`;
}

// ── §1/§2 Hak ve Mükellefiyetler ─────────────────────────────────────────────

function renderHakMukellefiyet(item: TakyidatItem): string {
  return `${item.ham}${parens(item)}`;
}

// ── §5.2 Şerhler ─────────────────────────────────────────────────────────────

function renderIcraiHaciz(item: TakyidatItem): string {
  const bedel = formatPara(item.bedel);
  return `İcrai Haciz : ${item.merci} nin ${item.kararTarihi} tarih ${item.esasNo} sayılı Haciz Yazısı sayılı yazıları ile ${bedel} TL bedel ile Alacaklı : ${item.alacakli} lehine haciz işlenmiştir.${parens(item)}`;
}

function renderIhtiyatiHaciz(item: TakyidatItem): string {
  const bedel = formatPara(item.bedel);
  return `İhtiyati Haciz : ${item.merci} nin ${item.kararTarihi} tarih ${item.esasNo} sayılı Haciz Yazısı sayılı yazıları ile. Borç : ${bedel} TL . (Alacaklı : ${item.alacakli} )${parens(item)}`;
}

function renderKamuHaczi(item: TakyidatItem): string {
  const bedel = formatPara(item.bedel);
  return `Kamu Haczi : ${item.merci} nin ${item.kararTarihi} tarih ${item.esasNo} sayılı Haciz Yazısı sayılı yazıları ile. Borç : ${bedel} TL (Alacaklı : ${item.merci} )${parens(item)}`;
}

function renderSatis(item: TakyidatItem): string {
  return `${item.merci} nin ${item.kararTarihi} tarih ${item.esasNo} sayılı İcra Dairesinin Yazısı yazısı ile satışına gidilmiştir.${parens(item)}`;
}

function renderIIK150c(item: TakyidatItem): string {
  return `İİK 150/c Md. Gereği İpoteğin paraya çevrilmesi için takibe geçilmiştir. ${item.merci} nin ${item.kararTarihi} tarih ${item.esasNo} sayılı Resmi Yazı${parens(item)}`;
}

// ── §5.3 Rehinler ────────────────────────────────────────────────────────────

function renderIpotek(item: TakyidatItem): string {
  // Parse hatası varsa ham alanını öne çıkar
  if (item.ham.startsWith('[PARSE HATASI')) {
    return item.ham;
  }
  const derece  = item.extra?.['derece'] || '?';
  const bedel   = formatPara(item.bedel)  || '?';
  const tarih   = isoToDisplay(item.tescilTarihi) || '?';
  const yevmiye = item.yevmiye || '?';
  return `${item.alacakli} lehine ${derece} dereceden ${bedel} TL bedelle ${tarih} tarih, ${yevmiye} yevmiye ile tesis edilmiş ipotek kaydı görülmüştür.`;
}

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------

function parens(item: TakyidatItem): string {
  const d = item.tescilTarihi ? isoToDisplay(item.tescilTarihi) : '';
  const y = item.yevmiye || '';
  if (!d || !y) return ' (Tarih ve yevmiye belirtilmemiştir)';
  return ` (${d} tarih, ${y} yevmiye)`;
}

/** Yönetim Planı tarihini istenilen ayraçla (nokta / eğik çizgi) biçimlendirir */
function normalizePlanDate(raw: string, sep: 'dot' | 'slash'): string {
  if (!raw) return '';
  const m = raw.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})/);
  if (!m) return raw;
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  const yy = m[3];
  return sep === 'dot' ? `${dd}.${mm}.${yy}` : `${dd}/${mm}/${yy}`;
}

function sortItems(items: TakyidatItem[]): TakyidatItem[] {
  return [...items].sort((a, b) => {
    const ta = a.tescilTarihi || '';
    const tb = b.tescilTarihi || '';
    if (ta !== tb) return ta < tb ? -1 : 1;
    const ya = Number(a.yevmiye) || 0;
    const yb = Number(b.yevmiye) || 0;
    return ya - yb;
  });
}

function sortItemsDesc(items: TakyidatItem[]): TakyidatItem[] {
  return [...items].sort((a, b) => {
    const ta = a.tescilTarihi || '';
    const tb = b.tescilTarihi || '';
    if (ta !== tb) return ta > tb ? -1 : 1;
    const ya = Number(a.yevmiye) || 0;
    const yb = Number(b.yevmiye) || 0;
    return yb - ya;
  });
}

// ---------------------------------------------------------------------------
// Eklenti görüntüleme yardımcıları
// ---------------------------------------------------------------------------

/** Yaygın OCR hataları ve büyük/küçük harf tutarsızlıkları için düzeltme tablosu */
const EKLENTI_TIP_NORMALIZE: Record<string, string> = {
  'komurluk': 'Kömürlük',
  'kömürlük': 'Kömürlük',
  'komurlu':  'Kömürlük',
  'depo':     'Depo',
  'garaj':    'Garaj',
  'otopark':  'Otopark',
  'bahce':    'Bahçe',
  'bahçe':    'Bahçe',
  'siginak':  'Sığınak',
  'sığınak':  'Sığınak',
  'teras':    'Teras',
  'balkon':   'Balkon',
  'bodrum':   'Bodrum',
  'kiler':    'Kiler',
  'ardiye':   'Ardiye',
  'anbar':    'Anbar',
};

/** Tip adını normalize eder (OCR düzeltmesi + title case) */
function normalizeTip(raw: string): string {
  return EKLENTI_TIP_NORMALIZE[raw.toLowerCase()] ?? raw;
}

/** Metni title case'e dönüştürür (Türkçe uyumlu) */
function toTitleCase(s: string): string {
  return s.split(/\s+/).map(w => w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w).join(' ');
}

/** Tip kelimesini normalize edip ALL CAPS döndürür (Format B için) */
function normalizeTypeAllCaps(word: string): string {
  const corrected = EKLENTI_TIP_NORMALIZE[word.toLowerCase()] ?? word;
  return corrected.toUpperCase();
}

/**
 * Eklenti kaydını formatlar:
 *  Format A — EK:N stil:  "- EK:5 DEPO (Tip: Depo)"
 *  Format B — Sayı+tip:   "- KÖMÜRLÜK (8 Kömürlük)"
 *  Format C — Varsayılan: "- TANIM (Tip: tip)"
 */
function renderEklentiItem(item: EklentiDisplayItem): string {
  const tarih = isoToDisplay(item.tescilTarihi);
  const yev   = item.yevmiye;
  const suffix = (tarih && yev) ? ` (${tarih} tarih, ${yev} yevmiye)` : ' (Tarih ve yevmiye belirtilmemiştir)';

  const tanim = item.tanim.trim();
  const tip   = item.tip.trim();

  // Format A: "EK:5 DEPO" → "- EK:5 DEPO (Tip: Depo)"
  // Extract exactly EK:{N} + one type word; any trailing institution noise is dropped.
  if (/^EK:\d+/i.test(tanim)) {
    const clean = tanim.match(/^(EK:\d+\s+\S+)/i)?.[1] ?? tanim;
    return `- ${clean} (Tip: ${normalizeTip(tip)})${suffix}`;
  }

  // Format B: "8 KÖMÜRLÜK" → "- KÖMÜRLÜK (8 Kömürlük)"
  // Use \S+ (not .+) to capture only the first type word; rest is institution noise.
  const numMatch = tanim.match(/^(\d+)\s+(\S+)/);
  if (numMatch) {
    const num      = numMatch[1];
    const typeWord = numMatch[2];
    return `- ${normalizeTypeAllCaps(typeWord)} (${num} ${toTitleCase(typeWord)})${suffix}`;
  }

  // Format C (varsayılan): "- TANIM (Tip: tip)"
  return `- ${tanim} (Tip: ${normalizeTip(tip)})${suffix}`;
}

/** Aynı ham+tarih+yevmiye olan kayıtları tekilleştirir (kural 8) */
function dedup(items: TakyidatItem[]): TakyidatItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.ham}|||${item.tescilTarihi}|||${item.yevmiye}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
