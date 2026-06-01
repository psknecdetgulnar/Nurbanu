/**
 * TakbisRecord → BelgeModel (spec §2)
 *
 * Parse pipeline'a DOKUNMAZ. Sadece parse çıktısını normalize eder ve
 * render katmanı için hazırlar.
 */
import type { TakbisRecord, SerhBeyan, Ipotek, Malik } from './types';
import type { BelgeModel, TakyidatItem, TakyidatTip, MalikItem } from './render/types';
import { parseToISO, extractSaat, extractDateYevmiye } from './render/dateUtils';

// ---------------------------------------------------------------------------
// Ana giriş noktası
// ---------------------------------------------------------------------------

export function normalizeRecord(r: TakbisRecord): BelgeModel {
  const { beyanlar, serhler, rehinSerhleri } = classifySerhBeyanlar(r.serhBeyanlar);

  return {
    belge: parseBelge(r),
    tasinmaz: parseTasinmaz(r),
    malikler: parseMaliklerNorm(r.malikler),
    beyanlar,
    serhler,
    rehinler: r.ipotekler.map(normalizeIpotek),
    rehinSerhleri,
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
  serhler: TakyidatItem[];
  rehinSerhleri: TakyidatItem[];
} {
  const beyanlar: TakyidatItem[] = [];
  const serhler: TakyidatItem[] = [];
  const rehinSerhleri: TakyidatItem[] = [];

  for (const sb of items) {
    const item = classifyAndParse(sb);
    if (item.tip === 'iik_150c') rehinSerhleri.push(item);
    else if (item.tip.startsWith('beyan_')) beyanlar.push(item);
    else serhler.push(item);
  }

  return { beyanlar, serhler, rehinSerhleri };
}

function classifyAndParse(sb: SerhBeyan): TakyidatItem {
  const tur  = sb.tur || '';
  const text = sb.aciklama || '';
  const tesisBilgisi = sb.tesisBilgisi || '';

  // ── Tip tespiti ──────────────────────────────────────────────────────────
  let tip: TakyidatTip;

  if (/^[Bb]eyan/.test(tur)) {
    if (/2565\s+Sayılı/i.test(text))           tip = 'beyan_2565';
    else if (/Yönetim\s+Planı/i.test(text))    tip = 'beyan_yonetim_plani';
    else if (/YABANCI.*SATILAMAZ|3255\b/i.test(text)) tip = 'beyan_yabanci';
    else                                        tip = 'beyan_diger';
  } else {
    // Şerh / Haciz / Tedbir / Rehin aile
    const combined = tur + ' ' + text;
    if (/[İI][İI]K[\s.]+150\s*\/\s*c/i.test(combined))          tip = 'iik_150c';
    else if (/satışına\s+gidilmiştir|satış.*[İI]cra/i.test(combined)) tip = 'satis';
    else if (/Kamu\s+Haczi/i.test(combined))                     tip = 'kamu_haczi';
    else if (/[İI]crai\s+[Hh]aciz/i.test(combined))             tip = 'icrai_haciz';
    else if (/[İI]htiyati\s+[Hh]aciz/i.test(combined))          tip = 'ihtiyati_haciz';
    else if (/[Tt]edbir/i.test(combined))                        tip = 'ihtiyati_haciz';
    else                                                          tip = 'beyan_diger';
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

  // Ham metin temizleme (spec §5.1 not)
  const ham = cleanHam(text);

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
// Yardımcı
// ---------------------------------------------------------------------------

function cleanHam(text: string): string {
  return text
    .replace(/\(\s*[ŞşSs]ablon\s*:[^)]*?\)/gi, '')
    .replace(/\(SN:\d+\)\s*/gi, '')
    .replace(/\d+\s*\/\s*\d+\s+BİLGİ\s+AMAÇLIDIR/gi, '')
    .replace(/BİLGİ\s+AMAÇLIDIR/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
