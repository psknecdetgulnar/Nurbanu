'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, signOut } from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import { extractTextFromPDF } from '@/lib/takbis/extractText';
import { splitDocuments } from '@/lib/takbis/splitDocuments';
import { parseDocument } from '@/lib/takbis/parseDocument';
import { normalizeRecord } from '@/lib/takbis/normalize';
import { countTakyidat } from '@/lib/takbis/render/takyidatRenderer';
import { renderTamRapor } from '@/lib/takbis/render/tamRaporRenderer';
import type { TakbisRecord } from '@/lib/takbis/types';
import type { BelgeModel } from '@/lib/takbis/render/types';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────
interface FileResult {
  name: string;
  status: 'processing' | 'done' | 'error';
  records: TakbisRecord[];
  models: BelgeModel[];
  error?: string;
  rawText?: string;
}

type OutputTab = 'tamrapor';

// ── Page ──────────────────────────────────────────────────────────────────
export default function TakbisOkuyucuPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [fileResults, setFileResults] = useState<FileResult[]>([]);
  const [dragging, setDragging] = useState(false);
  const [copiedTab, setCopiedTab] = useState<OutputTab | null>(null);

  useEffect(() => {
    getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserEmail(data.user.email ?? '');
      const sb = createClient();
      const { data: bal } = await sb.rpc('get_balance');
      setBalance(bal ?? 0);
    });
  }, [router]);

  // ── File processing (mantık korundu) ───────────────────────────────────
  const processFiles = useCallback(async (files: File[]) => {
    const pdfs = files.filter((f) => f.type === 'application/pdf');
    if (!pdfs.length) return;

    setFileResults((prev) => [
      ...prev,
      ...pdfs.map((f) => ({ name: f.name, status: 'processing' as const, records: [], models: [] })),
    ]);

    const sb = createClient();

    for (const file of pdfs) {
      // Her belge 1 kredi — parse'tan önce düş (FEFO, atomik)
      const { data: ok, error: cErr } = await sb.rpc('consume_credits', {
        p_cost: 1, p_action: 'takbis_read',
      });
      if (cErr || ok !== true) {
        setFileResults((prev) =>
          prev.map((r) =>
            r.name === file.name
              ? { ...r, status: 'error', records: [], models: [], error: 'Krediniz yetersiz. Hesabınıza kredi ekleyin.' }
              : r
          )
        );
        continue;
      }

      try {
        const docText = await extractTextFromPDF(file);
        const segments = splitDocuments(docText.fullText);
        const records: TakbisRecord[] = [];
        const models: BelgeModel[] = [];

        for (const seg of segments) {
          const rec = parseDocument(seg, file.name);
          if (rec) { records.push(rec); models.push(normalizeRecord(rec)); }
        }

        setFileResults((prev) =>
          prev.map((r) =>
            r.name === file.name
              ? { ...r, status: 'done', records, models, rawText: docText.fullText }
              : r
          )
        );
        const { data: bal } = await sb.rpc('get_balance');
        setBalance(bal ?? 0);
      } catch (err) {
        // Parse başarısız → krediyi iade et
        await sb.rpc('refund_credits', { p_amount: 1, p_action: 'takbis_read' });
        const { data: bal } = await sb.rpc('get_balance');
        setBalance(bal ?? 0);
        setFileResults((prev) =>
          prev.map((r) =>
            r.name === file.name
              ? { ...r, status: 'error', records: [], models: [], error: String(err) }
              : r
          )
        );
      }
    }
  }, []);

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); processFiles(Array.from(e.dataTransfer.files)); };
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) processFiles(Array.from(e.target.files)); };

  // ── Çıktı hesapla ─────────────────────────────────────────────────────
  const allModels  = fileResults.flatMap((r) => r.models);
  const allRecords = fileResults.flatMap((r) => r.records);

  const tamRaporAll = allModels.map((m) => renderTamRapor(m)).join('\n\n---\n\n');

  const counts = allModels.length > 0
    ? allModels.reduce(
        (acc, m) => { const c = countTakyidat(m); return { beyan: acc.beyan + c.beyan, serh: acc.serh + c.serh, ipotek: acc.ipotek + c.ipotek }; },
        { beyan: 0, serh: 0, ipotek: 0 }
      )
    : null;

  // ── Export helpers (mantık korundu) ────────────────────────────────────
  const copyText = async (text: string, tab: OutputTab) => {
    await navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
  };


  const downloadTxt = (text: string, filename: string) => {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadWord = (text: string, filename: string) => {
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office'><head><meta charset='UTF-8'></head><body><pre style="font-family:Calibri;font-size:11pt;white-space:pre-wrap">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre></body></html>`;
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = async () => {
    const { downloadExcel: dl } = await import('@/lib/takbis/toExcel');
    dl(allRecords, 'takbis.xlsx');
  };

  const handleLogout = async () => { await signOut(); router.push('/login'); };

  const hasOutput  = allModels.length > 0;
  const doneCount  = fileResults.filter((r) => r.status === 'done').length;
  const errorCount = fileResults.filter((r) => r.status === 'error').length;

  return (
    <div className="min-h-screen bg-surface-base text-on-surface">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="bg-surface-raised border-b border-subtle sticky top-0 z-10">
        <div className="max-w-[1200px] mx-auto pl-14 pr-10 lg:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-mono text-text-muted hover:text-on-surface transition-colors tracking-wider">
              ← ARAÇLAR
            </Link>
            <span className="text-subtle text-xs text-outline">/</span>
            <span className="text-xs font-mono text-on-surface-variant tracking-wider">TAKBIS OKUYUCU</span>
          </div>
          <div className="flex items-center gap-5">
            {balance !== null && (
              <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${
                balance <= 0
                  ? 'text-orange-400 bg-orange-400/10 border-orange-400/20'
                  : 'text-secondary bg-secondary/10 border-secondary/20'
              }`}>
                {balance <= 0 ? 'Krediniz bitti' : `Kalan kredi: ${balance}`}
              </span>
            )}
            <Link href="/hesabim" className="text-xs font-mono text-text-muted hover:text-on-surface transition-colors tracking-wider">
              HESABIM
            </Link>
            <span className="text-xs font-mono text-text-muted hidden sm:block">{userEmail}</span>
            <button
              onClick={handleLogout}
              className="text-xs font-mono text-text-muted hover:text-on-surface transition-colors tracking-wider"
            >
              ÇIKIŞ
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-10 py-10">

        {/* ── Drop zone ───────────────────────────────────────────────────── */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
            dragging
              ? 'border-primary/50 bg-primary/5 shadow-glow-accent'
              : 'border-subtle hover:border-bright bg-surface-raised'
          }`}
        >
          <div className="text-3xl mb-3 opacity-60">📄</div>
          <p className="font-geist font-medium text-on-surface mb-1">
            TAKBIS PDF&apos;lerini buraya sürükleyin
          </p>
          <p className="text-xs text-text-muted mb-5">
            Tek dosyada birden fazla belge · Toplu yükleme
          </p>
          <label className="cursor-pointer inline-block px-5 py-2.5 rounded-lg text-sm font-semibold
                             bg-brand text-on-primary hover:opacity-90 transition-opacity shadow-glow-primary">
            Dosya Seç
            <input type="file" accept="application/pdf" multiple className="hidden" onChange={onFileChange} />
          </label>
          <p className="text-xs text-text-muted mt-4">
            🔒 Belgeleriniz cihazınızdan çıkmaz, hiçbir yerde saklanmaz.
          </p>
        </div>

        {/* ── Dosya listesi ───────────────────────────────────────────────── */}
        {fileResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {fileResults.map((fr, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-surface-raised border border-subtle rounded-lg px-4 py-3"
              >
                <StatusIcon status={fr.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-on-surface truncate">{fr.name}</p>
                  {fr.status === 'done' && (
                    <p className="font-mono text-[11px] text-text-muted">
                      {fr.records.length} taşınmaz · {fr.rawText?.length.toLocaleString()} karakter
                    </p>
                  )}
                  {fr.status === 'error' && (
                    <p className="font-mono text-[11px] text-error">{fr.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Çıktı paneli ────────────────────────────────────────────────── */}
        {hasOutput && (
          <div className="mt-10">
            {/* Rozetler */}
            {counts && (
              <div className="flex gap-2 mb-5 flex-wrap">
                <Badge color="primary">{allModels.length} Taşınmaz</Badge>
                <Badge color="muted">{counts.beyan} Beyan</Badge>
                <Badge color="muted">{counts.serh} Şerh</Badge>
                <Badge color="muted">{counts.ipotek} İpotek</Badge>
                {errorCount > 0 && <Badge color="error">{errorCount} hata</Badge>}
              </div>
            )}

            {/* Export butonları */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <GhostButton onClick={() => copyText(tamRaporAll, 'tamrapor')}>
                {copiedTab === 'tamrapor' ? '✓ Kopyalandı' : '⊕ Kopyala'}
              </GhostButton>
              <GhostButton onClick={() => downloadTxt(tamRaporAll, 'takbis-okuyucu.txt')}>
                ↓ TXT
              </GhostButton>
              <GhostButton onClick={() => downloadWord(tamRaporAll, 'takbis-okuyucu.doc')}>
                ↓ Word
              </GhostButton>
              <GhostButton onClick={downloadExcel}>
                ↓ Excel
              </GhostButton>
            </div>

            {/* İçerik */}
            <div className="bg-surface-container-high rounded-xl overflow-auto max-h-[60vh] border border-subtle">
              <pre className="p-6 text-sm text-on-surface font-inter leading-relaxed whitespace-pre-wrap">
                {tamRaporAll || '(çıktı yok)'}
              </pre>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setFileResults([])}
                className="text-xs font-mono text-text-muted hover:text-on-surface-variant transition-colors tracking-wider"
              >
                TEMİZLE
              </button>
            </div>
          </div>
        )}

        {/* Boş durum */}
        {doneCount > 0 && allModels.length === 0 && (
          <div className="mt-6 bg-tertiary/5 border border-tertiary/20 rounded-xl p-5 text-sm text-tertiary">
            0 taşınmaz parse edildi. &quot;Ham Metin&quot; sekmesinde PDF içeriğini kontrol edin.
          </div>
        )}

      </main>
    </div>
  );
}

// ── Alt bileşenler ─────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: FileResult['status'] }) {
  if (status === 'processing')
    return <svg className="w-3.5 h-3.5 text-primary animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>;
  if (status === 'done')
    return <svg className="w-3.5 h-3.5 text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>;
  return <svg className="w-3.5 h-3.5 text-error flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>;
}

function Badge({ children, color }: { children: React.ReactNode; color: 'primary' | 'muted' | 'error' }) {
  const cls = {
    primary: 'bg-primary/10 text-primary border-primary/20',
    muted:   'bg-surface-container text-text-muted border-subtle',
    error:   'bg-error/10 text-error border-error/20',
  }[color];
  return (
    <span className={`font-mono text-[10px] font-medium tracking-wider px-2.5 py-1 rounded-full border ${cls}`}>
      {children}
    </span>
  );
}

function GhostButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="font-mono text-[11px] tracking-wider px-3 py-1.5 rounded-lg border border-subtle
                 text-text-muted hover:border-bright hover:text-on-surface-variant transition-colors"
    >
      {children}
    </button>
  );
}

// ── Statik ─────────────────────────────────────────────────────────────────

