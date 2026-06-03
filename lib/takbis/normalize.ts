/**
 * TakbisRecord → BelgeModel (spec §2)
 *
 * Parse pipeline'a DOKUNMAZ. Sadece parse çıktısını normalize eder ve
 * render katmanı için hazırlar.
 */
import type { TakbisRecord, SerhBeyan, Ipotek, Malik, EklentiItem } from './types';
import type { BelgeModel, TakyidatItem, TakyidatTip, MalikItem, EklentiDisplayItem } from './render/types';
import { parseToISO, extractSaat, extractDateYevmiye } from './render/dateUtils';

// ---------------------------------------------------------------------------
// Ana giriş noktası
// ---------------------------------------------------------------------------

export function normalizeRecord(r: TakbisRecord): BelgeModel {
  const { beyanlar, hakMukellefiyetler, serhler, rehinSerhleri } = classifySerhBeyanlar(r.serhBeyanlar);

  return {
    belge: parseBelge(r),
    tasinmaz: parseTasinmaz(r),
    malikler: parseMaliklerNorm(r.malikler),
    beyanlar,
    hakMukellefiyetler,
    serhler,
    rehinler: r.ipotekler.map(normalizeIpotek),
    rehinSerhleri,
    eklentiler: (r.eklentiler ?? []).map(normalizeEklenti),
  };
}

// ---------------------------------------------------------------------------
// Belge meta
// ---------------------------------------------------------------------------

function parseBelge(r: TakbisRecord): BelgeModel['belge'] {
  return {
    alimTarihi: parseToISO(r.tarih),
    alimSaati: extractSaat(r.tarih),
    dogrulamaKodu: r.dogrulamaKodu,
  };
}

// ---------------------------------------------------------------------------
// Taşınmaz
// ---------------------------------------------------------------------------

function parseTasinmaz(r: TakbisRecord): BelgeModel['tasinmaz'] {
  // "B/5+ÇATI ARASI//24" → blok:B, kat:5+ÇATI ARASI, bbNo:24
  const bbParts = (r.blokKatGirisBBNo || '').split('/');
  const blok = bbParts[0]?.trim() ?? '';
  const kat  = bbParts[1]?.trim() ?? '';
  // bbNo is 4th segment (index 3); 3rd segment is giriş (skip)
  const bbNo = bbParts[3]?.trim() ?? bbParts[2]?.trim() ?? '';

  const arsaParts = (r.arsaPayPayda || '').split('/');
  const arsaPay   = arsaParts[0]?.trim() ?? '';
  const arsaPayda = arsaParts[1]?.trim() ?? '';

  // Yüzölçüm as string — decimal comma preserved
  const yuzolcum = typeof r.atYuzolcum === 'number'
    ? String(r.atYuzolcum).replace('.', ',')
    : String(r.atYuzolcum || '');

  return {
    zeminTipi: r.zeminTipi,
    il: r.il,
    ilce: r.ilce,
    mahalle: r.mahalleKoy,
    ada: r.ada,
    parsel: r.parsel,
    yuzolcum,
    bbNitelik: r.bagimsizBolumNitelik,
    blok,
    kat,
    bbNo,
    arsaPay,
    arsaPayda,
    anaNitelik: r.anaTasinmazNitelik,
  };
}

// ---------------------------------------------------------------------------
// Malikler
// ---------------------------------------------------------------------------

function parseMaliklerNorm(malikler: Malik[]): MalikItem[] {
  return malikler.map((m) => {
    const edinme = m.edimmeSebebiTarihYevmiye || '';
    const dateMatch   = edinme.match(/(\d{2}-\d{2}-\d{4})/);
    const yevmiyeMatch = edinme.match(/\b(\d{4,6})\s*$/);
    const hisse = m.hissePay && m.hissePayda
      ? `${m.hissePay}/${m.hissePayda}`
      : (m.hissePay || m.hissePayda || '');

    return {
      ad: m.malik,
      hissePay: hisse,
      edinmeTarihi: dateMatch ? parseToISO(dateMatch[1]) : '',
      edinmeYevmiye: yevmiyeMatch?.[1] ?? '',
    };
  });
}

// ---------------------------------------------------------------------------
// Şerh / Beyan sınıflandırıcı
// ---------------------------------------------------------------------------

function classifySerhBeyanlar(items: SerhBeyan[]): {
  beyanlar: TakyidatItem[];
  hakMukellefiyetler: TakyidatItem[];
  serhler: TakyidatItem[];
  rehinSerhleri: TakyidatItem[];
} {
  const beyanlar: TakyidatItem[] = [];
  const hakMukellefiyetler: TakyidatItem[] = [];
  const serhler: TakyidatItem[] = [];
  const rehinSerhleri: TakyidatItem[] = [];

  for (const sb of items) {
    const item = classifyAndParse(sb);
    if (item.tip === 'iik_150c') rehinSerhleri.push(item);
    else if (item.tip.startsWith('hak_')) hakMukellefiyetler.push(item);
    else if (item.tip.startsWith('beyan_')) beyanlar.push(item);
    else serhler.push(item);
  }

  return { beyanlar, hakMukellefiyetler, serhler, rehinSerhleri };
}

