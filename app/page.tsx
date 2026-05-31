import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-24">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium mb-6">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            Belgeleriniz cihazınızdan çıkmaz, hiçbir yerde saklanmaz
          </div>

          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-5">
            TAKBIS Belgelerini<br />
            <span className="text-blue-600">Saniyede Excel'e</span> Çevirin
          </h1>

          <p className="text-xl text-gray-500 mb-10">
            Web Tapu'dan indirdiğiniz Tapu Kayıt Belgesi PDF'lerini yükleyin.
            Uygulama tamamen tarayıcınızda çalışır — hiçbir veri sunucuya gönderilmez.
          </p>

          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-10 py-3.5 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Başla — Ücretsiz
          </Link>
        </div>

        {/* Feature cards */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="border border-gray-100 rounded-xl p-6">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

const FEATURES = [
  {
    icon: '📄',
    title: 'Toplu PDF Yükleme',
    desc: 'Bir veya birden fazla TAKBIS PDF\'ini sürükle-bırak ile yükleyin. Tek dosyada birden fazla belge varsa otomatik ayrıştırılır.',
  },
  {
    icon: '🔒',
    title: 'Tamamen Tarayıcıda',
    desc: 'Metin çıkarma, parse ve Excel üretimi tarayıcınızda gerçekleşir. KVKK uyumlu: sunucuya hiçbir veri gönderilmez.',
  },
  {
    icon: '📊',
    title: 'Hazır Excel Çıktısı',
    desc: 'Özet, Mülkiyet, İpotek ve Şerh-Beyan sayfaları içeren çok sayfalı .xlsx dosyası. Sayısal alanlar rakam olarak.',
  },
];
