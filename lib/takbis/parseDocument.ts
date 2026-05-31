import type { TakbisRecord, Malik, Ipotek, SerhBeyan } from './types';
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
  const n = parseFloat(s.trim().replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? s.trim() : n;
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
      !/^(Tür|Açıklama|Malik\/Lehtar|Tesis|Terkin)\s*$/i.test(l)
  );

  let current: Partial<SerhBeyan> | null = null;
  for (const line of dataLines) {
    const turMatch = line.match(/^([ŞşSs]erh|[Bb]eyan|[İIiı]rtifak|[Hh]aciz|[Tt]edbir|[Rr]ehin|Kamu\s+Haczi)\b/i);
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
function parseIpotekler(sectionText: string): Ipotek[] {
  if (!sectionText) return [];
  const rows: Ipotek[] = [];
  const lines = sectionText.split('\n').map((l) => l.trim()).filter(Boolean);
  const dataLines = lines.filter(
    (l) => !/^MÜLK[İI]YETE\s+A[İI]T\s+REH[İI]N|^[İI]POTEK\s+B[İI]LG[İI]|^Alacaklı/i.test(l)
  );

  let current: string[] | null = null;
  for (const line of dataLines) {
    const isNew =
      /VKN\s*:\s*\d{10}/.test(line) ||
      (/(?:\bA\.Ş\b|\bBANK|\bKREDİ|\bFİNANS)/i.test(line) && current === null);
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
  const alacakli = (get(full, /^(.+?)\s+(?:VKN|Hayır|Evet)/i) || rowLines[0] || '')
    .replace(/^\(SN:\d+\)\s*/, '')
    .trim();

  return {
    alacakli,
    musterekMi:
      get(full, /Müşterek\s+Mi\s*[:\-]?\s*(Evet|Hayır)/i) ||
      (/Müşterek/i.test(full) ? 'Evet' : 'Hayır'),
    borc: toNum(get(full, /([\d.,]+)\s*TL/i, /Borç\s*[:\-]?\s*([\d.,]+)/i)),
    faiz: get(full, /(%[\d]+[^,;\n]+)/),
    dereceSira: get(full, /Derece\s*[:/]\s*(\d+\/\d+)/i, /(\d+\/\d+)\s*Derece/i),
    sure: get(full, /Süre\s*[:\-]?\s*([A-Za-z0-9.]+)/i),
    tesisTarihYevmiye: get(
      full,
      /Tesis\s*(?:Tarih|Kurum)?\s*[:\-]?\s*([\d.\-\/]+)/i
    ),
    borcluMalik: get(full, /Borçlu\s*(?:Malik)?\s*[:\-]?\s*(.+?)(?=Malik\s+Borç|Tescil|$)/i),
    malikBorc: get(full, /Malik\s+Borç\s*[:\-]?\s*([\d.,]+)/i),
    tescilTarihYevmiye: get(full, /Tescil\s*(?:Tarih)?\s*[:\-]?\s*([\d.\-\/]+)/i),
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

  // Date: "20-5-2021-07:31", "01.05.2021", "1/5/2021"
  const tarih = get(
    combined,
    /Tarih\s*:\s*(\d{1,2}[-./]\d{1,2}[-./]\d{4})/i
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
  const serhBeyanlar = [
    ...parseSerhBeyan(serhSec),
    ...parseSerhBeyan(mulkSerhSec),   // owner-level şerh merged into same array
  ];
  const malikler  = parseMalikler(mulkSec);
  const ipotekler = parseIpotekler(ipotekSec);

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
    ipotekVarYok,
    ipotekDereceSayisi,
    toplamIpotekBorcu,
    serhBeyanOzeti,
    kaynakDosya: sourceFile,
  };
}
