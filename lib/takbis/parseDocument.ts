import type { TakbisRecord, Malik, Ipotek, SerhBeyan, EklentiItem } from './types';
import { generateRiskSummary } from '../riskSummary';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function get(text: string, ...patterns: RegExp[]): string {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return (m[1] ?? '').trim();
  }
  return '';
}

function toNum(s: string): number | string {
  if (!s || !s.trim()) return '';
  const cleaned = s.trim();
  // Turkish thousands format: 5.000.000,00 — dots=thousands, comma=decimal
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(cleaned)) {
    const n = parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? cleaned : n;
  }
  // Plain decimal (500000.00) or integer — use parseFloat directly
  const n = parseFloat(cleaned.replace(',', '.'));
  return isNaN(n) ? cleaned : n;
}

// ---------------------------------------------------------------------------
// Section splitter
// ---------------------------------------------------------------------------
/**
 * Full TAKBIS section order:
 *   1. header (Tarih, Kaydı Oluşturan, Makbuz/Dekont/Başvuru)
 *   2. TAPU KAYIT BİLGİSİ
 *   3. TAŞINMAZA AİT ŞERH BEYAN İRTİFAK BİLGİLERİ  (taşınmaz-level)
 *   4. MÜLKİYET BİLGİLERİ
 *   5. MÜLKİYETE AİT ŞERH BEYAN İRTİFAK BİLGİLERİ  (owner-level) ← often missed
 *   6. MÜLKİYETE AİT REHİN / İPOTEK BİLGİLERİ
 */
