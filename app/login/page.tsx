'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, signUp, resetPassword } from '@/lib/auth';
import ThemeToggle from '@/components/ThemeToggle';

type Mode = 'login' | 'register' | 'forgot';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      if (mode === 'login') {
        const { error: err } = await signIn(email, password);
        if (err) setError(mapError(err.message));
        else { router.push('/araclar/takbis-okuyucu'); router.refresh(); }

      } else if (mode === 'register') {
        const { error: err, data } = await signUp(email, password);
        if (err) setError(mapError(err.message));
        else if (data.user && !data.session)
          setInfo('Kayıt başarılı! E-posta adresinize gelen doğrulama bağlantısına tıklayın.');
        else { router.push('/araclar/takbis-okuyucu'); router.refresh(); }

      } else {
        const { error: err } = await resetPassword(email);
        if (err) setError(mapError(err.message));
        else setInfo('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => { setMode(next); setError(''); setInfo(''); };

  return (
    <div className="min-h-screen bg-surface-base text-on-surface flex flex-col">

      {/* ── Navbar (Task 3: sabit üstte) ──────────────────────────────── */}
      <nav className="sticky top-0 z-20 border-b border-subtle bg-surface-base/80 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-10 h-14 flex items-center justify-between">
          <Link href="/" className="font-geist font-semibold text-on-surface tracking-tight">
            Değerleme Araçları
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* ── Centered card ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">

        {/* Card — glassmorphism */}
        <div className="w-full max-w-sm glass border border-subtle rounded-xl shadow-overlay overflow-hidden">

          {mode !== 'forgot' ? (
            <>
              {/* Tab switcher */}
              <div className="flex border-b border-subtle">
                {(['login', 'register'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`flex-1 py-3 text-xs font-mono font-medium tracking-wider uppercase transition-colors ${
                      mode === m
                        ? 'text-primary border-b-2 border-primary -mb-px'
                        : 'text-text-muted hover:text-on-surface-variant'
                    }`}
                  >
                    {m === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-mono text-text-muted tracking-wider mb-1.5">
                    E-POSTA
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="ornek@email.com"
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-surface-overlay border border-subtle
                               text-on-surface placeholder:text-text-muted
                               focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30
                               transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-mono text-text-muted tracking-wider">
                      ŞİFRE
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-xs font-mono text-text-muted hover:text-primary transition-colors tracking-wide"
                      >
                        Şifremi Unuttum
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="En az 6 karakter"
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-surface-overlay border border-subtle
                               text-on-surface placeholder:text-text-muted
                               focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30
                               transition-colors"
                  />
                </div>

                {error && <ErrorBanner>{error}</ErrorBanner>}
                {info  && <InfoBanner>{info}</InfoBanner>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-brand text-on-primary
                             hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed
                             shadow-glow-primary mt-2"
                >
                  {loading ? 'İşleniyor…' : mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
                </button>
              </form>
            </>
          ) : (
            /* ── Şifremi Unuttum ekranı ─────────────────────────────── */
            <div className="p-6">
              <div className="mb-5">
                <p className="text-xs font-mono text-text-muted tracking-widest uppercase mb-1">
                  Şifre Sıfırlama
                </p>
                <p className="text-xs text-text-muted leading-[18px]">
                  Kayıtlı e-posta adresinizi girin; sıfırlama bağlantısını gönderelim.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-text-muted tracking-wider mb-1.5">
                    E-POSTA
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="ornek@email.com"
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-surface-overlay border border-subtle
                               text-on-surface placeholder:text-text-muted
                               focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30
                               transition-colors"
                  />
                </div>

                {error && <ErrorBanner>{error}</ErrorBanner>}
                {info  && <InfoBanner>{info}</InfoBanner>}

                <button
                  type="submit"
                  disabled={loading || !!info}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-brand text-on-primary
                             hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed
                             shadow-glow-primary"
                >
                  {loading ? 'Gönderiliyor…' : 'Sıfırlama Linki Gönder'}
                </button>

                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="w-full py-2 text-xs font-mono text-text-muted hover:text-on-surface transition-colors tracking-wider"
                >
                  ← Giriş Yap
                </button>
              </form>
            </div>
          )}
        </div>

        <p className="mt-6 text-xs text-text-muted text-center max-w-xs">
          Belgeleriniz cihazınızdan çıkmaz, hiçbir yerde saklanmaz.
        </p>
      </main>
    </div>
  );
}

// ── Yardımcı bileşenler ────────────────────────────────────────────────────

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-error-container/30 border border-error/20 text-error px-3 py-2.5 rounded-lg text-xs">
      {children}
    </div>
  );
}

function InfoBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-primary/10 border border-primary/20 text-primary px-3 py-2.5 rounded-lg text-xs">
      {children}
    </div>
  );
}

function mapError(message: string): string {
  if (/Invalid login credentials/i.test(message))  return 'E-posta veya şifre hatalı.';
  if (/Email not confirmed/i.test(message))         return 'E-posta adresinizi doğrulamanız gerekiyor.';
  if (/User already registered/i.test(message))    return 'Bu e-posta adresi zaten kayıtlı.';
  if (/Password should be at least/i.test(message))return 'Şifre en az 6 karakter olmalıdır.';
  if (/rate.?limit/i.test(message))                return 'Çok fazla istek. Lütfen biraz bekleyin.';
  return 'Bir hata oluştu. Lütfen tekrar deneyin.';
}
