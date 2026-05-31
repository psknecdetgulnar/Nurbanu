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
        if (err) {
          setError(mapError(err.message));
        } else {
          router.push('/app');
          router.refresh();
        }
      } else {
        const { error: err, data } = await signUp(email, password);
        if (err) {
          setError(mapError(err.message));
        } else if (data.user && !data.session) {
          // E-mail confirmation is enabled in Supabase
          setInfo('Kayıt başarılı! Lütfen e-posta adresinize gelen doğrulama bağlantısına tıklayın.');
        } else {
          router.push('/app');
          router.refresh();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
    setInfo('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
            TAKBIS Okuyucu
          </Link>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login' ? 'Hesabınıza giriş yapın' : 'Ücretsiz hesap oluşturun'}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mode === 'register'
                  ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Kayıt Ol
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="ornek@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="En az 6 karakter"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {info && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'İşleniyor…' : mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Belgeleriniz cihazınızdan çıkmaz, hiçbir yerde saklanmaz.
        </p>
      </div>
    </div>
  );
}

function mapError(message: string): string {
  if (/Invalid login credentials/i.test(message)) return 'E-posta veya şifre hatalı.';
  if (/Email not confirmed/i.test(message)) return 'E-posta adresinizi doğrulamanız gerekiyor.';
  if (/User already registered/i.test(message)) return 'Bu e-posta adresi zaten kayıtlı.';
  if (/Password should be at least/i.test(message)) return 'Şifre en az 6 karakter olmalıdır.';
  if (/rate.?limit/i.test(message)) return 'Çok fazla istek. Lütfen biraz bekleyin.';
  if (/network/i.test(message)) return 'Ağ hatası. İnternet bağlantınızı kontrol edin.';
  return 'Bir hata oluştu. Lütfen tekrar deneyin.';
}
