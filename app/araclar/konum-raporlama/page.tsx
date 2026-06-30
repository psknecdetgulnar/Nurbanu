'use client';

import dynamic        from 'next/dynamic';
import { useEffect, useState, useMemo } from 'react';
import { useRouter }  from 'next/navigation';
import Link           from 'next/link';
import { getUser }    from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';

// Leaflet SSR-safe
const KonumMap = dynamic(() => import('@/components/KonumMap'), { ssr: false });

// ── Tipler ───────────────────────────────────────────────────────────────────

interface Region { il: string; lat: number; lng: number; ilceler: { ilce: string; lat: number; lng: number }[] }

interface POI     { name: string; type: string; distance: number }
interface Report  {
  summary: { il: string; ilce: string; mahalle: string; ada?: string; parsel?: string; lat: number; lng: number; generatedAt: string };
  pois: POI[];
  poiWarning?: string | null;
  disclaimer: string;
}

const TYPE_LABEL: Record<string, string> = {
  okul: 'Okul', cami: 'Cami / İbadet', hastane: 'Hastane / Sağlık',
  'ana yol': 'Ana Yol', 'ikincil yol': 'İkincil Yol',
};

const DISCLAIMER = `Bu rapor bilgilendirme amaçlıdır, resmi belge niteliği taşımaz.
Konum, kullanıcı tarafından harita üzerinde işaretlenmiştir.
Çevre bilgileri OpenStreetMap (OSM) açık verisine dayalıdır; eksik veya güncel olmayan kayıtlar içerebilir.
Mesafeler kuş uçuşu hesaplanmıştır.
Bu rapor içeriği sistemimizde saklanmamaktadır (KVKK).`;

// ── Ana sayfa ────────────────────────────────────────────────────────────────

