'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import ThemeToggle from '@/components/ThemeToggle';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    if (password !== confirm) {
      setError('Şifreler eşleşmiyor.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message === 'Auth session missing!'
          ? 'Oturum süresi dolmuş. Lütfen şifre sıfırlama işlemini tekrar başlatın.'
          : 'Bir hata oluştu. Lütfen tekrar deneyin.');
      } else {
        setSuccess(true);
        setTimeout(() => router.push('/araclar/takbis-okuyucu'), 2500);
      }
    } finally {
      setLoading(false);
    }
  };

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
        <div className="w-full max-w-sm glass border border-subtle rounded-xl shadow-overlay overflow-hidden">

          {success ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-geist font-semibold text-on-surface mb-2">Şifre Güncellendi</p>
              <p className="text-xs text-text-muted">Yeni şifrenizle giriş yapılıyor…</p>
            </div>
          ) : (
            <>
              <div className="px-6 pt-6 pb-2">
                <p className="text-xs font-mono text-text-muted tracking-widest uppercase mb-1">
                  Yeni Şifre
                </p>
                <p className="text-xs text-text-muted leading-[18px]">
                  Hesabınız için yeni bir şifre belirleyin.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
                <div>
                  <label className="block text-xs font-mono text-text-muted tracking-wider mb-1.5">
                    YENİ ŞİFRE
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="En az 6 karakter"
                    className="w-full px-3 py-2.5 rounded-lg text-sm bg-surface-overlay border border-subtle
                               text-on-surface placeholder:text-text-muted
                               focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30
                               transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-text-muted tracking-wider mb-1.5">
                    ŞİFRE TEKRAR
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="Şifreyi tekrar girin"
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold bg-brand text-on-primary
                             hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed
                             shadow-glow-primary mt-2"
                >
                  {loading ? 'Kaydediliyor…' : 'Şifreyi Kaydet'}
                </button>

                <Link
                  href="/login"
                  className="block text-center text-xs font-mono text-text-muted hover:text-on-surface transition-colors tracking-wider pt-1"
                >
                  ← Giriş Yap
                </Link>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