function splitSections(text: string): Record<string, string> {
  const MARKERS: Array<{ key: string; re: RegExp }> = [
    { key: 'tapuKayit',    re: /TAPU\s+KAYIT\s+B[İI]LG[İI]S[İI]/i },
    { key: 'serhBeyan',    re: /TA[ŞS]INMAZA\s+A[İI]T\s+[ŞS]ERH/i },
    { key: 'mulkiyet',     re: /MÜLKİYET\s+B[İI]LG[İI]LER[İI](?!\s*NE|\s*AİT|\s*İLE)/i },
    { key: 'mulkiyetSerh', re: /MÜLK[İI]YETE\s+A[İI]T\s+[ŞS]ERH\s+BEYAN/i },
    { key: 'ipotek',       re: /MÜLK[İI]YETE\s+A[İI]T\s+REH[İI]N|[İI]POTEK\s+B[İI]LG[İI]LER[İI]/i },
  ];

  const positions: Array<{ key: string; index: number }> = [];
  for (const { key, re } of MARKERS) {
    const m = text.match(re);
    if (m && m.index != null) positions.push({ key, index: m.index });
  }
  positions.sort((a, b) => a.index - b.index);

  const result: Record<string, string> = {};
  result['header'] = positions.length > 0 ? text.slice(0, positions[0].index) : text;
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index;
    const end = positions[i + 1]?.index ?? text.length;
    result[positions[i].key] = text.slice(start, end);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Makbuz / Dekont / Başvuru No
// ---------------------------------------------------------------------------
function parseMakbuzBlock(text: string): { makbuzNo: string; dekontNo: string; basvuruNo: string } {
  // Layout A — inline: "Makbuz No : 123  Dekont No : 456  Başvuru No : 789"
  const mA = get(text, /Makbuz\s+No\s*:\s*(\S+)/i);
  if (mA) {
    return {
      makbuzNo: mA,
      dekontNo: get(text, /Dekont\s+No\s*:\s*(\S+)/i),
      basvuruNo: get(text, /Ba[şs]vuru\s+No\s*:\s*(\S+)/i),
    };
  }
  // Layout B — two-line: header row then values row
  const twoLine = text.match(
    /Makbuz\s+No\s+Dekont\s+No\s+Ba[şs]vuru\s+No\s*[\n\r]+\s*(\S+)\s+(\S+)\s+(\S+)/i
  );
  if (twoLine) return { makbuzNo: twoLine[1], dekontNo: twoLine[2], basvuruNo: twoLine[3] };
  return { makbuzNo: '', dekontNo: '', basvuruNo: '' };
}

// ---------------------------------------------------------------------------
// Şerh / Beyan / İrtifak table (used for both taşınmaz-level and owner-level)
// ---------------------------------------------------------------------------
function parseSerhBeyan(sectionText: string): SerhBeyan[] {
  if (!sectionText) return [];
  const rows: SerhBeyan[] = [];
  const lines = sectionText.split('\n').map((l) => l.trim()).filter(Boolean);
  const dataLines = lines.filter(
    (l) =>
      !/^(TA[ŞS]INMAZA|MÜLK[İI]YETE|[ŞS]ERH\s+BEYAN|Tür\s*[|:A])/i.test(l) &&
      !/^(Tür|Açıklama|Malik\/Lehtar|Tesis|Terkin)\s*$/i.test(l) &&
      !/^EKLENTİ\s+BİLGİLERİ/i.test(l)
  );

  let current: Partial<SerhBeyan> | null = null;
  let lastLineWasDate = false;
  for (const line of dataLines) {
    const turMatch = line.match(/^([ŞşSs]erh|[Bb]eyan|[İIiı]rtifak|[Hh]aciz|[Tt]edbir|[Rr]ehin|Kamu\s+Haczi)\b/i);
    if (turMatch) {
      if (current) rows.push(finSerhBeyan(current));
      current = { tur: turMatch[1], aciklama: line.slice(turMatch[0].length).trim() };
      lastLineWasDate = false;
    } else if (current) {
      // Lines starting with DD-MM-YYYY HH:MM are the date/tesis column
      if (/^\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}/.test(line)) {
        current.tesisBilgisi = ((current.tesisBilgisi ?? '') + ' ' + line).trim();
        lastLineWasDate = true;
      } else if (lastLineWasDate && /^\d{3,6}$/.test(line.trim())) {
        // Standalone yevmiye number immediately after a date line
        current.tesisBilgisi = ((current.tesisBilgisi ?? '') + ' ' + line).trim();
        lastLineWasDate = false;
      } else if (/^\d{11}/.test(line) || line === '-') {
        current.malikLehtar = ((current.malikLehtar ?? '') + ' ' + line).trim();
        lastLineWasDate = false;
      } else if (/Tesis|Kurum/i.test(line)) {
        current.tesisBilgisi = ((current.tesisBilgisi ?? '') + ' ' + line).trim();
        lastLineWasDate = false;
      } else if (/Terkin/i.test(line)) {
        current.terkinBilgisi = ((current.terkinBilgisi ?? '') + ' ' + line).trim();
        lastLineWasDate = false;
      } else {
        current.aciklama = ((current.aciklama ?? '') + ' ' + line).trim();
        lastLineWasDate = false;
      }
    }
  }
  if (current) rows.push(finSerhBeyan(current));
  return rows;
}