export default function KonumRaporlamaPage() {
  const router = useRouter();

  // Kullanıcı & kredi
  const [userId,    setUserId]    = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [balance,   setBalance]   = useState<number | null>(null);

  // Bölge verisi
  const [regions, setRegions] = useState<Region[]>([]);

  // Form state
  const [il,       setIl]       = useState('');
  const [ilce,     setIlce]     = useState('');
  const [mahalle,  setMahalle]  = useState('');
  const [ada,      setAda]      = useState('');
  const [parsel,   setParsel]   = useState('');
  const [pin,      setPin]      = useState<[number, number] | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Rapor state
  const [loading,  setLoading]  = useState(false);
  const [report,   setReport]   = useState<Report | null>(null);
  const [error,    setError]    = useState('');
  const [copied,   setCopied]   = useState(false);

  // ── Başlangıç ──────────────────────────────────────────────────────────────

  useEffect(() => {
    getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserId(data.user.id);
      setUserEmail(data.user.email ?? '');
      fetchCredits(data.user.id);
    });
    fetch('/data/regions.json').then(r => r.json()).then(setRegions).catch(() => {});
  }, [router]);

  const fetchCredits = async (_uid: string) => {
    const sb = createClient();
    const { data, error } = await sb.rpc('get_balance');
    if (error) { console.error('[konum] get_balance:', error.message); return; }
    setBalance(data ?? 0);
  };

  // ── Cascade dropdown hesaplamaları ────────────────────────────────────────

  const selectedRegion = useMemo(() => regions.find(r => r.il === il), [regions, il]);
  const ilceler        = selectedRegion?.ilceler ?? [];
  const selectedIlce   = useMemo(() => ilceler.find(i => i.ilce === ilce), [ilceler, ilce]);

  // Harita merkezi: ilçe seçildiyse ilçe koordinatı, il seçildiyse il koordinatı, yoksa Türkiye merkezi
  const mapCenter: [number, number] = useMemo(() => {
    if (selectedIlce) return [selectedIlce.lat, selectedIlce.lng];
    if (selectedRegion) return [selectedRegion.lat, selectedRegion.lng];
    return [39.0, 35.0];
  }, [selectedRegion, selectedIlce]);

  const mapZoom = selectedIlce ? 13 : selectedRegion ? 10 : 6;

  // ── Rapor oluştur ──────────────────────────────────────────────────────────

  // Hangi koşul eksik → kullanıcıya göster
  const disabledReason = !il || !ilce
    ? 'İl ve ilçe seçin'
    : !pin
    ? 'Haritada bir konum seçin (tıklayın)'
    : balance !== null && balance <= 0
    ? 'Krediniz yetersiz'
    : null;

  const canGenerate = !!pin && !!il && !!ilce && !!userId && !loading && !disabledReason;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true); setError(''); setReport(null);
    try {
      const res = await fetch('/api/location-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: pin![0], lng: pin![1], il, ilce, mahalle, ada, parsel }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Hata oluştu'); return; }
      setReport(json);
      // Sunucu güncel bakiyeyi döndürürse onu kullan, yoksa tahmini düş
      if (typeof json.balance === 'number') setBalance(json.balance);
      else if (balance !== null) setBalance(balance - 1);
    } catch {
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // ── Kopyala ───────────────────────────────────────────────────────────────

  const reportText = report ? buildReportText(report) : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(reportText);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<pre style="font-family:Calibri;font-size:11pt;white-space:pre-wrap">${reportText.replace(/</g,'&lt;')}</pre>`);
    w.document.close(); w.print();
  };

  const handleExcel = async () => {
    if (!report) return;
    const XLSX = await import('xlsx');
    const ws   = XLSX.utils.json_to_sheet(
      report.pois.map(p => ({ 'Ad': p.name, 'Tip': TYPE_LABEL[p.type] ?? p.type, 'Mesafe (m)': p.distance }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Çevre Analizi');
    XLSX.writeFile(wb, `konum-raporu-${il}-${ilce}.xlsx`);
  };

  // ── Kredi badge ───────────────────────────────────────────────────────────

  const creditBadge = () => {
    if (balance === null) return null;
    if (balance <= 0) return (
      <span className="text-xs font-mono text-orange-400 bg-orange-400/10 border border-orange-400/20 px-2.5 py-1 rounded-full">
        Krediniz bitti
      </span>
    );
    return (
      <span className="text-xs font-mono text-secondary bg-secondary/10 border border-secondary/20 px-2.5 py-1 rounded-full">
        Kalan kredi: {balance}
      </span>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="bg-surface-raised border-b border-subtle sticky top-0 z-20">
        <div className="px-6 lg:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 pl-8 lg:pl-0">
            <span className="text-xs font-mono text-text-muted tracking-wider">KONUM RAPORLAMA</span>
          </div>
          <div className="flex items-center gap-4">
            {creditBadge()}
            <Link href="/hesabim" className="text-xs font-mono text-text-muted hover:text-on-surface transition-colors tracking-wider">
              HESABIM
            </Link>
            <span className="text-xs font-mono text-text-muted hidden sm:block">{userEmail}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-[380px_1fr] gap-0">

        {/* ── Sol panel — Form ──────────────────────────────────────── */}
        <div className="border-r border-subtle px-6 py-6 space-y-5 overflow-y-auto">

          <div>
            <h2 className="text-sm font-semibold text-on-surface mb-1">Konum Bilgileri</h2>
            <p className="text-xs text-text-muted">İl ve ilçeyi seçin, haritada pin koyun.</p>
          </div>

          {/* İl */}
          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5 tracking-wider">İL</label>
            <select
              value={il}
              onChange={e => { setIl(e.target.value); setIlce(''); setPin(null); setMapReady(true); }}
              className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50"
            >
              <option value="">— Seçin —</option>
              {regions.map(r => <option key={r.il} value={r.il}>{r.il}</option>)}
            </select>
          </div>

          {/* İlçe */}
          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5 tracking-wider">İLÇE</label>
            <select
              value={ilce}
              onChange={e => { setIlce(e.target.value); setPin(null); }}
              disabled={!il}
              className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/50 disabled:opacity-50"
            >
              <option value="">— Seçin —</option>
              {ilceler.map(i => <option key={i.ilce} value={i.ilce}>{i.ilce}</option>)}
            </select>
          </div>

          {/* Mahalle */}
          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5 tracking-wider">MAHALLE <span className="normal-case font-sans">(opsiyonel)</span></label>
            <input
              value={mahalle}
              onChange={e => setMahalle(e.target.value)}
              placeholder="Mahalle adı"
              className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2.5 text-sm text-on-surface placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
            />
          </div>

          {/* Ada / Parsel */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-text-muted mb-1.5 tracking-wider">ADA <span className="normal-case font-sans text-text-muted/70">(opt.)</span></label>
              <input
                value={ada}
                onChange={e => setAda(e.target.value)}
                placeholder="—"
                className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2.5 text-sm text-on-surface placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-text-muted mb-1.5 tracking-wider">PARSEL <span className="normal-case font-sans text-text-muted/70">(opt.)</span></label>
              <input
                value={parsel}
                onChange={e => setParsel(e.target.value)}
                placeholder="—"
                className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2.5 text-sm text-on-surface placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          {/* Pin bilgisi */}
          {pin ? (
            <div className="bg-secondary/5 border border-secondary/20 rounded-lg px-3 py-2.5 text-xs font-mono text-secondary">
              📍 {pin[0].toFixed(6)}, {pin[1].toFixed(6)}
              <button onClick={() => setPin(null)} className="ml-2 text-text-muted hover:text-error">✕</button>
            </div>
          ) : (
            <div className="bg-surface-container border border-subtle rounded-lg px-3 py-2.5 text-xs text-text-muted">
              Sağdaki haritada pin koymak için tıklayın.
            </div>
          )}

          {/* Hata */}
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg px-3 py-2.5 text-xs text-error">
              {error}
            </div>
          )}

          {/* Raporu Oluştur */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full py-3 rounded-lg text-sm font-semibold transition-all
              bg-brand text-on-primary shadow-glow-primary
              hover:opacity-90 active:scale-[0.98]
              disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Analiz ediliyor…
              </span>
            ) : 'Raporu Oluştur'}
          </button>

          {disabledReason && (
            <p className="text-xs text-center text-amber-400/80">
              ⚠ {disabledReason}
            </p>
          )}

          <p className="text-[10px] text-text-muted/60 text-center">
            Raporlar sistemimizde saklanmamaktadır.
          </p>
        </div>

        {/* ── Sağ panel — Harita + Rapor ────────────────────────────── */}
        <div className="flex flex-col">

          {/* Harita */}
          <div className={`relative ${report ? 'h-[40vh]' : 'flex-1 min-h-[400px]'} transition-all duration-300`}>
            {(mapReady || il) ? (
              <KonumMap
                pin={pin}
                onPin={setPin}
                center={mapCenter}
                zoom={mapZoom}
              />
            ) : (
              <div className="h-full flex items-center justify-center bg-surface-container text-text-muted text-sm">
                İl seçince harita yüklenir.
              </div>
            )}
          </div>

          {/* Rapor alanı */}
          {report && (
            <div className="flex-1 overflow-y-auto border-t border-subtle p-6 space-y-5">

              {/* Export butonları */}
              <div className="flex gap-2 flex-wrap">
                <GhostBtn onClick={handleCopy}>{copied ? '✓ Kopyalandı' : '⊕ Kopyala'}</GhostBtn>
                <GhostBtn onClick={handlePrint}>↓ PDF (yazdır)</GhostBtn>
                <GhostBtn onClick={handleExcel}>↓ Excel</GhostBtn>
              </div>

              {/* Özet */}
              <div className="bg-surface-container rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-mono text-text-muted tracking-wider mb-2">RAPOR ÖZETİ</p>
                <Row k="Konum" v={[report.summary.il, report.summary.ilce, report.summary.mahalle].filter(Boolean).join(' / ')} />
                {report.summary.ada    && <Row k="Ada"    v={report.summary.ada} />}
                {report.summary.parsel && <Row k="Parsel" v={report.summary.parsel} />}
                <Row k="Koordinat" v={`${report.summary.lat.toFixed(6)}, ${report.summary.lng.toFixed(6)}`} />
                <Row k="Tarih" v={new Date(report.summary.generatedAt).toLocaleString('tr-TR')} />
              </div>

              {/* POI tablosu */}
              <div>
                <p className="text-xs font-mono text-text-muted tracking-wider mb-2">ÇEVRE ANALİZİ ({report.pois.length} nokta)</p>
                {report.poiWarning && (
                  <div className="mb-3 bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-2.5 text-xs text-amber-400">
                    ⚠ {report.poiWarning}
                  </div>
                )}
                {report.pois.length === 0 ? (
                  <p className="text-sm text-text-muted">Bu alanda kayıtlı POI bulunamadı.</p>
                ) : (
                  <div className="overflow-auto rounded-xl border border-subtle">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-container text-text-muted text-xs font-mono tracking-wider">
                        <tr>
                          <th className="text-left px-4 py-2.5">Ad</th>
                          <th className="text-left px-4 py-2.5">Tip</th>
                          <th className="text-right px-4 py-2.5">Mesafe</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-subtle">
                        {report.pois.map((p, i) => (
                          <tr key={i} className="hover:bg-surface-raised/40 transition-colors">
                            <td className="px-4 py-2.5 text-on-surface">{p.name}</td>
                            <td className="px-4 py-2.5 text-text-muted">{TYPE_LABEL[p.type] ?? p.type}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-secondary">
                              {p.distance < 1000 ? `${p.distance} m` : `${(p.distance / 1000).toFixed(1)} km`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Disclaimer */}
              <div className="bg-surface-container rounded-xl p-4">
                <p className="text-xs font-mono text-text-muted tracking-wider mb-2">YASAL UYARI</p>
                <pre className="text-xs text-text-muted/80 whitespace-pre-wrap font-sans leading-relaxed">
                  {report.disclaimer}
                </pre>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Yardımcı bileşenler ───────────────────────────────────────────────────────

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-text-muted min-w-[80px]">{k}</span>
      <span className="text-on-surface font-medium">{v}</span>
    </div>
  );
}

function GhostBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
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

// ── Rapor text builder ────────────────────────────────────────────────────────

function buildReportText(r: Report): string {
  const s = r.summary;
  const loc = [s.il, s.ilce, s.mahalle].filter(Boolean).join(' / ');
  const lines = [
    '=== KONUM RAPORU ===',
    '',
    `Konum      : ${loc}`,
    s.ada    ? `Ada        : ${s.ada}`    : '',
    s.parsel ? `Parsel     : ${s.parsel}` : '',
    `Koordinat  : ${s.lat.toFixed(6)}, ${s.lng.toFixed(6)}`,
    `Oluşturulma: ${new Date(s.generatedAt).toLocaleString('tr-TR')}`,
    '',
    '--- ÇEVRE ANALİZİ ---',
    '',
    ...r.pois.map(p => {
      const dist = p.distance < 1000 ? `${p.distance} m` : `${(p.distance / 1000).toFixed(1)} km`;
      return `${(TYPE_LABEL[p.type] ?? p.type).padEnd(20)} ${p.name.padEnd(40)} ${dist}`;
    }),
    '',
    '--- YASAL UYARI ---',
    '',
    r.disclaimer,
  ];
  return lines.filter(l => l !== undefined).join('\n');
}
