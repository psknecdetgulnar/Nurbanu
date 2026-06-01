/**
 * İpotek parse smoke-test
 *
 * Kullanım:
 *   npx tsx scripts/test-ipotek.ts docs/fixtures/ornek-rehin.txt
 *
 * ornek-rehin.txt: araç sayfasında PDF'i yükleyip HAM METİN sekmesinden
 * kopyalanan tam sayfa metni (sadece bir belge yeterli).
 *
 * Fixture snap modu:
 *   npx tsx scripts/test-ipotek.ts docs/fixtures/ornek-rehin.txt --snap
 *   → docs/fixtures/ornek-rehin.snap.json dosyasını yazar (beklenen çıktı)
 *
 * Sonraki çalıştırmalarda --snap olmadan snap dosyasıyla karşılaştırır.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parseDocument } from '../lib/takbis/parseDocument';
import { normalizeRecord } from '../lib/takbis/normalize';
import { renderTakyidat } from '../lib/takbis/render/takyidatRenderer';
import { splitDocuments } from '../lib/takbis/splitDocuments';

// ── generateRiskSummary stub (riskSummary.ts tarayıcı-bağımsız) ────────────
// parseDocument bu fonksiyonu import eder; burada mock etmiyoruz, doğrudan çalışır.

const args = process.argv.slice(2);
const txtFile = args[0];
const snapMode = args.includes('--snap');

if (!txtFile) {
  console.error('Kullanım: npx tsx scripts/test-ipotek.ts <metin-dosyası> [--snap]');
  process.exit(1);
}

if (!existsSync(txtFile)) {
  console.error(`Dosya bulunamadı: ${txtFile}`);
  process.exit(1);
}

const rawText = readFileSync(txtFile, 'utf-8');
const segments = splitDocuments(rawText);

if (segments.length === 0) {
  console.error('Metin içinde TAKBIS belgesi tespit edilemedi (Kaydı Oluşturan: satırı aranıyor).');
  process.exit(1);
}

console.log(`\n✓ ${segments.length} belge segmenti bulundu.\n`);

segments.forEach((seg, si) => {
  const rec = parseDocument(seg, txtFile);
  if (!rec) {
    console.log(`[${si + 1}] ATLAND I — parseDocument null döndürdü.`);
    return;
  }

  console.log(`${'─'.repeat(60)}`);
  console.log(`[${si + 1}] Doğrulama Kodu: ${rec.dogrulamaKodu || '(yok)'}`);
  console.log(`    Taşınmaz: ${rec.il}/${rec.ilce} Ada:${rec.ada} Parsel:${rec.parsel}`);
  console.log(`    Malik sayısı: ${rec.malikler.length}`);
  console.log(`    İpotek sayısı: ${rec.ipotekler.length}`);

  if (rec.ipotekler.length === 0) {
    console.log('    → İpotek bulunamadı.');
    return;
  }

  console.log('\n  Ham ipotek kayıtları:');
  rec.ipotekler.forEach((ip, i) => {
    console.log(`\n  [İpotek ${i + 1}]`);
    console.log(`    alacakli    : "${ip.alacakli}"`);
    console.log(`    musterekMi  : "${ip.musterekMi}"`);
    console.log(`    borc        : ${JSON.stringify(ip.borc)}`);
    console.log(`    faiz        : "${ip.faiz}"`);
    console.log(`    dereceSira  : "${ip.dereceSira}"`);
    console.log(`    tesisTarih  : "${ip.tesisTarihYevmiye}"`);
    console.log(`    tescilTarih : "${ip.tescilTarihYevmiye}"`);
  });

  const model = normalizeRecord(rec);
  console.log('\n  Normalize + render sonucu (Rehinler Hanesinde):');
  model.rehinler.forEach((r, i) => {
    const ok = !r.ham.startsWith('[PARSE HATASI');
    console.log(`\n  [${i + 1}] ${ok ? '✓' : '✗ HATA'}`);
    console.log(`    alacakli      : "${r.alacakli}"`);
    console.log(`    bedel         : "${r.bedel}"`);
    console.log(`    derece        : "${r.extra?.['derece'] ?? ''}"`);
    console.log(`    tescilTarihi  : "${r.tescilTarihi}"`);
    console.log(`    yevmiye       : "${r.yevmiye}"`);
    if (!ok) console.log(`    ham (hata)    : ${r.ham}`);
  });

  const rendered = renderTakyidat(model);
  console.log('\n  Takyidat metni (Rehinler bölümü):');
  const rehinBlock = rendered.match(/Rehinler Hanesinde:([\s\S]*?)(?=\n\n|\n[A-ZÇĞÜŞİÖ]|$)/);
  if (rehinBlock) {
    console.log(rehinBlock[0]);
  } else {
    console.log('  (Rehinler hanesi boş veya tespit edilemedi)');
    console.log(rendered);
  }

  // ── Snap ─────────────────────────────────────────────────────────────────
  const snapFile = txtFile.replace(/\.txt$/, '.snap.json');
  const snapData = {
    ipotekler: rec.ipotekler.map((ip) => ({
      alacakli: ip.alacakli,
      borc: ip.borc,
      dereceSira: ip.dereceSira,
      tesisTarihYevmiye: ip.tesisTarihYevmiye,
      tescilTarihYevmiye: ip.tescilTarihYevmiye,
    })),
    rehinler: model.rehinler.map((r) => ({
      alacakli: r.alacakli,
      bedel: r.bedel,
      derece: r.extra?.['derece'] ?? '',
      tescilTarihi: r.tescilTarihi,
      yevmiye: r.yevmiye,
    })),
    takyidatRehinBlok: rehinBlock?.[0] ?? '',
  };

  if (snapMode) {
    writeFileSync(snapFile, JSON.stringify(snapData, null, 2), 'utf-8');
    console.log(`\n  ✓ Snap yazıldı: ${snapFile}`);
    console.log('    Sonraki çalıştırmada --snap olmadan karşılaştırma yapılır.');
  } else if (existsSync(snapFile)) {
    const expected = JSON.parse(readFileSync(snapFile, 'utf-8'));
    const actual = JSON.stringify(snapData);
    const exp    = JSON.stringify(expected);
    if (actual === exp) {
      console.log(`\n  ✓ Snap eşleşti: ${snapFile}`);
    } else {
      console.log(`\n  ✗ SNAP EŞLEŞMEDİ: ${snapFile}`);
      // Satır satır fark
      const expLines = JSON.stringify(expected, null, 2).split('\n');
      const actLines = JSON.stringify(snapData, null, 2).split('\n');
      const maxLen = Math.max(expLines.length, actLines.length);
      for (let i = 0; i < maxLen; i++) {
        if (expLines[i] !== actLines[i]) {
          console.log(`    Satır ${i + 1}:`);
          console.log(`      Beklenen: ${expLines[i]}`);
          console.log(`      Gerçek  : ${actLines[i]}`);
        }
      }
      process.exitCode = 1;
    }
  }
});

console.log('\n' + '─'.repeat(60));
console.log('Test tamamlandı.');