// ---------------------------------------------------------------------------
// Eklenti table (after EKLENTİ BİLGİLERİ heading)
// ---------------------------------------------------------------------------
function parseEklentiler(sectionText: string): EklentiItem[] {
  if (!sectionText) return [];
  const items: EklentiItem[] = [];
  const lines = sectionText.split('\n').map((l) => l.trim()).filter(Boolean);
  const dataLines = lines.filter(
    (l) =>
      !/^(EKLENTİ\s+BİLGİLERİ|Sistem\s+No|Tip\b|Tanım\b|Tesis|Terkin|BİLGİ\s+AMAÇLIDIR)/i.test(l) &&
      !/^\d+\s*\/\s*\d+\s*$/.test(l)
  );

  let pending: Partial<EklentiItem> | null = null;

  for (const line of dataLines) {
    // Row: {sistemNo} {content including tip+tanim+kurum} {DD-MM-YYYY} {HH:MM} [-] [yevmiye]
    const rowMatch = line.match(
      /^(\d{6,12})\s+(.+?)\s+(\d{2}-\d{2}-\d{4})\s+\d{2}:\d{2}\s*[-–]?\s*(\d{3,6})?/
    );
    if (rowMatch) {
      if (pending) items.push(finalizeEklenti(pending));
      const rawContent = rowMatch[2]
        .replace(/\s+\S+\([^)]+\)\s*[-–]?\s*$/, '')  // trailing "İlçe(VİLAYET) [-]"
        .replace(/\s+\S+\s*[-–]\s*$/, '')              // trailing "WORD [-]"
        .trim();
      const words = rawContent.split(/\s+/);
      const tip = words[0] ?? '';
      const tanim = words.slice(1).join(' ');
      const tarih = rowMatch[3];
      const yev = rowMatch[4] ?? '';
      pending = {
        sistemNo: rowMatch[1],
        tip,
        tanim,
        tesisTarihYevmiye: tarih + (yev ? ' - ' + yev : ''),
      };
    } else if (pending && !pending.tesisTarihYevmiye?.includes(' - ') && /^\d{3,6}$/.test(line)) {
      pending.tesisTarihYevmiye = (pending.tesisTarihYevmiye ?? '') + ' - ' + line;
    } else if (pending && pending.tesisTarihYevmiye?.includes(' - ') === false && /^\d{3,6}$/.test(line)) {
      pending.tesisTarihYevmiye = (pending.tesisTarihYevmiye ?? '') + ' - ' + line;
    }
  }
  if (pending) items.push(finalizeEklenti(pending));
  return items;
}

function finalizeEklenti(p: Partial<EklentiItem>): EklentiItem {
  return {
    sistemNo: p.sistemNo ?? '',
    tip: p.tip ?? '',
    tanim: p.tanim ?? '',
    tesisTarihYevmiye: p.tesisTarihYevmiye ?? '',
  };
}

function finSerhBeyan(p: Partial<SerhBeyan>): SerhBeyan {
  return {
    tur: p.tur ?? '',
    aciklama: p.aciklama ?? '',
    malikLehtar: (p.malikLehtar ?? '').trim(),
    tesisBilgisi: (p.tesisBilgisi ?? '').trim(),
    terkinBilgisi: (p.terkinBilgisi ?? '').trim(),
  };
}

