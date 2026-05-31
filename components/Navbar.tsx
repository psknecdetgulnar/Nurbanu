import Link from 'next/link';

/** Public navbar — artık anasayfa içinde inline nav kullanılıyor; bu dosya legacy bileşen. */
export default function Navbar() {
  return (
    <nav className="border-b border-gray-100 bg-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
          Değerleme Araçları
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/#araclar" className="text-sm text-gray-500 hover:text-gray-900 hidden sm:block">
            Araçlar
          </Link>
          <Link
            href="/login"
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Giriş Yap
          </Link>
        </div>
      </div>
    </nav>
  );
}
