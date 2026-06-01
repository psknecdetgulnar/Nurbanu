/**
 * İpotek parse smoke-test — PDF veya TXT girdisi
 *
 * Tek dosya:   npx tsx scripts/test-ipotek.ts <dosya.pdf|txt> [--snap]
 * Toplu test:  npx tsx scripts/test-ipotek.ts --all [--snap]
 *
 * --snap  : docs/fixtures/snapshots/<dosya-adi>.snap.json yazar
 *           Sonraki çalıştırmada snap olmadan regresyon kontrolü yapar.
 * --all   : docs/fixtures/ içindeki tüm .pdf dosyalarını işler.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import path from 'path';
import * as pdfjsLib from '../node_modules/pdfjs-dist/build/pdf.mjs';
import { parseDocument } from '../lib/takbis/parseDocument';
import { normalizeRecord } from '../lib/takbis/normalize';
import { renderTakyidat } from '../lib/takbis/render/takyidatRenderer';
import { splitDocuments } from '../lib/takbis/splitDocuments';

// ── pdfjs worker (Node.js) ────────────────────────────────────────────────
const workerPath = path.resolve('./node_modules/pdfjs-dist/build/pdf.worker.mjs');
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = `file://${workerPath}`;

const FIXTURES_DIR = 'docs/fixtures';
const SNAPSHOTS_DIR = 'docs/fixtures/snapshots';

// ── CLI ───────────────────────────────────────────────────────────────────
const args     = process.argv.slice(2);
const allMode  = args.includes('--all');
const snapMode = args.includes('--snap');
const fileArg  = args.find((a) => !a.startsWith('--'));

if (!allMode && !fileArg) {
  console.error('Kullanım:');
  console.error('  npx tsx scripts/test-ipotek.ts <dosya.pdf|.txt> [--snap]');
  console.error('  npx tsx scripts/test-ipotek.ts --all [--snap]');
  process.exit(1);
}

// ── PDF → tam metin (Node.js pdfjs) ──────────────────────────────────────
async function extractTextNode(pdfPath: string): Promise<string> {
  const data = readFileSync(pdfPath);
  const pdf  = await (pdfjsLib as any).getDocument({
    data: new Uint8Array(data),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;

  const pageTexts: string[] = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Y koordinatına göre satır grupla (±3px tolerans)
    const yMap = new Map<number, Array<{ str: string; x: number }>>();
    for (const item of (content.items as any[])) {
      if (typeof item.str !== 'string') continue;
      const y = item.transform[5] as number;
      const x = item.transform[4] as number;
      const existing = Array.from(yMap.keys()).find((k) => Math.abs(k - y) <= 3);
      if (existing !== undefined) yMap.get(existing)!.push({ str: item.str, x });
      else yMap.set(y, [{ str: item.str, x }]);
    }

    const lines = Array.from(yMap.entries())
      .sort(([ya], [yb]) => yb - ya)
      .map(([, items]) =>
        items
          .sort((a, b) => a.x - b.x)
          .map((i) => i.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter((l) => l.length > 0);

    pageTexts.push(lines.join('\n'));
  }

  return pageTexts.join('\n');
}

// ── Tek dosya işle ───────────────────────────────────────────────────────
interface ParsedIpotek {
  alacakli:            string;
  borc:                string | number;
  dereceSira:          string;
  tesisTarihYevmiye:   string;
  tescilTarihYevmiye:  string;
}
interface NormIpotek {
  alacakli:    string;
  bedel:       string;
  derece:      string;
  tescilTarihi:string;
  yevmiye:     string;
}
interface FileSnap {
  file:      string;
  ipotekler: ParsedIpotek[];
  rehinler:  NormIpotek[];
  takyidatRehinBlok: string;
}

async function processFile(filePath: string): Promise<{ snap: FileSnap; errors: string[] }> {
  const ext     = path.extname(filePath).toLowerCase();
  const rawText = ext === '.pdf'
    ? await extractTextNode(filePath)
    : readFileSync(filePath, 'utf-8');

  const segments = splitDocuments(rawText);
  const allIpotekler: ParsedIpotek[] = [];
  const allRehinler:  NormIpotek[]   = [];
  let   takyidatRehinBlok = '';
  const errors: string[] = [];

  for (const seg of segments) {
    const rec = parseDocument(seg, filePath);
    if (!rec) continue;

    for (const ip of rec.ipotekler) {
      allIpotekler.push({
        alacakli:           ip.alacakli,
        borc:               ip.borc,
        dereceSira:         ip.dereceSira,
        tesisTarihYevmiye:  ip.tesisTarihYevmiye,
        tescilTarihYevmiye: ip.tescilTarihYevmiye,
      });
    }

    const model = normalizeRecord(rec);
    for (const r of model.rehinler) {
      allRehinler.push({
        alacakli:    r.alacakli,
        bedel:       r.bedel,
        derece:      r.extra?.['derece'] ?? '',
        tescilTarihi:r.tescilTarihi,
        yevmiye:     r.yevmiye,
      });
      if (r.ham.startsWith('[PARSE HATASI')) {
        errors.push(`  ✗ PARSE HATASI: ${r.ham}`);
      }
    }

    const rendered = renderTakyidat(model);
    const block    = rendered.match(/Rehinler Hanesinde:([\s\S]*?)(?=\n\nRehin|Rehinlere|\n\n[A-ZÇĞÜŞİÖ]|$)/);
    if (block) takyidatRehinBlok += block[0] + '\n';
  }

  return {
    snap: {
      file:      path.basename(filePath),
      ipotekler: allIpotekler,
      rehinler:  allRehinler,
      takyidatRehinBlok: takyidatRehinBlok.trim(),
    },
    errors,
  };
}

// ── Rapor yazdır ─────────────────────────────────────────────────────────
function printReport(filePath: string, snap: FileSnap, errors: string[]) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`📄 ${snap.file}`);
  console.log(`${'─'.repeat(70)}`);
  console.log(`   İpotek (ham):  ${snap.ipotekler.length}`);
  console.log(`   Rehin (norm):  ${snap.rehinler.length}`);

  if (snap.ipotekler.length === 0) {
    console.log('   → İpotek kaydı yok.');
    return;
  }

  console.log('\n  Ham ipotek kayıtları:');
  snap.ipotekler.forEach((ip, i) => {
    console.log(`\n  [İpotek ${i + 1}]`);
    console.log(`    alacakli    : "${ip.alacakli}"`);
    console.log(`    borc        : ${JSON.stringify(ip.borc)}`);
    console.log(`    dereceSira  : "${ip.dereceSira}"`);
    console.log(`    tesisTarih  : "${ip.tesisTarihYevmiye}"`);
    console.log(`    tescilTarih : "${ip.tescilTarihYevmiye}"`);
  });

  console.log('\n  Normalize sonucu:');
  snap.rehinler.forEach((r, i) => {
    const hasError = r.alacakli.startsWith('[PARSE HATASI') || errors.some(e => e.includes(r.alacakli));
    console.log(`\n  [Rehin ${i + 1}] ${hasError ? '✗' : '✓'}`);
    console.log(`    alacakli      : "${r.alacakli}"`);
    console.log(`    bedel         : "${r.bedel}"`);
    console.log(`    derece        : "${r.derece}"`);
    console.log(`    tescilTarihi  : "${r.tescilTarihi}"`);
    console.log(`    yevmiye       : "${r.yevmiye}"`);
  });

  if (snap.takyidatRehinBlok) {
    console.log('\n  Takyidat çıktısı:');
    console.log(snap.takyidatRehinBlok.split('\n').map(l => '  ' + l).join('\n'));
  }

  if (errors.length > 0) {
    console.log('\n  ⚠ Parse hataları:');
    errors.forEach((e) => console.log(e));
  }
}

// ── Kontrol kriterleri ───────────────────────────────────────────────────
function auditSnap(snap: FileSnap): string[] {
  const issues: string[] = [];
  for (const r of snap.rehinler) {
    // Bedel .00 formatı
    if (r.bedel && !/\.\d{2}$/.test(r.bedel))
      issues.push(`bedel ".00" eksik: "${r.bedel}"`);
    // Derece boş
    if (!r.derece)
      issues.push(`derece boş (alacakli: ${r.alacakli.slice(0, 40)})`);
    // Alacaklı kesik (çok kısa)
    if (r.alacakli && r.alacakli.length < 5)
      issues.push(`alacakli çok kısa: "${r.alacakli}"`);
    // Tarih boş
    if (!r.tescilTarihi)
      issues.push(`tescilTarihi boş`);
    // Yevmiye boş
    if (!r.yevmiye)
      issues.push(`yevmiye boş`);
  }
  return issues;
}

// ── Snap kaydet/karşılaştır ───────────────────────────────────────────────
function handleSnap(snap: FileSnap, snapMode: boolean): 'written' | 'match' | 'mismatch' | 'no-snap' {
  mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  const snapFile = path.join(SNAPSHOTS_DIR, snap.file.replace(/\.pdf$/i, '') + '.snap.json');

  if (snapMode) {
    writeFileSync(snapFile, JSON.stringify(snap, null, 2), 'utf-8');
    return 'written';
  }

  if (!existsSync(snapFile)) return 'no-snap';

  const expected = JSON.parse(readFileSync(snapFile, 'utf-8'));
  return JSON.stringify(snap) === JSON.stringify(expected) ? 'match' : 'mismatch';
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const files: string[] = allMode
    ? readdirSync(FIXTURES_DIR)
        .filter((f) => f.toLowerCase().endsWith('.pdf'))
        .map((f) => path.join(FIXTURES_DIR, f))
    : [fileArg!];

  console.log(`\n${allMode ? `Toplu test — ${files.length} PDF` : `Tek dosya: ${fileArg}`}\n`);

  const summary: Array<{
    file: string;
    ipotekCount: number;
    errorCount: number;
    auditIssues: string[];
    snapStatus: string;
  }> = [];

  for (const file of files) {
    if (!existsSync(file)) {
      console.error(`Dosya bulunamadı: ${file}`);
      continue;
    }

    process.stdout.write(`⏳ ${path.basename(file)} işleniyor...`);
    const { snap, errors } = await processFile(file);
    process.stdout.write(` ${snap.rehinler.length} rehin\n`);

    printReport(file, snap, errors);

    const auditIssues = auditSnap(snap);
    if (auditIssues.length > 0) {
      console.log('\n  📋 Kontrol sorunları:');
      auditIssues.forEach((i) => console.log(`    - ${i}`));
    }

    const snapStatus = handleSnap(snap, snapMode);
    if (snapStatus === 'written')   console.log(`\n  ✓ Snap yazıldı: ${snap.file}`);
    if (snapStatus === 'match')     console.log(`\n  ✓ Snap eşleşti`);
    if (snapStatus === 'mismatch')  console.log(`\n  ✗ SNAP EŞLEŞMEDİ — regresyon!`);
    if (snapStatus === 'no-snap')   console.log(`\n  ℹ Snap yok — --snap ile kaydet`);

    summary.push({
      file: path.basename(file),
      ipotekCount: snap.rehinler.length,
      errorCount: errors.length + auditIssues.length,
      auditIssues,
      snapStatus,
    });
  }

  // ── Özet ────────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(70)}`);
  console.log('ÖZET');
  console.log(`${'═'.repeat(70)}`);
  console.log(`Toplam PDF  : ${files.length}`);
  const temiz   = summary.filter((s) => s.errorCount === 0);
  const hatali  = summary.filter((s) => s.errorCount > 0);
  console.log(`Temiz geçen : ${temiz.length}`);
  console.log(`Hata olan   : ${hatali.length}`);

  if (hatali.length > 0) {
    console.log('\nHatalı dosyalar:');
    hatali.forEach((s) => {
      console.log(`  ${s.file}`);
      s.auditIssues.forEach((i) => console.log(`    → ${i}`));
    });
    process.exitCode = 1;
  }

  if (snapMode) {
    console.log(`\nSnap'ler kaydedildi: ${SNAPSHOTS_DIR}/`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
