import Link from 'next/link';
import { TOOLS } from '@/config/tools';

export default function Home() {
  const [featured, ...rest] = TOOLS;

  return (
    <div className="min-h-screen bg-surface-base text-on-surface">

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 border-b border-subtle bg-surface-base/80 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-10 h-14 flex items-center justify-between">
          <Link href="/" className="font-geist font-semibold text-on-surface tracking-tight">
            Değerleme Araçları
          </Link>
          <div className="flex items-center gap-6">
            <Link href="#araclar" className="text-sm text-text-muted hover:text-on-surface transition-colors hidden sm:block">
              Araçlar
            </Link>
            <Link
              href="/login"
              className="text-sm px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-medium
                         hover:opacity-90 transition-opacity shadow-glow-primary"
            >
              Giriş Yap
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-10 pt-24 pb-20">
        <p className="font-mono text-xs text-text-muted tracking-widest uppercase mb-5">
          Gayrimenkul değerleme uzmanları için
        </p>

        <h1 className="font-geist font-semibold text-[48px] leading-[56px] tracking-[-0.02em] text-white max-w-2xl mb-6">
          Rapor işini<br />
          <span className="text-brand">dakikalara indiren</span>{' '}
          araç kutusu
        </h1>

        <p className="text-text-muted max-w-xl leading-[22px] text-sm mb-10">
          TAKBIS/tapu belgelerini, imar durumlarını ve değerleme hesaplarını saniyeler içinde
          rapora hazır çıktıya çevirin. Verileriniz cihazınızdan çıkmaz.
        </p>

        <div className="flex flex-wrap gap-3 mb-10">
          <Link
            href="/login"
            className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-brand text-on-primary
                       hover:opacity-90 transition-opacity shadow-glow-primary"
          >
            Ücretsiz Başla
          </Link>
          <Link
            href="#araclar"
            className="px-6 py-2.5 rounded-lg text-sm font-medium border border-subtle
                       hover:border-bright text-on-surface transition-colors"
          >
            Araçları İncele
          </Link>
        </div>

        {/* Trust strip */}
        <div className="flex flex-wrap gap-6 text-xs font-mono text-text-muted tracking-wider">
          {['KVKK uyumlu', 'Veriler cihazda işlenir', 'SPK lisanslı eksperlerce kullanılır'].map((t) => (
            <span key={t} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-primary opacity-60" />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── Value props ────────────────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-10 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="bento group">
              <p className="text-sm font-semibold text-on-surface mb-2">{v.title}</p>
              <p className="text-xs text-text-muted leading-[18px]">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured tool ──────────────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-10 pb-20">
        <h2 className="font-geist font-medium text-2xl leading-8 tracking-[-0.01em] text-on-surface mb-6">
          TAKBIS / Tapu Kayıt Belgesi Okuyucu
        </h2>

        <div className="relative overflow-hidden bento !rounded-xl flex flex-col md:flex-row gap-8 p-8 bg-glow-radial">
          {/* Accent glow */}
          <div className="absolute inset-0 bg-glow-radial pointer-events-none" />

          <div className="relative text-5xl select-none">📄</div>

          <div className="relative flex-1">
            <p className="text-sm text-on-surface-variant leading-[22px] mb-5 max-w-xl">
              Web Tapu PDF&apos;ini yükleyin; taşınmaz bilgileri, malik, beyan, şerh ve ipotek
              kayıtları otomatik ayrıştırılsın. İki çıktı modu:{' '}
              <span className="text-primary font-medium">Takyidat metni</span> ve{' '}
              <span className="text-primary font-medium">Tam Rapor</span>.
            </p>

            <div className="flex flex-wrap gap-2 mb-6">
              {featured?.etiketler.map((e) => (
                <span
                  key={e}
                  className="font-mono text-[11px] font-medium tracking-[0.05em] px-2.5 py-1
                             rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  {e}
                </span>
              ))}
            </div>

            <Link
              href="/login"
              className="inline-block px-5 py-2.5 rounded-lg text-sm font-semibold bg-brand
                         text-on-primary hover:opacity-90 transition-opacity shadow-glow-primary"
            >
              Belgeyi Yükle
            </Link>
          </div>
        </div>
      </section>

      {/* ── Tool catalog — Bento grid ───────────────────────────────────── */}
      <section id="araclar" className="max-w-[1200px] mx-auto px-10 pb-20">
        <div className="flex items-baseline justify-between mb-6">
          <h2 className="font-geist font-medium text-2xl leading-8 tracking-[-0.01em] text-on-surface">
            Araç Kataloğu
          </h2>
          <span className="font-mono text-xs text-text-muted tracking-wider">
            {TOOLS.filter((t) => t.status === 'aktif').length} aktif · {TOOLS.filter((t) => t.status === 'yakinda').length} yakında
          </span>
        </div>

        {/* True bento: first card spans 2 cols */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map((tool, idx) => (
            <ToolCard key={tool.slug} tool={tool} featured={idx === 0} />
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-10 pb-20">
        <h2 className="font-geist font-medium text-2xl leading-8 tracking-[-0.01em] text-on-surface mb-10 text-center">
          Nasıl Çalışır
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={i} className="text-center">
              <div className="w-9 h-9 rounded-full border border-primary/30 bg-primary/10 text-primary
                              font-mono text-sm font-medium flex items-center justify-center mx-auto mb-4">
                {i + 1}
              </div>
              <h3 className="font-geist font-medium text-on-surface mb-2 text-sm">{s.title}</h3>
              <p className="text-xs text-text-muted leading-[18px]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── KVKK block ─────────────────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-10 pb-20">
        <div className="bento text-center p-12">
          <p className="font-mono text-xs text-text-muted tracking-widest uppercase mb-4">Gizlilik & Güven</p>
          <h2 className="font-geist font-semibold text-2xl tracking-[-0.01em] text-on-surface mb-4">
            Verileriniz cihazınızda kalır
          </h2>
          <p className="text-sm text-text-muted leading-[22px] max-w-xl mx-auto">
            Yüklediğiniz belgeler ve okunan veriler hiçbir yerde saklanmaz; işlem yalnızca
            tarayıcınızda gerçekleşir. Sadece anonim işlem sayınız tutulur.
          </p>
        </div>
      </section>

      {/* ── Pricing teaser ─────────────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-10 pb-20 text-center">
        <h2 className="font-geist font-semibold text-2xl tracking-[-0.01em] text-on-surface mb-3">
          Tek araç değil, büyüyen bir kutu
        </h2>
        <p className="text-sm text-text-muted max-w-md mx-auto mb-8">
          Tüm araçlara tek abonelikle erişin. Platforma eklenen her yeni araç aynı abonelikte. Aylık veya yıllık.
        </p>
        <Link
          href="/login"
          className="inline-block px-6 py-2.5 rounded-lg text-sm font-medium border border-subtle
                     hover:border-bright text-on-surface transition-colors"
        >
          Planları Gör
        </Link>
      </section>

      {/* ── Closing CTA ────────────────────────────────────────────────── */}
      <section className="border-t border-subtle py-20 text-center">
        <h2 className="font-geist font-semibold text-3xl tracking-[-0.02em] text-on-surface mb-8">
          İlk takyidatınızı bir dakikada çıkarın
        </h2>
        <Link
          href="/login"
          className="inline-block px-8 py-3 rounded-lg text-sm font-semibold bg-brand
                     text-on-primary hover:opacity-90 transition-opacity shadow-glow-primary"
        >
          Ücretsiz Başla
        </Link>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-subtle py-8">
        <div className="max-w-[1200px] mx-auto px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap gap-6 text-xs text-text-muted">
            {['Araçlar', 'Fiyatlandırma', 'KVKK / Gizlilik', 'İletişim', 'Giriş Yap'].map((label) => (
              <Link key={label} href="/login" className="hover:text-on-surface-variant transition-colors">
                {label}
              </Link>
            ))}
          </div>
          <p className="text-xs text-text-muted text-center">
            Üretilen çıktılar uzmanın kontrolü ve sorumluluğundadır.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── Alt bileşenler ─────────────────────────────────────────────────────────

function ToolCard({ tool, featured }: { tool: (typeof TOOLS)[number]; featured?: boolean }) {
  const isAktif = tool.status === 'aktif';

  const inner = (
    <div
      className={`bento flex flex-col h-full transition-all ${
        isAktif ? 'cursor-pointer hover:shadow-glow-accent' : 'opacity-60'
      } ${featured ? 'lg:col-span-2' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-2xl">{tool.icon}</span>
        <span
          className={`font-mono text-[10px] font-medium tracking-wider px-2 py-0.5 rounded-full border ${
            isAktif
              ? 'bg-primary/10 text-primary border-primary/20'
              : 'bg-on-surface/5 text-text-muted border-subtle'
          }`}
        >
          {isAktif ? 'Aktif' : 'Yakında'}
        </span>
      </div>
      <h3 className="font-geist font-medium text-sm text-on-surface mb-2">{tool.name}</h3>
      <p className="text-xs text-text-muted leading-[18px] flex-1">{tool.description}</p>

      {isAktif && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tool.etiketler.slice(0, 3).map((e) => (
            <span
              key={e}
              className="font-mono text-[10px] tracking-wider px-2 py-0.5 rounded
                         bg-surface-container text-text-muted"
            >
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  if (isAktif && tool.route) {
    return (
      <Link href={tool.route} className={featured ? 'lg:col-span-2' : ''}>
        {inner}
      </Link>
    );
  }
  return <div className={featured ? 'lg:col-span-2' : ''}>{inner}</div>;
}

// ── Statik veri ───────────────────────────────────────────────────────────

const VALUE_PROPS = [
  { title: 'Kopyala-yapıştır bitsin.', desc: 'Takyidat metnini elle düzenlemek rapor başına 15–20 dakika yutuyor. Yapıştır, dakikada rapora hazır metni al.' },
  { title: 'Format hatası kalmasın.', desc: 'Tarih, yevmiye, hane sırası ve cümle kalıpları standarda otomatik oturur. Denetimde takılma.' },
  { title: 'Veri güvende.', desc: 'Yüklenen belge cihazınızda işlenir, sunucuda saklanmaz. Müşteri ve taşınmaz verisi sizde kalır.' },
];

const HOW_IT_WORKS = [
  { title: 'Yükle', desc: 'PDF\'i sürükle veya seç. Toplu yükleme ve tek dosyada birden fazla belge desteklenir.' },
  { title: 'Ayrıştır', desc: 'Araç belgeyi cihazında okur, taşınmaz bilgileri ve takyidatları çıkarır.' },
  { title: 'Çıkar', desc: 'Rapora hazır Takyidat metnini kopyala ya da Word/Excel/TXT olarak indir.' },
];
