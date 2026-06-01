import Link from 'next/link';

export const metadata = {
  title: 'Çerez Politikası | Değerleme Araçları',
  description: 'Platform tarafından kullanılan çerezler ve kullanım amaçları hakkında bilgi.',
};

export default function CerezPolitikasiPage() {
  return (
    <div className="min-h-screen bg-surface-base text-on-surface">
      <nav className="sticky top-0 z-20 border-b border-subtle bg-surface-base/80 backdrop-blur-xl">
        <div className="max-w-[900px] mx-auto px-10 h-14 flex items-center justify-between">
          <Link href="/" className="font-geist font-semibold text-on-surface tracking-tight">
            Değerleme Araçları
          </Link>
          <Link
            href="/login"
            className="text-sm px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-medium
                       hover:opacity-90 transition-opacity shadow-glow-primary"
          >
            Giriş Yap
          </Link>
        </div>
      </nav>

      <main className="max-w-[900px] mx-auto px-10 py-16">
        <p className="font-mono text-xs text-text-muted tracking-widest uppercase mb-4">
          Hukuki Bilgilendirme
        </p>
        <h1 className="font-geist font-semibold text-3xl tracking-[-0.02em] text-on-surface mb-3">
          Çerez Politikası
        </h1>
        <p className="text-xs font-mono text-text-muted mb-12">
          Son güncellenme: 1 Haziran 2025
        </p>

        <div className="space-y-10 text-sm text-on-surface-variant leading-[22px]">

          <Section title="1. Çerez Nedir?">
            <p>
              Çerezler, ziyaret ettiğiniz web sitesi tarafından tarayıcınıza yerleştirilen küçük metin
              dosyalarıdır. Oturum yönetimi, güvenlik ve kullanıcı tercihlerinin hatırlanması gibi
              temel işlevler için kullanılırlar.
            </p>
          </Section>

          <Section title="2. Kullandığımız Çerezler">
            <p>Platform yalnızca <strong className="text-on-surface">zorunlu teknik çerezler</strong> kullanmaktadır:</p>
            <div className="mt-4 rounded-lg border border-subtle overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-surface-container">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-on-surface">Çerez Adı</th>
                    <th className="text-left px-4 py-3 font-medium text-on-surface">Amaç</th>
                    <th className="text-left px-4 py-3 font-medium text-on-surface">Süre</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  <tr>
                    <td className="px-4 py-3 font-mono">sb-access-token</td>
                    <td className="px-4 py-3">Oturum kimlik doğrulama (Supabase)</td>
                    <td className="px-4 py-3">Oturum süresi</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono">sb-refresh-token</td>
                    <td className="px-4 py-3">Oturum yenileme (Supabase)</td>
                    <td className="px-4 py-3">7 gün</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="3. Kullanılmayan Çerez Türleri">
            <p>Platformda şu çerez türleri <strong className="text-on-surface">kesinlikle kullanılmamaktadır</strong>:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
              <li>Reklam veya yeniden pazarlama çerezleri</li>
              <li>Sosyal medya izleme çerezleri</li>
              <li>Üçüncü taraf analitik çerezleri (Google Analytics vb.)</li>
              <li>Davranışsal profil oluşturma çerezleri</li>
            </ul>
          </Section>

          <Section title="4. Çerezleri Kontrol Etme">
            <p>
              Tarayıcınızın ayarlar menüsünden mevcut çerezleri görüntüleyebilir, silebilir veya
              yeni çerezlerin yerleştirilmesini engelleyebilirsiniz. Zorunlu oturum çerezleri
              devre dışı bırakılırsa platforma giriş yapılamaz.
            </p>
            <p className="mt-2">
              Yaygın tarayıcılar için çerez yönetimi:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-1 ml-2">
              <li>Chrome: Ayarlar → Gizlilik ve Güvenlik → Çerezler</li>
              <li>Firefox: Ayarlar → Gizlilik ve Güvenlik → Çerezler ve Site Verileri</li>
              <li>Safari: Tercihler → Gizlilik → Çerezleri Yönet</li>
              <li>Edge: Ayarlar → Çerezler ve Site İzinleri</li>
            </ul>
          </Section>

          <Section title="5. Güncellemeler">
            <p>
              Bu politika zaman zaman güncellenebilir. Değişiklikler bu sayfada yayımlanır.
              Sorularınız için{' '}
              <a href="mailto:psknecdetgulnar@gmail.com" className="text-primary hover:underline">
                psknecdetgulnar@gmail.com
              </a>{' '}
              adresine ulaşabilirsiniz.
            </p>
          </Section>

        </div>

        <div className="mt-16 pt-8 border-t border-subtle flex items-center justify-between flex-wrap gap-4">
          <Link href="/" className="text-xs font-mono text-text-muted hover:text-on-surface transition-colors tracking-wider">
            ← ANA SAYFA
          </Link>
          <p className="text-xs text-text-muted font-mono">
            İletişim:{' '}
            <a href="mailto:psknecdetgulnar@gmail.com" className="text-primary hover:underline">
              psknecdetgulnar@gmail.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-geist font-semibold text-base text-on-surface mb-3">{title}</h2>
      <div className="text-sm text-on-surface-variant leading-[22px] space-y-2">{children}</div>
    </div>
  );
}
