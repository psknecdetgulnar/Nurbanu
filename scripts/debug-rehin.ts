import * as pdfjsLib from '../node_modules/pdfjs-dist/build/pdf.mjs';
import { readFileSync } from 'fs';
import path from 'path';
import { splitDocuments } from '../lib/takbis/splitDocuments';

const workerPath = path.resolve('./node_modules/pdfjs-dist/build/pdf.worker.mjs');
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = `file://${workerPath}`;

async function extractText(file: string): Promise<string> {
  const data = readFileSync(file);
  const pdf  = await (pdfjsLib as any).getDocument({ data: new Uint8Array(data), useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p);
    const content = await page.getTextContent();
    const yMap    = new Map<number, Array<{ str: string; x: number }>>();
    for (const item of (content.items as any[])) {
      if (typeof item.str !== 'string') continue;
      const y = item.transform[5], x = item.transform[4];
      const existing = Array.from(yMap.keys()).find(k => Math.abs(k - y) <= 3);
      if (existing !== undefined) yMap.get(existing)!.push({ str: item.str, x });
      else yMap.set(y, [{ str: item.str, x }]);
    }
    const lines = Array.from(yMap.entries()).sort(([ya], [yb]) => yb - ya)
      .map(([, items]) => items.sort((a, b) => a.x - b.x).map(i => i.str).join(' ').replace(/\s+/g, ' ').trim())
      .filter(l => l.length > 0);
    pages.push(lines.join('\n'));
  }
  return pages.join('\n');
}

const files = [
  'docs/fixtures/125 ada 71 parsel takbis örneği ipotekli.pdf',
  'docs/fixtures/neco.pdf',
  'docs/fixtures/TKB_202604251449195510.pdf',
];

async function main() {
  for (const file of files) {
    const text = await extractText(file);
    const segs  = splitDocuments(text);
    console.log('\n' + '='.repeat(70));
    console.log('FILE:', path.basename(file));
    for (const seg of segs) {
      const m = seg.match(/MÜLK[İI]YETE\s+A[İI]T\s+REH[İI]N[\s\S]{0,1500}/i);
      if (m) {
        console.log('--- REHIN SECTION (ham satırlar) ---');
        m[0].split('\n').forEach((l, i) => console.log(`  ${String(i).padStart(2,' ')}: ${JSON.stringify(l)}`));
      }
    }
  }
}
main().catch(console.error);
