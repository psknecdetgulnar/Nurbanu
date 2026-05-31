'use client';

/**
 * Regression testi — spec §9
 *
 * Kullanım (tarayıcı console):
 *   import { testRender } from '@/lib/takbis/render/renderTest'
 *   console.table(await testRender())
 *
 * Fixture: docs/fixtures/arslanca-1366-7.*
 */
import type { TakbisRecord } from '../types';
import { normalizeRecord } from '../normalize';
import { renderTakyidat } from './takyidatRenderer';
import { renderTamRapor } from './tamRaporRenderer';

export interface TestResult {
  name: string;
  ok: boolean;
  error?: string;
}

function normalizeLines(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

/**
 * Ham fixture'ı normalize + render ederek beklenen çıktıyla karşılaştırır.
 * Fixture dosyaları runtime'da fetch ile okunur (Next.js public/ değil,
 * /docs/fixtures/ path — sadece dev ortamında çalışır).
 */
export async function testRender(): Promise<TestResult[]> {
  const base = '/docs/fixtures/arslanca-1366-7';
  const results: TestResult[] = [];

  let hamRecord: TakbisRecord;
  let expectedTakyidat: string;
  let expectedTamRapor: string;

  try {
    const [hamRes, takRes, tamRes] = await Promise.all([
      fetch(`${base}.ham.json`),
      fetch(`${base}.takyidat.txt`),
      fetch(`${base}.tamrapor.txt`),
    ]);
    hamRecord = await hamRes.json();
    expectedTakyidat = await takRes.text();
    expectedTamRapor = await tamRes.text();
  } catch (err) {
    return [{ name: 'fixture-load', ok: false, error: String(err) }];
  }

  const model = normalizeRecord(hamRecord);

  // Test 1: Takyidat
  const actualTakyidat = renderTakyidat(model);
  const t1ok = normalizeLines(actualTakyidat) === normalizeLines(expectedTakyidat);
  results.push({
    name: 'takyidat',
    ok: t1ok,
    error: t1ok ? undefined : diffSummary(normalizeLines(expectedTakyidat), normalizeLines(actualTakyidat)),
  });

  // Test 2: Tam Rapor
  const actualTamRapor = renderTamRapor(model);
  const t2ok = normalizeLines(actualTamRapor) === normalizeLines(expectedTamRapor);
  results.push({
    name: 'tamRapor',
    ok: t2ok,
    error: t2ok ? undefined : diffSummary(normalizeLines(expectedTamRapor), normalizeLines(actualTamRapor)),
  });

  return results;
}

function diffSummary(expected: string, actual: string): string {
  const eLines = expected.split('\n');
  const aLines = actual.split('\n');
  const maxLen = Math.max(eLines.length, aLines.length);
  for (let i = 0; i < maxLen; i++) {
    if (eLines[i] !== aLines[i]) {
      return `Satır ${i + 1} farklı:\n  Beklenen: ${JSON.stringify(eLines[i])}\n  Gerçek:   ${JSON.stringify(aLines[i])}`;
    }
  }
  return 'Bilinmeyen fark';
}