function classifyAndParse(sb: SerhBeyan): TakyidatItem {
  const tur  = sb.tur || '';
  const text = sb.aciklama || '';
  const tesisBilgisi = sb.tesisBilgisi || '';

  // ── Tip tespiti ──────────────────────────────────────────────────────────
  let tip: TakyidatTip;

  if (/^[Bb]eyan/.test(tur)) {
    if (/2565\s+Sayılı/i.test(text))                    tip = 'beyan_2565';
    else if (/Yönetim\s+Planı/i.test(text))             tip = 'beyan_yonetim_plani';
    else if (/YABANCI.*SATILAMAZ|3255\b/i.test(text))   tip = 'beyan_yabanci';
    else if (/[İI]ntifa\s+[Hh]akkı/i.test(text))       tip = 'hak_intifa';
    else if (/[İI]rtifak\s+[Hh]akkı/i.test(text))      tip = 'hak_irtifak';
    else if (/Üst\s+[Hh]akkı/i.test(text))             tip = 'hak_ust';
    else if (/[Gg]eçit\s+[Hh]akkı/i.test(text))        tip = 'hak_gecit';
    else if (/Sükna\s+[Hh]akkı/i.test(text))           tip = 'hak_sukna';
    else if (/[Kk]aynak\s+[Hh]akkı/i.test(text))       tip = 'hak_kaynak';
    else                                                 tip = 'beyan_diger';
  } else {
    // Şerh / Haciz / Tedbir / Rehin / İrtifak aile
    const combined = tur + ' ' + text;
    if (/[İI][İI]K[\s.]+150\s*\/\s*c/i.test(combined))             tip = 'iik_150c';
    else if (/satışına\s+gidilmiştir|satış.*[İI]cra/i.test(combined)) tip = 'satis';
    else if (/Kamu\s+Haczi/i.test(combined))                         tip = 'kamu_haczi';
    else if (/[İI]crai\s+[Hh]aciz/i.test(combined))                 tip = 'icrai_haciz';
    else if (/[İI]htiyati\s+[Hh]aciz/i.test(combined))              tip = 'ihtiyati_haciz';
    else if (/[Tt]edbir/i.test(combined))                            tip = 'ihtiyati_haciz';
    else if (/^[İIiı]rtifak\b/i.test(tur) || /[İI]ntifa\s+[Hh]akkı/i.test(combined)) tip = 'hak_intifa';
    else if (/[İI]rtifak\s+[Hh]akkı/i.test(combined))              tip = 'hak_irtifak';
    else if (/Üst\s+[Hh]akkı/i.test(combined))                      tip = 'hak_ust';
    else if (/[Gg]eçit\s+[Hh]akkı/i.test(combined))                 tip = 'hak_gecit';
    else if (/Sükna\s+[Hh]akkı/i.test(combined))                    tip = 'hak_sukna';
    else if (/[Kk]aynak\s+[Hh]akkı/i.test(combined))                tip = 'hak_kaynak';
    else                                                              tip = 'beyan_diger';
  }

  // ── Alan çıkarma ──────────────────────────────────────────────────────────
  let merci = '';
  let kararTarihi = '';
  let esasNo = '';
  let bedel = '';
  let alacakli = '';

  if (!tip.startsWith('beyan_')) {
    // Merci: "Haciz : {merci} nin"
    const merciM = text.match(/(?:İcrai\s+Haciz|İhtiyati\s+Haciz|Kamu\s+Haczi)\s*:\s*(.+?)\s+(?:nin\b|'nin\b)/i)
      || text.match(/^(.+?(?:[İI]cra\s+(?:Dairesi|Müdürlüğü)|Hukuk\s+Mahkemesi))\s+(?:nin\b)/i);
    merci = merciM?.[1]?.trim() ?? '';

    // kararTarihi: DD/MM/YYYY tarih (kaynaktaki haliyle — spec §3)
    kararTarihi = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+tarih/i)?.[1] ?? '';

    // esasNo
    esasNo = text.match(/(\d{4}\/[\d]+[^\s]*(?:\s*ESAS|E\.)?)/i)?.[1]?.trim() ?? '';

    // bedel
    bedel = text.match(/([\d,. ]+)\s*TL/i)?.[1]?.trim().replace(/\s+/g, '') ?? '';

    // alacakli
    alacakli = text.match(/Alacaklı\s*:\s*([^\n()]+?)(?:\s+(?:lehine|ve\s|$)|\s*\))/i)?.[1]?.trim()
      || text.match(/Alacaklı\s*:\s*(.+?)\s*$/im)?.[1]?.trim()
      || '';
  }

  // Tescil tarihi + yevmiye
  const { tescilISO, yevmiye } = extractDateYevmiye(tesisBilgisi || text);

  // Ham metin temizleme — hak_* için kişisel veri de çıkarılır
  const ham = tip.startsWith('hak_') ? cleanAyniHakHam(text) : cleanHam(text);

  // Ek alanlar (Yönetim Planı tarihi vb.)
  const extra: Record<string, string> = {};
  if (tip === 'beyan_yonetim_plani') {
    extra['planTarihi'] = text.match(/Yönetim\s+Planı\s*:\s*([^\s(]+)/i)?.[1] ?? '';
  }

  return { tip, ham, merci, kararTarihi, esasNo, bedel, alacakli, tescilTarihi: tescilISO, yevmiye, extra };
}

// ---------------------------------------------------------------------------
// İpotek → TakyidatItem (rehinler)
// ---------------------------------------------------------------------------

function normalizeIpotek(ip: Ipotek): TakyidatItem {
  const tescilText = ip.tescilTarihYevmiye || ip.tesisTarihYevmiye || '';
  const { tescilISO, yevmiye } = extractDateYevmiye(tescilText);

  const derece = ip.dereceSira
    || ip.faiz.match(/(\d+\/\d+)/)?.[1]
    || '';

  // toFixed(2) ile ondalık kısmı koru: 500000 → "500000.00"
  const bedel = typeof ip.borc === 'number'
    ? ip.borc.toFixed(2)
    : String(ip.borc || '');

  const alacakli = (ip.alacakli || '')
    .replace(/^\(SN:\d+\)\s*/i, '')
    .trim();

  // ── Doğrulama: kritik alanlar boşsa parse hatası olarak işaretle ───────
  const missing: string[] = [];
  if (!alacakli)  missing.push('lehdar');
  if (!derece)    missing.push('derece');
  if (!bedel)     missing.push('bedel');
  if (!tescilISO) missing.push('tarih');
  if (!yevmiye)   missing.push('yevmiye');

  const ham = missing.length > 0
    ? `[PARSE HATASI — eksik: ${missing.join(', ')}] ${alacakli || ip.alacakli || ''}`
    : `${alacakli} lehine ${derece} dereceden ipotek`;

  return {
    tip: 'ipotek',
    ham,
    merci: alacakli,
    kararTarihi: '',
    esasNo: '',
    bedel,
    alacakli,
    tescilTarihi: tescilISO,
    yevmiye,
    extra: { derece },
  };
}

// ---------------------------------------------------------------------------
// Eklenti normalizer
// ---------------------------------------------------------------------------

function normalizeEklenti(e: EklentiItem): EklentiDisplayItem {
  const { tescilISO, yevmiye } = extractDateYevmiye(e.tesisTarihYevmiye);
  return { tanim: e.tanim, tip: e.tip, tescilTarihi: tescilISO, yevmiye };
}

// ---------------------------------------------------------------------------
// Yardımcı
// ---------------------------------------------------------------------------

function cleanHam(text: string): string {
  return text
    .replace(/\(\s*[ŞşSs]ablon\s*:[^)]*?\)/gi, '')       // Şablon templates
    .replace(/[ŞşSs]ablon\s*:[^\n]+/gi, '')               // Standalone şablon lines
    .replace(/\(SN:\d+\)\s*/gi, '')
    .replace(/\d+\s*\/\s*\d+\s+BİLGİ\s+AMAÇLIDIR/gi, '')
    .replace(/BİLGİ\s+AMAÇLIDIR/gi, '')
    // Remove date-time patterns leaked from TAKBIS right columns (DD-MM-YYYY HH:MM -)
    .replace(/\s+\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}\s*[-–]?/g, ' ')
    // Remove trailing yevmiye number
    .replace(/\s+\d{3,6}\s*$/, '')
    // Remove "MUNICIPALITY -" column noise appearing in middle of text
    .replace(/\s+\S+\s+[-–](?=\s)/g, ' ')
    // Remove trailing "MUNICIPALITY -"
    .replace(/\s+\S+\s+[-–]\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Ayni hak kayıtları için agresif kişisel veri temizleme */
function cleanAyniHakHam(text: string): string {
  return cleanHam(text)
    // TCKN (11 haneli TC kimlik no)
    .replace(/\b\d{11}\b/g, '')
    // KN / TCKN etiketli numaralar
    .replace(/\bT\.?C\.?\s*Kimlik\s*(?:No|Numaras[ıi])\s*:\s*\d+/gi, '')
    .replace(/\bTCKN\s*:\s*\d+/gi, '')
    .replace(/\bKN\s*:\s*\d+/gi, '')
    // Hak sahibi / lehdar / adına ifadeleri ve sonrasındaki isim
    .replace(/(?:Hak\s+Sahibi|Lehdar|Lehine|Ad[ıi]na)\s*:\s*[^,()\n]+/gi, '')
    // Parantez içi kişisel bilgiler (TC/TCKN içeriyorsa)
    .replace(/\([^)]*(?:\d{11}|TCKN|Hak\s+Sahibi)[^)]*\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