// ---------------------------------------------------------------------------
// Mülkiyet table
// ---------------------------------------------------------------------------
function parseMalikler(sectionText: string): Malik[] {
  if (!sectionText) return [];
  const rows: Malik[] = [];
  const lines = sectionText.split('\n').map((l) => l.trim()).filter(Boolean);
  const dataLines = lines.filter(
    (l) =>
      !/^MÜLKİYET\s+B[İI]LG[İI]LER[İI]/i.test(l) &&
      !/^Sistem\s+No/i.test(l) &&
      !/^MÜLK[İI]YETE\s+A[İI]T/i.test(l)  // stop before owner-level şerh
  );

  let current: string[] | null = null;
  for (const line of dataLines) {
    // New malik row: line starts with 6-12 digit Sistem No
    if (/^\d{6,12}\b/.test(line)) {
      if (current) rows.push(parseMalikRow(current.join('\n')));
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) rows.push(parseMalikRow(current.join('\n')));
  return rows;
}

function parseMalikRow(rowText: string): Malik {
  const firstLine = rowText.split('\n')[0] ?? rowText;

  // Extract Sistem No (leading digits)
  const sistemNoMatch = firstLine.match(/^(\d{6,12})/);
  const sistemNo = sistemNoMatch?.[1] ?? '';

  // Remove "(SN:...) " prefix if present
  let rest = firstLine.slice(sistemNo.length).replace(/^\s*\(SN:\d+\)\s*/, '').trim();

  // Hisse Pay/Payda: look for " N/N " pattern (number slash number surrounded by spaces)
  const hisseMatch = rest.match(/\s+(\d+)\/(\d+)\s/);

  let malik = '';
  let hissePay = '';
  let hissePayda = '';
  let afterHisse = '';

  if (hisseMatch && hisseMatch.index !== undefined) {
    // Everything before the hisse fraction is the malik/company name
    malik = rest.slice(0, hisseMatch.index).trim();
    // Remove trailing VKN and dashes from company name
    malik = malik.replace(/\s+VKN\s*:\s*\d+\s*$/, '').replace(/\s+-\s*$/, '').trim();
    hissePay = hisseMatch[1];
    hissePayda = hisseMatch[2];
    afterHisse = rest.slice(hisseMatch.index + hisseMatch[0].length);
  } else {
    // No hisse fraction found; take everything up to "VKN:" as name
    malik = rest.split(/\s+VKN\s*:/i)[0].replace(/\s+-\s*$/, '').trim();
    afterHisse = '';
  }

  // From afterHisse: extract m2, toplam m2, edinme info, yevmiye
  const numMatches = afterHisse.match(/[\d.,]+/g) ?? [];
  const edinmeMatch = afterHisse.match(
    /(?:Kat\s+Karşılığı|Satış|Bağış|Temlik|Miras|[İI]potek)[^\d]*/i
  );
  const dateMatch = afterHisse.match(/(\d{2}-\d{2}-\d{4})/);
  const yevmiyeMatch = afterHisse.match(/\b(\d{4,})\s*$/);

  const edinme = [
    edinmeMatch?.[0]?.trim() ?? '',
    dateMatch?.[1] ?? '',
    yevmiyeMatch?.[1] ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return {
    sistemNo,
    malik,
    elBirligi: '',
    hissePay,
    hissePayda,
    metrekare: numMatches[0] ?? '',
    toplamMetrekare: numMatches[1] ?? '',
    edimmeSebebiTarihYevmiye: edinme,
    terkinSebebiTarihYevmiye: '',
  };
}

// ---------------------------------------------------------------------------
// İpotek table
// ---------------------------------------------------------------------------

// Watermark / sütun başlığı / sayfalama / alt-bölüm satırları — veri değil
const IPOTEK_NOISE_RE =
  /^(MÜLK[İI]YETE\s+A[İI]T\s+REH[İI]N|[İI]POTEK\s+B[İI]LG[İI]|Alacaklı|Müşterek\s*Mi|Borç\s*TL|Faiz\s*\(%|Derece.*S[ıi]ra|Süre\s*$|Tesis\s+Tarih|Tescil\s+Tarih|Borçlu\s+Malik|Malik\s+Borç|BİLGİ\s+AMAÇLIDIR|Sayfa\s+\d|\d+\s*\/\s*\d+\s*$|^[İI]potek$|^Mi\?\s*S[ıi]ra|[İI]poteğin\s+Konuldu|Ta[şs]ınmaz\s+Hisse|Payda\s+Sebebi|Tarih\s+Yev|Rehine\s+A[İI]t|Ş\s*\/\s*B\s*\/\s*[İI])/i;

function parseIpotekler(sectionText: string): Ipotek[] {
  if (!sectionText) return [];
  const rows: Ipotek[] = [];
  const lines = sectionText.split('\n').map((l) => l.trim()).filter(Boolean);

  // Watermark ve sütun başlığı satırlarını at
  const dataLines = lines.filter((l) => !IPOTEK_NOISE_RE.test(l));

  let current: string[] | null = null;
  for (const line of dataLines) {
    if (/^\(SN:\d+\)/i.test(line)) {
      if (current) {
        // Hayır/Evet görülmemiş row = sayfalama artefaktı, at
        if (/\b(Hayır|Evet)\b/i.test(current.join(' ')))
          rows.push(parseIpotekRow(current));
      }
      current = [line];
    } else if (current) {
      const sofar = current.join(' ');
      if (!/\b(Hayır|Evet)\b/i.test(sofar)) {
        current[0] = current[0] + ' ' + line;
      } else {
        current.push(line);
      }
    }
  }
  if (current && /\b(Hayır|Evet)\b/i.test(current.join(' ')))
    rows.push(parseIpotekRow(current));
  return rows;
}

/**
 * Continuation satırının BANKA ADI fragment'ı içerip içermediğini kontrol eder.
 * Sadece Türk bankacılık sektörü anahtar kelimeleri içeren satırlar kabul edilir.
 * Borçlu şirket adları (LİMİTED, A.Ş. vs.) reddedilir — BANKA olmak zorunda.
 */
function extractBankFragment(line: string): string {
  if (!/\bBANKA/i.test(line)) return '';   // Sadece BANKA içeren satırlar
  const m = line.match(/^(.+?)(?:\s+VKN\s*:\s*\d|\s+DEĞİŞKEN\b|\s+faizsiz\b|\s*%\s*\d|\s*$)/i);
  return (m ? m[1] : line).trim();
}

function parseIpotekRow(rowLines: string[]): Ipotek {
  // ── 1. Her satırdan (SN:NNN) önekini kaldır ───────────────────────────
  const cleanLines = rowLines.map(l => l.replace(/^\(SN:\d+\)\s*/i, '').trim());

  // ── 2. Hayır/Evet içeren satır = data satırı ──────────────────────────
  const dataLineIdx = cleanLines.findIndex(l => /\b(Hayır|Evet)\b/i.test(l));
  const dataLine    = dataLineIdx >= 0 ? cleanLines[dataLineIdx] : cleanLines[0];

  // ── 3. Banka adı = data satırındaki Hayır/Evet öncesi + continuation ──
  const musterekSplit = dataLine.match(/^([\s\S]+?)\s+(Hayır|Evet)\s+([\s\S]*)$/i);
  const alacakliBase  = (musterekSplit ? musterekSplit[1] : '').trim();
  const musterekMi    = musterekSplit ? musterekSplit[2] : 'Hayır';
  const data          = musterekSplit ? musterekSplit[3] : dataLine;

  const extraFragments = cleanLines
    .filter((_, i) => i !== dataLineIdx)
    .map(extractBankFragment)
    .filter(Boolean);
  const alacakli = [alacakliBase, ...extraFragments].filter(Boolean).join(' ').trim();

  // ── 4. Borç: Türkçe binlik (5.000.000,00) veya plain (500000.00) ──────
  const borcMatch =
    data.match(/\b(\d{1,3}(?:\.\d{3})+(?:,\d{2})?)\b/)  ??  // 5.000.000,00
    data.match(/\b(\d+\.\d{2})(?=\s*TL|\s|$)/)           ??  // 500000.00
    data.match(/\b(\d{4,}(?:,\d{2})?)\b/);                   // fallback
  const borcStr = borcMatch?.[1] ?? '';
  const borc    = borcStr ? toNum(borcStr) : '';

  // ── 5. Faiz — % önce, sonra DEĞİŞKEN/faizsiz ─────────────────────────
  const faiz = (
    data.match(/(%\s*[\d,.]+[^\s,;]*)/)?.[1] ??
    data.match(/\b(DEĞİŞKEN|faizsiz)\b/i)?.[1] ??
    ''
  ).trim();

  // ── 6. Derece/Sıra ─────────────────────────────────────────────────────
  const dereceSira = data.match(/\b([1-9]\d?\/\d{1,2})\b/)?.[1] ?? '';

  // ── 7. Tarihler: DD-MM-YYYY HH:MM ─────────────────────────────────────
  const dateMatches = [...data.matchAll(/(\d{2}-\d{2}-\d{4})\s+\d{2}:\d{2}/g)];
  const tesisTarih  = dateMatches[0]?.[1] ?? '';
  const tescilTarih = dateMatches[1]?.[1] ?? '';

  // ── 8. Yevmiye ─────────────────────────────────────────────────────────
  // A) Tarihten hemen sonra "- NNNN"
  // B) Tüm satırlarda "HH:MM - NNNN" kalıbı (sub-table dahil)
  // C) Continuation'daki son 4-5 haneli sayı (6+ hane = bedel → atla)
  const fullRowText = cleanLines.join(' ');

  function findYev(dateIdx: number, matchLen: number): string {
    const immed = data.slice(dateIdx + matchLen).match(/^\s*[-–]?\s*(\d{4,5})\b/)?.[1];
    if (immed) return immed;
    const timeYev = [...fullRowText.matchAll(/\d{2}:\d{2}\s*[-–]\s*(\d{4,5})\b/g)];
    if (timeYev.length > 0) return timeYev[timeYev.length - 1][1];
    const contText = cleanLines.filter((_, i) => i !== dataLineIdx).join(' ');
    const all = [...contText.matchAll(/\b(\d{4,5})\b/g)];
    return all.length > 0 ? all[all.length - 1][1] : '';
  }

  const tesisYev  = dateMatches[0] ? findYev(dateMatches[0].index ?? 0, dateMatches[0][0].length) : '';
  const tescilYev = dateMatches[1] ? findYev(dateMatches[1].index ?? 0, dateMatches[1][0].length) : '';

  return {
    alacakli,
    musterekMi,
    borc,
    faiz,
    dereceSira,
    sure: '',
    tesisTarihYevmiye:  tesisTarih  ? `${tesisTarih} ${tesisYev}`.trim()  : '',
    borcluMalik: '',
    malikBorc:   '',
    tescilTarihYevmiye: tescilTarih ? `${tescilTarih} ${tescilYev}`.trim() : '',
  };
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------
export function parseDocument(text: string, sourceFile = ''): TakbisRecord | null {
  if (!/Kaydı\s+Oluşturan\s*:/i.test(text)) return null;

  const sections = splitSections(text);
  const header      = sections['header']       ?? '';
  const tapuKayit   = sections['tapuKayit']    ?? '';
  const serhSec     = sections['serhBeyan']    ?? '';
  const mulkSec     = sections['mulkiyet']     ?? '';
  const mulkSerhSec = sections['mulkiyetSerh'] ?? '';
  const ipotekSec   = sections['ipotek']       ?? '';

  const combined = header + '\n' + tapuKayit;

  // ── Üst bilgi ─────────────────────────────────────────────────────────
  const kaydiOlusturan = get(
    combined,
    /Kaydı\s+Oluşturan\s*:\s*([\s\S]+?)(?=Makbuz|Dekont|Ba[şs]vuru|TAPU\s+KAYIT|\n\n)/i,
    /Kaydı\s+Oluşturan\s*:\s*(.+)/i
  ).replace(/\s+/g, ' ');

  // Date: "20-5-2021-07:31", "12-2-2026-14:12"  — capture time component if present
  const tarih = get(
    combined,
    /Tarih\s*:\s*(\d{1,2}[-./]\d{1,2}[-./]\d{4}(?:[-\s]\d{2}:\d{2})?)/i
  );

  const { makbuzNo, dekontNo, basvuruNo } = parseMakbuzBlock(combined);

  // ── Doğrulama kodu ────────────────────────────────────────────────────
  // The code is 8-14 chars, mixed case, and MUST contain at least one digit.
  // "Online", "Belge", "Tapu" etc. are excluded by the digit requirement.
  const lastLines = text.split('\n').slice(-30).join('\n');
  const codeMatches = lastLines.match(/\b([A-Za-z][A-Za-z0-9]{5,13})\b/g) ?? [];
  const dogrulamaKodu =
    codeMatches
      .filter(
        (w) =>
          /[a-z]/.test(w) &&          // at least one lowercase
          /[0-9]/.test(w) &&          // MUST have a digit (excludes "Online", "Tapu" etc.)
          !/^(Tarih|Toplam|Belge|Sayfa|Tapu|Taşınmaz|Kaydı|Bilgi|Amaç|Sistem|Malik|Arsa|Zemin|Bağım|Blok|Cilt|Mevkii|Kurum|Mahalle|Kayıt|Durum|Başvuru|Makbuz|Dekont|Derece|Terkin|Tesis|Edinme|Nitelik|Yüzöl|Yevmiye|Online|Doğrulama|TOPLAM|SAYFADAN)/i.test(w)
      )
      .pop() ?? '';

  // ── TAPU KAYIT BİLGİSİ ────────────────────────────────────────────────
  const zeminTipi = get(combined, /Zemin\s+Tipi\s*:\s*(\S+)/i);
  const tasinmazKimlikNo = get(combined, /Ta[şs]ınmaz\s+Kimlik\s+No\s*:\s*(\S+)/i);

  // İl/İlçe: handles "İl/İlçe:", "IL/ILCE:", and spacing variations
  const ilIlceRaw = get(
    combined,
    /[İI][lL]\s*\/\s*[İI][lL][çcÇC][eE]\s*:\s*([^\n:]+?)(?=\s+(?:Kurum|Mahalle|Mevkii|Cilt|Kayıt|[A-ZÇĞÜŞİÖ]{3})|[:\n]|$)/i,
    /[İI][lL]\s*\/\s*[İI][lL][çcÇC][eE]\s*:\s*([^\n]+)/i
  ).trim();
  const ilIlce = ilIlceRaw;
  const [il, ilce] = ilIlce.split('/').map((s) => s.trim());

  // Kurum Adı: stop before the next known label (Bağımsız, Mahalle, Mevkii, etc.)
  const kurumAdi = get(
    combined,
    /Kurum\s+Adı\s*:\s*([^\n:]+?)(?=\s+(?:Bağımsız|Mahalle|Mevkii|Cilt|Kayıt|Ada|Zemin|Blok|Arsa|Ana\s+Ta)|[:\n]|$)/i,
    /Kurum\s+Adı\s*:\s*([^\n:]+)/i
  ).trim();

  const mahalleKoy   = get(combined, /Mahalle\s*\/?\s*Köy\s*(?:Adı)?\s*:\s*([^\n:]+?)(?=\s+(?:Mevkii|Cilt|Ada)|[:\n]|$)/i).trim();
  const mevkii       = get(combined, /Mevkii\s*:\s*([^\n:]+?)(?=\s+(?:Cilt|Ada|Kayıt)|[:\n]|$)/i).trim();
  const ciltSayfaNo  = get(combined, /Cilt\s*\/\s*Sayfa\s*No\s*:\s*([^\n:]+?)(?=\s+[A-ZÇĞÜŞİÖ]|[:\n]|$)/i).trim();
  const kayitDurum   = get(combined, /Kayıt\s+Durum\s*:\s*([^\n:]+?)(?=[:\n]|$)/i).trim();

  const adaParsel    = get(combined, /Ada\s*\/\s*Parsel\s*:\s*([^\s:,]+)/i).trim();
  const [ada, parsel] = adaParsel.split('/').map((s) => s.trim());

  const atYuzolcum = toNum(get(combined, /AT\s+Yüzölçüm\s*(?:\(m2\))?\s*:\s*([\d.,]+)/i));

  const bagimsizBolumNitelik      = get(combined, /Bağımsız\s+Bölüm\s+Nitelik\s*:\s*([^\n:]+?)(?=[:\n]|Bağımsız|$)/i).trim();
  const bagimsizBolumBrutYuzolcum = get(combined, /Bağımsız\s+Bölüm\s+Brüt\s+Yüzölçümü?\s*:\s*([\d.,\s]+?)(?=[:\n]|Bağımsız|$)/i).trim();
  const bagimsizBolumNetYuzolcum  = get(combined, /Bağımsız\s+Bölüm\s+Net\s+Yüzölçümü?\s*:\s*([\d.,\s]+?)(?=[:\n]|$)/i).trim();
  const blokKatGirisBBNo          = get(combined, /Blok\s*\/\s*Kat\s*\/\s*Giriş\s*\/\s*BBNo\s*:\s*([^\n:]+?)(?=[:\n]|$)/i).trim();
  const arsaPayPayda              = get(combined, /Arsa\s+Pay\s*\/\s*Payda\s*:\s*([^\s:,]+)/i).trim();
  const anaTasinmazNitelik        = get(combined, /Ana\s+Ta[şs]ınmaz\s+Nitelik\s*:\s*([^\n:]+?)(?=[:\n]|$)/i).trim();

  // ── Alt tablolar ──────────────────────────────────────────────────────
  // Split serhSec at EKLENTİ BİLGİLERİ heading
  const eklentiIdx = serhSec.search(/EKLENTİ\s+BİLGİLERİ/i);
  const serhSecForBeyan = eklentiIdx >= 0 ? serhSec.slice(0, eklentiIdx) : serhSec;
  const eklentiSec      = eklentiIdx >= 0 ? serhSec.slice(eklentiIdx) : '';

  const rawBeyanlar = [
    ...parseSerhBeyan(serhSecForBeyan),
    ...parseSerhBeyan(mulkSerhSec),
  ];

  // Deduplicate by first 120 chars of aciklama (handles PDF duplicate rows)
  const seenAciklama = new Set<string>();
  const serhBeyanlar = rawBeyanlar.filter((sb) => {
    const key = sb.aciklama.trim().slice(0, 120);
    if (seenAciklama.has(key)) return false;
    seenAciklama.add(key);
    return true;
  });

  const eklentiler = parseEklentiler(eklentiSec);
  const malikler   = parseMalikler(mulkSec);
  const ipotekler  = parseIpotekler(ipotekSec);

  // ── Hesaplanan alanlar ────────────────────────────────────────────────
  const ipotekVarYok = ipotekler.length > 0 ? 'Var' : 'Yok';
  const ipotekDereceSayisi = ipotekler.length;
  const toplamIpotekBorcu = ipotekler.reduce((sum, ip) => {
    const n =
      typeof ip.borc === 'number'
        ? ip.borc
        : parseFloat(String(ip.borc).replace(/[^\d,.]/g, '').replace(',', '.')) || 0;
    return sum + n;
  }, 0);
  const serhBeyanOzeti = generateRiskSummary(serhBeyanlar.map((s) => s.aciklama));

  return {
    dogrulamaKodu,
    tarih,
    kaydiOlusturan,
    makbuzNo,
    dekontNo,
    basvuruNo,
    zeminTipi,
    tasinmazKimlikNo,
    ilIlce,
    il: il ?? '',
    ilce: ilce ?? '',
    kurumAdi,
    mahalleKoy,
    mevkii,
    ciltSayfaNo,
    kayitDurum,
    adaParsel,
    ada: ada ?? '',
    parsel: parsel ?? '',
    atYuzolcum,
    bagimsizBolumNitelik,
    bagimsizBolumBrutYuzolcum,
    bagimsizBolumNetYuzolcum,
    blokKatGirisBBNo,
    arsaPayPayda,
    anaTasinmazNitelik,
    serhBeyanlar,
    malikler,
    ipotekler,
    eklentiler,
    ipotekVarYok,
    ipotekDereceSayisi,
    toplamIpotekBorcu,
    serhBeyanOzeti,
    kaynakDosya: sourceFile,
  };
}
