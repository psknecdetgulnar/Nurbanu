import Link from 'next/link';

/** Public navbar shown on the landing page. */
export default function Navbar() {
  return (
    <nav className="border-b border-gray-100 bg-white sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
          TAKBIS Okuyucu
        </Link>
        <Link
          href="/login"
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Giriş Yap
        </Link>
      </div>
    </nav>
  );
}
