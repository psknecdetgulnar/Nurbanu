'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, signOut } from '@/lib/auth';
import { extractTextFromPDF } from '@/lib/takbis/extractText';
import { splitDocuments } from '@/lib/takbis/splitDocuments';
import { parseDocument } from '@/lib/takbis/parseDocument';
import type { TakbisRecord } from '@/lib/takbis/types';

// ── Types ─────────────────────────────────────────────────────────────────
interface FileResult {
  name: string;
  status: 'processing' | 'done' | 'error';
  records: TakbisRecord[];
  error?: string;
  rawText?: string;        // full extracted text for debug
  rawSegments?: string[];  // segments after split
  nullSegments?: string[]; // segments that parseDocument returned null for
}

type DebugView = 'table' | 'json' | 'rawtext';

// ── Page ──────────────────────────────────────────────────────────────────
export default function AppPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [fileResults, setFileResults] = useState<FileResult[]>([]);
  const [dragging, setDragging] = useState(false);
  const [debugView, setDebugView] = useState<DebugView>('table');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    getUser().then(({ data }) => {
      if (!data.user) router.push('/login');
      else setUserEmail(data.user.email ?? '');
    });
  }, [router]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  // ── File processing ──────────────────────────────────────────────────
  const processFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files).filter((f) => f.type === 'application/pdf');
    if (arr.length === 0) return;

    setFileResults((prev) => [
      ...prev,
      ...arr.map((f) => ({ name: f.name, status: 'processing' as const, records: [] })),
    ]);

    for (const file of arr) {
      try {
        const docText = await extractTextFromPDF(file);
        const segments = splitDocuments(docText.fullText);
        const records: TakbisRecord[] = [];
        const nullSegments: string[] = [];

        for (const seg of segments) {
          const rec = parseDocument(seg, file.name);
          if (rec) records.push(rec);
          else nullSegments.push(seg);
        }

        setFileResults((prev) =>
          prev.map((r) =>
            r.name === file.name
              ? {
                  ...r,
                  status: 'done',
                  records,
                  rawText: docText.fullText,
                  rawSegments: segments,
                  nullSegments,
                }
              : r
          )
        );
        // Auto-select the first file for debug view
        setSelectedFile((s) => s ?? file.name);
      } catch (err) {
        setFileResults((prev) =>
          prev.map((r) =>
            r.name === file.name
              ? { ...r, status: 'error', records: [], error: err instanceof Error ? err.message : String(err) }
              : r
          )
        );
      }
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const allRecords = fileResults.flatMap((r) => r.records);
  const doneResults = fileResults.filter((r) => r.status === 'done');
  const activeResult = fileResults.find((r) => r.name === selectedFile);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-gray-900">TAKBIS Okuyucu</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{userEmail}</span>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900">
              Çıkış Yap
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
            dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'
          }`}
        >
          <div className="text-3xl mb-2">📄</div>
          <p className="text-gray-700 font-medium mb-3">PDF dosyalarınızı sürükleyin veya seçin</p>
          <label className="cursor-pointer bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            Dosya Seç
            <input type="file" accept="application/pdf" multiple className="hidden" onChange={onFileChange} />
          </label>
        </div>

        {/* File list */}
        {fileResults.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {fileResults.map((fr, i) => (
              <button
                key={i}
                onClick={() => setSelectedFile(fr.name)}
                className={`w-full flex items-center gap-3 rounded-lg px-4 py-2.5 text-left transition-colors border ${
                  selectedFile === fr.name ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <StatusIcon status={fr.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{fr.name}</p>
                  {fr.status === 'done' && (
                    <p className="text-xs text-gray-400">
                      {fr.records.length} taşınmaz
                      {(fr.rawSegments?.length ?? 0) > fr.records.length && (
                        <span className="text-amber-500 ml-2">
                          ({fr.rawSegments!.length} segment bulundu, {fr.rawSegments!.length - fr.records.length} parse edilemedi)
                        </span>
                      )}
                    </p>
                  )}
                  {fr.status === 'error' && <p className="text-xs text-red-500">{fr.error}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Debug panel */}
        {activeResult && (
          <div className="mt-6">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
              {(['table', 'json', 'rawtext'] as DebugView[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setDebugView(v)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    debugView === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {v === 'table' ? 'Tablo' : v === 'json' ? 'Ham JSON' : 'Ham Metin (PDF)'}
                </button>
              ))}
            </div>

            {/* ── Table view ── */}
            {debugView === 'table' && allRecords.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {TABLE_COLS.map((c) => (
                        <th key={c} className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allRecords.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{r.dogrulamaKodu || '—'}</td>
                        <td className="px-4 py-3">{r.tarih || '—'}</td>
                        <td className="px-4 py-3">{r.il}</td>
                        <td className="px-4 py-3">{r.ilce}</td>
                        <td className="px-4 py-3">{r.mahalleKoy}</td>
                        <td className="px-4 py-3 font-mono">{r.ada}/{r.parsel}</td>
                        <td className="px-4 py-3">{r.zeminTipi}</td>
                        <td className="px-4 py-3 max-w-[180px] truncate">{r.anaTasinmazNitelik}</td>
                        <td className="px-4 py-3 max-w-[180px] truncate text-xs">{r.malikler.map((m) => m.malik).join('; ') || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.ipotekVarYok === 'Var' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {r.ipotekVarYok}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[200px] truncate text-xs text-gray-500">{r.serhBeyanOzeti || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {debugView === 'table' && allRecords.length === 0 && (
              <ZeroRecordsHelp result={activeResult} />
            )}

            {/* ── Ham JSON ── */}
            {debugView === 'json' && (
              <div className="bg-gray-900 rounded-xl overflow-auto max-h-[65vh] p-4">
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                  {JSON.stringify(
                    allRecords.length > 0 ? allRecords : { segments: activeResult.rawSegments, nullSegments: activeResult.nullSegments },
                    null,
                    2
                  )}
                </pre>
              </div>
            )}

            {/* ── Ham Metin ── */}
            {debugView === 'rawtext' && (
              <div className="bg-gray-900 rounded-xl overflow-auto max-h-[65vh] p-4">
                <p className="text-xs text-gray-400 mb-2 font-mono">
                  Toplam karakter: {activeResult.rawText?.length ?? 0} |
                  Segment sayısı: {activeResult.rawSegments?.length ?? 0}
                </p>
                <pre className="text-xs text-yellow-300 font-mono whitespace-pre-wrap">
                  {activeResult.rawText ?? '(metin yok)'}
                </pre>
              </div>
            )}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-gray-400">
          🔒 Belgeleriniz cihazınızdan çıkmaz, hiçbir yerde saklanmaz.
        </p>
      </main>
    </div>
  );
}

// ── ZeroRecordsHelp ───────────────────────────────────────────────────────
function ZeroRecordsHelp({ result }: { result: FileResult }) {
  const segCount = result.rawSegments?.length ?? 0;
  const textLen = result.rawText?.length ?? 0;
  const firstChars = result.rawText?.slice(0, 300) ?? '';

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3 text-sm">
      <p className="font-semibold text-amber-800">0 taşınmaz parse edildi — tanı bilgileri:</p>
      <ul className="list-disc list-inside text-amber-700 space-y-1">
        <li>PDF'den çıkarılan metin uzunluğu: <strong>{textLen} karakter</strong></li>
        <li>Bulunan belge segmenti sayısı: <strong>{segCount}</strong></li>
        {segCount === 0 && textLen > 0 && (
          <li className="text-red-600">
            <strong>Sorun:</strong> Metinde &quot;Kaydı Oluşturan:&quot; ifadesi bulunamadı. &quot;Ham Metin&quot; sekmesine bakın.
          </li>
        )}
        {textLen === 0 && (
          <li className="text-red-600">
            <strong>Sorun:</strong> PDF'den metin çıkarılamadı. Dosya taranmış görüntü olabilir (OCR desteklenmiyor).
          </li>
        )}
        {segCount > 0 && result.nullSegments && result.nullSegments.length > 0 && (
          <li className="text-orange-600">
            <strong>Sorun:</strong> {segCount} segment bulundu ama parseDocument hepsi için null döndü.
            &quot;Ham JSON&quot; sekmesinde nullSegments alanına bakın.
          </li>
        )}
      </ul>
      {textLen > 0 && (
        <div>
          <p className="text-xs font-medium text-amber-700 mb-1">İlk 300 karakter:</p>
          <pre className="bg-amber-100 rounded p-3 text-xs font-mono whitespace-pre-wrap text-amber-900 overflow-auto max-h-40">
            {firstChars}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: FileResult['status'] }) {
  if (status === 'processing')
    return <svg className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>;
  if (status === 'done')
    return <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
  return <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
}

const TABLE_COLS = ['Doğrulama Kodu','Tarih','İl','İlçe','Mahalle','Ada/Parsel','Zemin','Nitelik','Malik(ler)','İpotek','Şerh/Beyan'];
