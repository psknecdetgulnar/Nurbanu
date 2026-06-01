import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

export const metadata = {
  title: 'Üyelik Onaylandı | Değerleme Araçları',
};

export default function ConfirmedPage() {
  return (
    <div className="min-h-screen bg-surface-base text-on-surface flex flex-col">

      {/* Navbar */}
      <nav className="sticky top-0 z-20 border-b border-subtle bg-surface-base/80 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-10 h-14 flex items-center justify-between">
          <Link href="/" className="font-geist font-semibold text-on-surface tracking-tight">
            Değerleme Araçları
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm glass border border-subtle rounded-xl shadow-overlay p-8 text-center">

          {/* Onay ikonu */}
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <p className="font-mono text-xs text-text-muted tracking-widest uppercase mb-3">
            E-Posta Doğrulandı
          </p>

          <h1 className="font-geist font-semibold text-xl text-on-surface mb-3">
            Üyeliğiniz Başarıyla Oluşturuldu
          </h1>

          <p className="text-sm text-text-muted leading-[22px] mb-8">
            Hesabınız aktif. Araçlara erişmek için giriş yapabilirsiniz.
          </p>

          <Link
            href="/login"
            className="inline-block w-full py-2.5 rounded-lg text-sm font-semibold bg-brand text-on-primary
                       hover:opacity-90 transition-opacity shadow-glow-primary text-center"
          >
            Giriş Yap
          </Link>

          <Link
            href="/"
            className="block mt-4 text-xs font-mono text-text-muted hover:text-on-surface transition-colors tracking-wider"
          >
            ← Ana Sayfa
          </Link>
        </div>
      </main>
    </div>
  );
}
