'use client';

import dynamic        from 'next/dynamic';
import { useEffect, useState, useMemo } from 'react';
import { useRouter }  from 'next/navigation';
import Link           from 'next/link';
import { getUser }    from '@/lib/auth';
import { createClient } from '@/lib/supabase/client';
import { poiCategories } from '@/config/poiCategories';
import type { LocationAnalysisResponse } from '@/config/poiCategories';

// Leaflet SSR-safe (pin seçimi için; çıktıda harita yok)
const KonumMap = dynamic(() => import('@/components/KonumMap'), { ssr: false });

// ── Tipler ───────────────────────────────────────────────────────────────────

interface Region { il: string; lat: number; lng: number; ilceler: { ilce: string; lat: number; lng: number }[] }

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

  // Analiz parametreleri
  const [radiusKm,    setRadiusKm]    = useState('1');
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  // Rapor state
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<LocationAnalysisResponse | null>(null);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);

  // ── Başlangıç ──────────────────────────────────────────────────────────────

  useEffect(() => {
    getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserId(data.user.id);
      setUserEmail(data.user.email ?? '');
      fetchCredits();
    });
    fetch('/data/regions.json').then(r => r.json()).then(setRegions).catch(() => {});
  }, [router]);

  const fetchCredits = async () => {
    const sb = createClient();
    const { data, error } = await sb.rpc('get_balance');
    if (error) { console.error('[konum] get_balance:', error.message); return; }
    setBalance(data ?? 0);
  };

  // ── Cascade dropdown ──────────────────────────────────────────────────────

  const selectedRegion = useMemo(() => regions.find(r => r.il === il), [regions, il]);
  const ilceler        = selectedRegion?.ilceler ?? [];
  const selectedIlce   = useMemo(() => ilceler.find(i => i.ilce === ilce), [ilceler, ilce]);

  const mapCenter: [number, number] = useMemo(() => {
    if (selectedIlce) return [selectedIlce.lat, selectedIlce.lng];
    if (selectedRegion) return [selectedRegion.lat, selectedRegion.lng];
    return [39.0, 35.0];
  }, [selectedRegion, selectedIlce]);

  const mapZoom = selectedIlce ? 13 : selectedRegion ? 10 : 6;

  // ── Kategori seçimi ───────────────────────────────────────────────────────

  const toggleCat = (id: string) => {
    setSelectedCats(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // ── Sorgu tetikleme ───────────────────────────────────────────────────────

  const radiusNum = Number(radiusKm.replace(',', '.'));
  const radiusValid = Number.isFinite(radiusNum) && radiusNum >= 0.1 && radiusNum <= 10;

  const disabledReason = !pin
    ? 'Haritada bir konum seçin (tıklayın)'
    : !radiusValid
    ? 'Yarıçap 0.1 ile 10 km arasında olmalıdır'
    : selectedCats.length === 0
    ? 'Çevre analizi için en az bir kategori seçmelisiniz.'
    : balance !== null && balance <= 0
    ? 'Krediniz yetersiz'
    : null;

  const canQuery = !!pin && radiusValid && selectedCats.length > 0 && !!userId && !loading && balance !== null && balance > 0;

  const handleQuery = async () => {
    if (!canQuery || loading) return;   // aynı anda ikinci istek gönderme
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/location-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: pin![0],
          lon: pin![1],
          radiusKm: radiusNum,
          categoryIds: selectedCats,
          il, ilce, mahalle, ada, parsel,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Çevre analizi şu anda tamamlanamadı. Lütfen daha sonra tekrar deneyin.'); return; }
      setResult(json as LocationAnalysisResponse);
      if (typeof json.balance === 'number') setBalance(json.balance);
      else if (balance !== null) setBalance(balance - 1);
    } catch {
      setError('Bağlantı hatası. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────

  const reportText = result ? buildReportText(result, { il, ilce, mahalle, ada, parsel }) : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(reportText);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleExcel = async () => {
    if (!result) return;
    const XLSX = await import('xlsx');
    const rows = result.categories.flatMap(c =>
      c.items.map(it => ({ 'Kategori': c.categoryLabel, 'Ad': it.name, 'Mesafe': it.distanceText, 'Mesafe (m)': it.distanceM }))
    );
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'Kategori': '', 'Ad': '', 'Mesafe': '', 'Mesafe (m)': '' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Çevre Analizi');
    XLSX.writeFile(wb, `konum-raporu-${il || 'konum'}-${ilce || ''}.xlsx`);
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

      <main className="flex-1 grid lg:grid-cols-[400px_1fr] gap-0">

        {/* ── Sol panel — Form ──────────────────────────────────────── */}
        <div className="border-r border-subtle px-6 py-6 space-y-5 overflow-y-auto">

          <div>
            <h2 className="text-sm font-semibold text-on-surface mb-1">Konum & Analiz</h2>
            <p className="text-xs text-text-muted">İl/ilçe seçin, haritada pin koyun, yarıçap ve kategori belirleyin.</p>
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
              <input value={ada} onChange={e => setAda(e.target.value)} placeholder="—"
                className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2.5 text-sm text-on-surface placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50" />
            </div>
            <div>
              <label className="block text-xs font-mono text-text-muted mb-1.5 tracking-wider">PARSEL <span className="normal-case font-sans text-text-muted/70">(opt.)</span></label>
              <input value={parsel} onChange={e => setParsel(e.target.value)} placeholder="—"
                className="w-full bg-surface-container border border-subtle rounded-lg px-3 py-2.5 text-sm text-on-surface placeholder:text-text-muted/50 focus:outline-none focus:border-primary/50" />
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

          {/* Yarıçap */}
          <div>
            <label className="block text-xs font-mono text-text-muted mb-1.5 tracking-wider">ANALİZ YARIÇAPI (km)</label>
            <input
              type="number" step="0.1" min="0.1" max="10"
              value={radiusKm}
              onChange={e => setRadiusKm(e.target.value)}
              className={`w-full bg-surface-container border rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none ${
                radiusValid ? 'border-subtle focus:border-primary/50' : 'border-error/50'
              }`}
            />
            {!radiusValid && (
              <p className="text-[11px] text-error mt-1">Yarıçap 0.1 ile 10 km arasında olmalıdır.</p>
            )}
          </div>

          {/* Kategoriler */}
          <div>
            <label className="block text-xs font-mono text-text-muted mb-2 tracking-wider">
              POI KATEGORİLERİ {selectedCats.length > 0 && <span className="text-secondary">({selectedCats.length})</span>}
            </label>
            <div className="space-y-1.5">
              {poiCategories.map(cat => (
                <label key={cat.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-container border border-subtle cursor-pointer hover:border-bright transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedCats.includes(cat.id)}
                    onChange={() => toggleCat(cat.id)}
                    className="accent-primary w-4 h-4"
                  />
                  <span className="text-sm text-on-surface">{cat.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Hata */}
          {error && (
            <div className="bg-error/10 border border-error/20 rounded-lg px-3 py-2.5 text-xs text-error space-y-2">
              <p>{error}</p>
              <button onClick={handleQuery} disabled={!canQuery}
                className="font-mono text-[11px] tracking-wider px-3 py-1.5 rounded-lg border border-error/40 text-error hover:bg-error/10 transition-colors disabled:opacity-40">
                ↻ Tekrar Sorgula
              </button>
            </div>
          )}

          {/* Sorgula */}
          <button
            onClick={handleQuery}
            disabled={!canQuery}
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
                Çevre analizi hazırlanıyor…
              </span>
            ) : 'Sorgula'}
          </button>

          {disabledReason && !loading && (
            <p className="text-xs text-center text-amber-400/80">⚠ {disabledReason}</p>
          )}

          <p className="text-[10px] text-text-muted/60 text-center">
            Raporlar sistemimizde saklanmamaktadır.
          </p>
        </div>

        {/* ── Sağ panel — Harita (pin seçimi) + Sonuç ───────────────── */}
        <div className="flex flex-col">

          {/* Harita — sadece pin seçimi için */}
          <div className={`relative ${result ? 'h-[35vh]' : 'flex-1 min-h-[400px]'} transition-all duration-300`}>
            {(mapReady || il) ? (
              <KonumMap pin={pin} onPin={setPin} center={mapCenter} zoom={mapZoom} />
            ) : (
              <div className="h-full flex items-center justify-center bg-surface-container text-text-muted text-sm">
                İl seçince harita yüklenir.
              </div>
            )}
          </div>

          {/* Sonuç — kategori bazlı liste */}
          {result && (
            <div className="flex-1 overflow-y-auto border-t border-subtle p-6 space-y-5">

              {/* Export */}
              <div className="flex gap-2 flex-wrap items-center">
                <GhostBtn onClick={handleCopy}>{copied ? '✓ Kopyalandı' : '⊕ Kopyala'}</GhostBtn>
                <GhostBtn onClick={handleExcel}>↓ Excel</GhostBtn>
                <span className="text-xs text-text-muted ml-auto font-mono">
                  Yarıçap: {result.radiusKm} km · {result.center.lat.toFixed(5)}, {result.center.lon.toFixed(5)}
                </span>
              </div>

              {/* Kategori grupları */}
              <div className="space-y-5">
                {result.categories.map(cat => (
                  <div key={cat.categoryId}>
                    <p className="text-sm font-semibold text-on-surface mb-2">
                      {cat.categoryLabel}
                      {cat.items.length > 0 && <span className="text-text-muted font-normal"> ({cat.items.length})</span>}
                    </p>
                    {cat.items.length === 0 ? (
                      <p className="text-xs text-text-muted pl-1">Bu yarıçapta {cat.categoryLabel.toLowerCase()} bulunamadı.</p>
                    ) : (
                      <ul className="space-y-1">
                        {cat.items.map((it, i) => (
                          <li key={i} className="flex justify-between gap-3 text-sm px-3 py-1.5 rounded-lg hover:bg-surface-raised/40 transition-colors">
                            <span className="text-on-surface">{it.name}</span>
                            <span className="font-mono text-secondary shrink-0">{it.distanceText}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <div className="bg-surface-container rounded-xl p-4">
                <p className="text-xs font-mono text-text-muted tracking-wider mb-2">YASAL UYARI</p>
                <pre className="text-xs text-text-muted/80 whitespace-pre-wrap font-sans leading-relaxed">{DISCLAIMER}</pre>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Yardımcı bileşenler ───────────────────────────────────────────────────────

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

// ── Rapor metni ────────────────────────────────────────────────────────────────

function buildReportText(
  r: LocationAnalysisResponse,
  loc: { il: string; ilce: string; mahalle: string; ada: string; parsel: string },
): string {
  const konum = [loc.il, loc.ilce, loc.mahalle].filter(Boolean).join(' / ');
  const lines = [
    '=== ÇEVRE ANALİZİ RAPORU ===',
    '',
    konum     ? `Konum     : ${konum}` : '',
    loc.ada    ? `Ada       : ${loc.ada}`    : '',
    loc.parsel ? `Parsel    : ${loc.parsel}` : '',
    `Koordinat : ${r.center.lat.toFixed(6)}, ${r.center.lon.toFixed(6)}`,
    `Yarıçap   : ${r.radiusKm} km`,
    `Tarih     : ${new Date().toLocaleString('tr-TR')}`,
    '',
  ];
  for (const cat of r.categories) {
    lines.push(`--- ${cat.categoryLabel} ---`);
    if (cat.items.length === 0) {
      lines.push(`Bu yarıçapta ${cat.categoryLabel.toLowerCase()} bulunamadı.`);
    } else {
      for (const it of cat.items) lines.push(`- ${it.name} — ${it.distanceText}`);
    }
    lines.push('');
  }
  lines.push('--- YASAL UYARI ---', '', DISCLAIMER);
  return lines.filter(l => l !== undefined).join('\n');
}
