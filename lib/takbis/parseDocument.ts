import type { TakbisRecord, Malik, Ipotek, SerhBeyan } from './types';
import { generateRiskSummary } from '../riskSummary';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return first capture group from the first matching pattern. */
function get(text: string, ...patterns: RegExp[]): string {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return (m[1] ?? '').trim();
  }
  return '';
}

/**
 * Return ALL non-overlapping matches of the first capture group.
 * Used for extracting repeating values (e.g. ipotek rows).
 */
function getAll(text: string, pattern: RegExp): string[] {
  const results: string[] = [];
  for (const m of text.matchAll(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g'))) {
    if (m[1]) results.push(m[1].trim());
  }
  return results;
}

/** Parse a Turkish number string ("1.234,56") into a JS number. */
function toNum(s: string): number | string {
  if (!s || !s.trim()) return '';
  const cleaned = s.trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? s.trim() : n;
}

/**
 * Split the document text into named sections using section-header markers.
 * Handles both "Kaydı Oluşturan:" as header start and named section blocks.
 */
function splitSections(text: string): Record<string, string> {
  const MARKERS: Array<{ key: string; re: RegExp }> = [
    { key: 'tapuKayit', re: /TAPU\s+KAYIT\s+BİLGİSİ/i },
    { key: 'serhBeyan', re: /TAŞINMAZA\s+AİT\s+ŞERH|ŞERH\s+BEYAN\s+İRTİFAK/i },
    { key: 'mulkiyet', re: /MÜLKİYET\s+BİLGİLERİ(?!\s*(İLE|AİT))/i },
    { key: 'ipotek',   re: /MÜLKİYETE\s+AİT\s+REHİN|İPOTEK\s+BİLGİLERİ/i },
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
/**
 * TAKBIS PDFs use two layouts for these fields:
 *   Layout A (inline):   Makbuz No : 12345   Dekont No : 67890   Başvuru No : 99
 *   Layout B (two-line): "Makbuz No   Dekont No   Başvuru No\n  val1  val2  val3"
 */
function parseMakbuzBlock(text: string): { makbuzNo: string; dekontNo: string; basvuruNo: string } {
  // Layout A
  const mA = get(text, /Makbuz\s+No\s*:\s*(\S+)/i);
  if (mA) {
    return {
      makbuzNo: mA,
      dekontNo: get(text, /Dekont\s+No\s*:\s*(\S+)/i),
      basvuruNo: get(text, /Başvuru\s+No\s*:\s*(\S+)/i),
    };
  }

  // Layout B — header line followed by values line
  const twoLine = text.match(
    /Makbuz\s+No\s+Dekont\s+No\s+Başvuru\s+No\s*[\n\r]+\s*(\S+)\s+(\S+)\s+(\S+)/i
  );
  if (twoLine) {
    return { makbuzNo: twoLine[1], dekontNo: twoLine[2], basvuruNo: twoLine[3] };
  }

  return { makbuzNo: '', dekontNo: '', basvuruNo: '' };
}

// ---------------------------------------------------------------------------
// Şerh / Beyan / İrtifak table
// ---------------------------------------------------------------------------
function parseSerhBeyan(sectionText: string): SerhBeyan[] {
  if (!sectionText) return [];
  const rows: SerhBeyan[] = [];
  const lines = sectionText.split('\n').map((l) => l.trim()).filter(Boolean);
  // Skip header lines
  const dataLines = lines.filter(
    (l) => !/^(TAŞINMAZA|ŞERH\s+BEYAN|Tür\s*Açıklama|Tür\s*\|)/i.test(l) &&
           !/^(Tür|Açıklama|Malik\/Lehtar|Tesis|Terkin)\s*$/i.test(l)
  );

  let current: Partial<SerhBeyan> | null = null;

  for (const line of dataLines) {
    const turMatch = line.match(/^(Şerh|Beyan|İrtifak|Haciz|Tedbir|Rehin)\b/i);
    if (turMatch) {
      if (current) rows.push(finSerhBeyan(current));
      current = { tur: turMatch[1], aciklama: line.slice(turMatch[0].length).trim() };
    } else if (current) {
      if (/^\d{11}/.test(line) || line === '-') {
        current.malikLehtar = ((current.malikLehtar ?? '') + ' ' + line).trim();
      } else if (/Tesis|Kurum/i.test(line)) {
        current.tesisBilgisi = ((current.tesisBilgisi ?? '') + ' ' + line).trim();
      } else if (/Terkin/i.test(line)) {
        current.terkinBilgisi = ((current.terkinBilgisi ?? '') + ' ' + line).trim();
      } else {
        current.aciklama = ((current.aciklama ?? '') + ' ' + line).trim();
      }
    }
  }
  if (current) rows.push(finSerhBeyan(current));
  return rows;
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
    (l) => !/^MÜLKİYET\s+BİLGİLERİ|^Sistem\s+No/i.test(l)
  );

  let current: string[] | null = null;
  for (const line of dataLines) {
    if (/^\d{6,12}\b/.test(line)) {
      if (current) rows.push(parseMalikRow(current.join(' ')));
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) rows.push(parseMalikRow(current.join(' ')));
  return rows;
}

function parseMalikRow(row: string): Malik {
  const tokens = row.split(/\s{2,}|\t/);
  const hisse = tokens[3] ?? '';
  const hisseParts = hisse.split('/');
  return {
    sistemNo: tokens[0]?.trim() ?? '',
    malik: tokens[1]?.trim() ?? '',
    elBirligi: tokens[2]?.trim() ?? '',
    hissePay: (hisseParts[0] ?? '').trim(),
    hissePayda: (hisseParts[1] ?? '').trim(),
    metrekare: tokens[4]?.trim() ?? '',
    toplamMetrekare: tokens[5]?.trim() ?? '',
    edimmeSebebiTarihYevmiye: tokens[6]?.trim() ?? '',
    terkinSebebiTarihYevmiye: tokens[7]?.trim() ?? '',
  };
}

// ---------------------------------------------------------------------------
// İpotek table
// ---------------------------------------------------------------------------
function parseIpotekler(sectionText: string): Ipotek[] {
  if (!sectionText) return [];
  const rows: Ipotek[] = [];
  const lines = sectionText.split('\n').map((l) => l.trim()).filter(Boolean);
  const dataLines = lines.filter(
    (l) => !/^MÜLKİYETE\s+AİT|^REHİN\s*\/|^Alacaklı|^İpotek/i.test(l)
  );

  let current: string[] | null = null;
  for (const line of dataLines) {
    const isNew =
      /VKN\s*:\s*\d{10}/.test(line) ||
      (/\bA\.Ş\.|BANK|KREDİ|FİNANS/i.test(line) && current === null);
    if (isNew) {
      if (current) rows.push(parseIpotekRow(current));
      current = [line];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) rows.push(parseIpotekRow(current));
  return rows;
}

function parseIpotekRow(rowLines: string[]): Ipotek {
  const full = rowLines.join(' ');
  return {
    alacakli: (get(full, /^(.+?)\s+(?:VKN|Hayır|Evet)/i) || rowLines[0] || '').trim(),
    musterekMi: get(full, /Müşterek\s+Mi\s*[:\-]?\s*(Evet|Hayır)/i) ||
      (/Müşterek/i.test(full) ? 'Evet' : 'Hayır'),
    borc: toNum(get(full, /([\d.,]+)\s*TL/i, /Borç\s*[:\-]?\s*([\d.,]+)/i)),
    faiz: get(full, /(%[\d]+[^,;\n]+)/),
    dereceSira: get(full, /Derece\s*[:/]\s*(\d+\/\d+)/i, /(\d+\/\d+)\s*Derece/i),
    sure: get(full, /Süre\s*[:\-]?\s*([A-Za-z0-9.]+)/i),
    tesisTarihYevmiye: get(full, /Tesis\s*(?:Tarih|Kurum)?\s*[:\-]?\s*([\d./\-]+\/?[\d]*)/i),
    borcluMalik: get(full, /Borçlu\s*(?:Malik)?\s*[:\-]?\s*(.+?)(?=Malik Borç|Tescil|$)/i),
    malikBorc: get(full, /Malik\s+Borç\s*[:\-]?\s*([\d.,]+)/i),
    tescilTarihYevmiye: get(full, /Tescil\s*(?:Tarih)?\s*[:\-]?\s*([\d./\-]+\/?[\d]*)/i),
  };
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

export function parseDocument(
  text: string,
  sourceFile = ''
): TakbisRecord | null {
  if (!/Kaydı\s+Oluşturan\s*:/i.test(text)) return null;

  const sections = splitSections(text);
  const header    = sections['header']    ?? '';
  const tapuKayit = sections['tapuKayit'] ?? '';
  const serhSec   = sections['serhBeyan'] ?? '';
  const mulkSec   = sections['mulkiyet']  ?? '';
  const ipotekSec = sections['ipotek']    ?? '';

  // Combined text for fields that may appear in either header or tapuKayit
  const combined = header + '\n' + tapuKayit;

  // ── Üst bilgi ──────────────────────────────────────────────────────────
  const kaydiOlusturan = get(
    combined,
    /Kaydı\s+Oluşturan\s*:\s*(.+?)(?=Makbuz|Dekont|Başvuru|TAPU\s+KAYIT|\n\n)/is,
    /Kaydı\s+Oluşturan\s*:\s*(.+)/i
  ).replace(/\s+/g, ' ');

  // Date: supports "dd.mm.yyyy", "dd-mm-yyyy", "dd-m-yyyy-HH:MM" formats
  const tarih = get(
    combined,
    /Tarih\s*:\s*(\d{1,2}[-./]\d{1,2}[-./]\d{4})/i
  );

  const { makbuzNo, dekontNo, basvuruNo } = parseMakbuzBlock(combined);

  // Validation code: last standalone alphanumeric token in the document
  // (typically 8-14 chars, mixed case — appears in the footer)
  const lastLines = text.split('\n').slice(-30).join('\n');
  const codeMatches = lastLines.match(/\b([A-Za-z][A-Za-z0-9]{5,13})\b/g) ?? [];
  const dogrulamaKodu =
    codeMatches
      .filter(
        (w) =>
          /[a-z]/.test(w) &&
          /[0-9A-Z]/.test(w) &&
          !/^(Tarih|Toplam|Belge|Sayfa|Tapu|Taşınmaz|Kaydı|Bilgi|Amaç|İçin|Sistem|Malik|Arsa|Zemin|Bağım|Blok|Cilt|Mevkii|Kurum|Mahalle|Kayıt|Durum|Başvuru|Makbuz|Dekont|Derece|Terkin|Tesis|Edinme|Nitelik|Yüzöl|Yevmiye)/.test(w)
      )
      .pop() ?? '';

  // ── TAPU KAYIT BİLGİSİ ─────────────────────────────────────────────────
  const zeminTipi = get(combined, /Zemin\s+Tipi\s*:\s*(\S+)/i);
  const tasinmazKimlikNo = get(combined, /Taşınmaz\s+Kimlik\s+No\s*:\s*(\S+)/i);

  const ilIlce = get(
    combined,
    /İl\s*\/\s*İlçe\s*:\s*([A-ZÇĞÜŞİÖa-zçğüşiö\/\-\s]+?)(?=Kurum|Mahalle|\n)/i
  ).replace(/\s+/g, ' ').trim();
  const [il, ilce] = ilIlce.split('/').map((s) => s.trim());

  const kurumAdi     = get(combined, /Kurum\s+Adı\s*:\s*([^\n:]+)/i).trim();
  const mahalleKoy   = get(combined, /Mahalle\s*\/?\s*Köy\s*(?:Adı)?\s*:\s*([^\n:]+)/i).trim();
  const mevkii       = get(combined, /Mevkii\s*:\s*([^\n:]+)/i).trim();
  const ciltSayfaNo  = get(combined, /Cilt\s*\/\s*Sayfa\s*No\s*:\s*([^\n:]+)/i).trim();
  const kayitDurum   = get(combined, /Kayıt\s+Durum\s*:\s*([^\n:]+)/i).trim();

  // Ada/Parsel: handles "Ada/ Parsel:", "Ada/Parsel:", "Ada / Parsel:" variants
  const adaParsel = get(
    combined,
    /Ada\s*\/\s*Parsel\s*:\s*([^\s:,]+)/i
  ).trim();
  const [ada, parsel] = adaParsel.split('/').map((s) => s.trim());

  const atYuzolcum = toNum(
    get(combined, /AT\s+Yüzölçüm\s*(?:\(m2\))?\s*:\s*([\d.,]+)/i)
  );

  const bagimsizBolumNitelik     = get(combined, /Bağımsız\s+Bölüm\s+Nitelik\s*:\s*([^\n:]+)/i).trim();
  const bagimsizBolumBrutYuzolcum = get(combined, /Bağımsız\s+Bölüm\s+Brüt\s+Yüzölçümü?\s*:\s*([\d.,\s]+)/i).trim();
  const bagimsizBolumNetYuzolcum  = get(combined, /Bağımsız\s+Bölüm\s+Net\s+Yüzölçümü?\s*:\s*([\d.,\s]+)/i).trim();
  const blokKatGirisBBNo          = get(combined, /Blok\s*\/\s*Kat\s*\/\s*Giriş\s*\/\s*BBNo\s*:\s*([^\n:]+)/i).trim();
  const arsaPayPayda              = get(combined, /Arsa\s+Pay\s*\/\s*Payda\s*:\s*([^\n:,\s]+)/i).trim();
  const anaTasinmazNitelik        = get(combined, /Ana\s+Taşınmaz\s+Nitelik\s*:\s*([^\n:]+)/i).trim();

  // ── Alt tablolar ────────────────────────────────────────────────────────
  const serhBeyanlar = parseSerhBeyan(serhSec);
  const malikler     = parseMalikler(mulkSec);
  const ipotekler    = parseIpotekler(ipotekSec);

  // ── Hesaplanan alanlar ──────────────────────────────────────────────────
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
    ipotekVarYok,
    ipotekDereceSayisi,
    toplamIpotekBorcu,
    serhBeyanOzeti,
    kaynakDosya: sourceFile,
  };
}
