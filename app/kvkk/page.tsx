import Link from 'next/link';

export const metadata = {
  title: 'KVKK ve Gizlilik Politikası | Değerleme Araçları',
  description: 'Kişisel verilerin korunması ve gizlilik politikası hakkında bilgi.',
};

export default function KvkkPage() {
  return (
    <div className="min-h-screen bg-surface-base text-on-surface">

      {/* ── Navbar ───────────────────────────────────────────────────── */}
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
          KVKK ve Gizlilik Politikası
        </h1>
        <p className="text-xs font-mono text-text-muted mb-12">
          Son güncellenme: 1 Haziran 2025
        </p>

        <div className="space-y-10 text-sm text-on-surface-variant leading-[22px]">

          <Section title="1. Veri Sorumlusu">
            <p>
              Bu platform, gayrimenkul değerleme uzmanlarına yönelik araçlar sunan bireysel bir girişim
              olarak işletilmektedir. KVKK kapsamında veri sorumlusu sıfatıyla iletişim adresi:
              <span className="text-on-surface font-medium"> psknecdetgulnar@gmail.com</span>
            </p>
          </Section>

          <Section title="2. İşlenen Kişisel Veriler">
            <p>Platform üzerinden aşağıdaki veriler işlenebilir:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
              <li>Hesap oluşturma ve oturum açma sırasında e-posta adresi</li>
              <li>Oturum yönetimi için anonim oturum tanımlayıcıları</li>
              <li>Sistem güvenliği ve hizmet kalitesi için anonim kullanım istatistikleri (işlem sayısı)</li>
            </ul>
          </Section>

          <Section title="3. Yüklenen Belgeler ve Yerel İşleme">
            <p>
              Platforma yüklediğiniz PDF belgeler <strong className="text-on-surface">yalnızca tarayıcınızda işlenir</strong>.
              Belge içeriği, malik bilgileri, tapu ve takyidat verileri hiçbir sunucuya gönderilmez,
              hiçbir veri tabanında saklanmaz. İşlem tamamlandığında belge hafızadan silinir.
            </p>
            <p className="mt-2">
              Bu yaklaşım, KVKK&apos;nın veri minimizasyonu ilkesiyle birebir uyumludur: işlenmesi
              gerekmeyen kişisel veri toplanmamaktadır.
            </p>
          </Section>

          <Section title="4. Kişisel Verilerin İşlenme Amaçları">
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Kullanıcı kimlik doğrulama ve hesap güvenliği</li>
              <li>Yetkisiz erişimin önlenmesi</li>
              <li>Hizmetin sunulması ve teknik destek</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi</li>
            </ul>
          </Section>

          <Section title="5. Hukuki Dayanak">
            <p>
              Kişisel verileriniz; 6698 sayılı Kişisel Verilerin Korunması Kanunu&apos;nun 5. maddesi
              uyarınca <em>sözleşmenin ifası</em> ve <em>meşru menfaat</em> hukuki sebeplerine
              dayanılarak işlenmektedir.
            </p>
          </Section>

          <Section title="6. Üçüncü Taraflarla Paylaşım">
            <p>
              Kişisel verileriniz; yasal zorunluluk olmadıkça üçüncü taraflarla paylaşılmaz, satılmaz
              veya kiralanmaz. Altyapı hizmetleri için Supabase (kimlik doğrulama ve oturum yönetimi)
              kullanılmaktadır. Supabase&apos;in GDPR/KVKK uyumlu veri işleme sözleşmesi mevcuttur.
            </p>
          </Section>

          <Section title="7. Çerezler (Cookies)">
            <p>
              Platform yalnızca oturum yönetimi için zorunlu kimlik doğrulama çerezleri kullanmaktadır.
              Reklam, izleme veya analitik amaçlı üçüncü taraf çerezi kullanılmamaktadır.
            </p>
          </Section>

          <Section title="8. Veri Saklama Süresi">
            <p>
              E-posta adresiniz ve oturum bilgileri, hesabınız aktif olduğu sürece saklanır. Hesabınızı
              kapatmanız durumunda verileriniz 30 gün içinde silinir.
            </p>
          </Section>

          <Section title="9. Haklarınız">
            <p>KVKK&apos;nın 11. maddesi kapsamında aşağıdaki haklara sahipsiniz:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
              <li>İşlenmişse buna ilişkin bilgi talep etme</li>
              <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
              <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
              <li>Eksik veya yanlış işlenmiş olması hâlinde düzeltilmesini isteme</li>
              <li>Silinmesini veya yok edilmesini isteme</li>
              <li>İşlenmesine itiraz etme</li>
            </ul>
            <p className="mt-3">
              Bu haklarınızı kullanmak için{' '}
              <a
                href="mailto:psknecdetgulnar@gmail.com"
                className="text-primary hover:underline"
              >
                psknecdetgulnar@gmail.com
              </a>{' '}
              adresine e-posta gönderebilirsiniz. Başvurular en geç 30 gün içinde yanıtlanır.
            </p>
          </Section>

          <Section title="10. Politika Güncellemeleri">
            <p>
              Bu politika gerektiğinde güncellenebilir. Önemli değişiklikler kayıtlı e-posta
              adresinize bildirilir. Güncel politika her zaman bu sayfada yayımlanır.
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
