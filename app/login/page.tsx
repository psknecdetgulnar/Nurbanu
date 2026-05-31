'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, signUp } from '@/lib/auth';

type Mode = 'login' | 'register';

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
      } else {
        const { error: err, data } = await signUp(email, password);
        if (err) setError(mapError(err.message));
        else if (data.user && !data.session)
          setInfo('Kayıt başarılı! E-posta adresinize gelen doğrulama bağlantısına tıklayın.');
        else { router.push('/araclar/takbis-okuyucu'); router.refresh(); }
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => { setMode(next); setError(''); setInfo(''); };

  return (
    <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <Link
        href="/"
        className="font-geist font-semibold text-lg text-on-surface hover:text-primary transition-colors mb-8"
      >
        Değerleme Araçları
      </Link>

      {/* Card — glassmorphism */}
      <div className="w-full max-w-sm glass border border-subtle rounded-xl shadow-overlay overflow-hidden">

        {/* Tab switcher */}
        <div className="flex border-b border-subtle">
          {(['login', 'register'] as Mode[]).map((m) => (
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
            <label className="block text-xs font-mono text-text-muted tracking-wider mb-1.5">
              ŞİFRE
            </label>
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

          {error && (
            <div className="bg-error-container/30 border border-error/20 text-error px-3 py-2.5 rounded-lg text-xs">
              {error}
            </div>
          )}
          {info && (
            <div className="bg-primary/10 border border-primary/20 text-primary px-3 py-2.5 rounded-lg text-xs">
              {info}
            </div>
          )}

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
      </div>

      <p className="mt-6 text-xs text-text-muted text-center max-w-xs">
        Belgeleriniz cihazınızdan çıkmaz, hiçbir yerde saklanmaz.
      </p>
    </div>
  );
}

function mapError(message: string): string {
  if (/Invalid login credentials/i.test(message)) return 'E-posta veya şifre hatalı.';
  if (/Email not confirmed/i.test(message))        return 'E-posta adresinizi doğrulamanız gerekiyor.';
  if (/User already registered/i.test(message))    return 'Bu e-posta adresi zaten kayıtlı.';
  if (/Password should be at least/i.test(message))return 'Şifre en az 6 karakter olmalıdır.';
  if (/rate.?limit/i.test(message))                return 'Çok fazla istek. Lütfen biraz bekleyin.';
  return 'Bir hata oluştu. Lütfen tekrar deneyin.';
}
