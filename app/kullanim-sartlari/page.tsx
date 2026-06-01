import Link from 'next/link';

export const metadata = {
  title: 'Kullanım Şartları | Değerleme Araçları',
  description: 'Platform kullanım koşulları, kullanıcı sorumlulukları ve hizmet sınırlamaları.',
};

export default function KullanimSartlariPage() {
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
          Kullanım Şartları
        </h1>
        <p className="text-xs font-mono text-text-muted mb-12">
          Son güncellenme: 1 Haziran 2025
        </p>

        <div className="space-y-10 text-sm text-on-surface-variant leading-[22px]">

          <Section title="1. Kabul">
            <p>
              Bu platformu kullanarak aşağıdaki kullanım şartlarını okuduğunuzu, anladığınızı ve
              kabul ettiğinizi beyan edersiniz. Şartları kabul etmiyorsanız platformu
              kullanmayınız.
            </p>
          </Section>

          <Section title="2. Hizmetin Tanımı">
            <p>
              Değerleme Araçları; gayrimenkul değerleme uzmanlarına yönelik dijital araçlar sunan
              bir yazılım platformudur. Sunulan araçlar; TAKBIS/tapu belgelerinin ayrıştırılması,
              takyidat metni üretimi ve rapor çıktısı almayı kapsamaktadır.
            </p>
          </Section>

          <Section title="3. Kullanıcı Hesabı">
            <p>Platforma erişim için hesap oluşturulması zorunludur. Kullanıcı;</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
              <li>Hesap bilgilerinin doğruluğundan ve güncelliğinden sorumludur.</li>
              <li>Hesap şifresinin gizliliğini korumakla yükümlüdür.</li>
              <li>Hesabıyla gerçekleştirilen tüm işlemlerden sorumludur.</li>
              <li>Hesabın yetkisiz kullanımını derhal bildirmelidir.</li>
            </ul>
          </Section>

          <Section title="4. İzin Verilen Kullanım">
            <p>Platform yalnızca aşağıdaki amaçlarla kullanılabilir:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
              <li>Gayrimenkul değerleme raporlarının hazırlanması</li>
              <li>Tapu ve TAKBIS belgelerinin mesleki amaçlarla analizi</li>
              <li>Bireysel veya kurumsal mesleki faaliyetler kapsamında kişisel kullanım</li>
            </ul>
          </Section>

          <Section title="5. Yasak Kullanımlar">
            <p>Aşağıdaki eylemler kesinlikle yasaktır:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
              <li>Platformun otomatik araçlarla (bot, crawler vb.) toplu kullanımı</li>
              <li>Üçüncü taraflara hesap bilgilerinin devredilmesi veya hesabın paylaşılması</li>
              <li>Hizmetin ticari olarak yeniden satışı veya alt lisanslanması</li>
              <li>Platformun kaynak kodunun tersine mühendislik yoluyla çözümlenmesi</li>
              <li>Platformun güvenlik altyapısını zayıflatacak eylemlerde bulunulması</li>
              <li>Üçüncü kişilere ait tapu veya kişisel bilgilerin rızasız işlenmesi</li>
            </ul>
          </Section>

          <Section title="6. Çıktıların Sorumluluğu">
            <p>
              Platform tarafından üretilen takyidat metinleri, raporlar ve diğer çıktılar;
              uzmanın kontrolü ve sorumluluğu altında kullanılmalıdır. Otomatik ayrıştırma
              sürecinde oluşabilecek hatalardan doğan zararlardan platform sorumlu tutulamaz.
              Nihai rapor her zaman kullanıcı tarafından doğrulanmalıdır.
            </p>
          </Section>

          <Section title="7. Fikri Mülkiyet">
            <p>
              Platformun tasarımı, kaynak kodu, algoritmaları ve içeriği fikri mülkiyet
              mevzuatı kapsamında korunmaktadır. Kullanıcılar; platformun herhangi bir bölümünü
              kopyalayamaz, değiştiremez, dağıtamaz veya türev çalışmalar oluşturamaz.
            </p>
            <p className="mt-2">
              Kullanıcıların platforma yüklediği belgeler kullanıcıya aittir; platform bu
              belgeleri üçüncü taraflarla paylaşmaz ve ticari amaçla kullanmaz.
            </p>
          </Section>

          <Section title="8. Hizmet Sürekliliği">
            <p>
              Platform, makul teknik önlemlerle kesintisiz hizmet sunmayı hedefler; ancak
              bakım, güncelleme veya öngörülemeyen teknik nedenlerle geçici kesintiler
              yaşanabilir. Planlı bakım çalışmaları önceden duyurulur.
            </p>
          </Section>

          <Section title="9. Şartların Değiştirilmesi">
            <p>
              Bu kullanım şartları önceden bildirim yapılmaksızın güncellenebilir. Önemli
              değişiklikler kayıtlı e-posta adresinize bildirilir. Değişiklik sonrası platformu
              kullanmaya devam etmeniz yeni şartları kabul ettiğiniz anlamına gelir.
            </p>
          </Section>

          <Section title="10. Hesap Askıya Alma ve Kapatma">
            <p>
              Bu şartları ihlal eden hesaplar uyarısız askıya alınabilir veya kapatılabilir.
              İhlal tespiti hâlinde kalan abonelik bedeli iade edilmez. Hesap kapatma kararına
              itiraz için{' '}
              <a href="mailto:psknecdetgulnar@gmail.com" className="text-primary hover:underline">
                psknecdetgulnar@gmail.com
              </a>{' '}
              adresine başvurabilirsiniz.
            </p>
          </Section>

          <Section title="11. Sorumluluk Sınırlaması">
            <p>
              Platform, kullanıcının üretilen çıktılara dayanarak verdiği kararlardan, sözleşmesel
              ilişkilerden veya üçüncü taraflara karşı üstlendiği yükümlülüklerden kaynaklanan
              dolaylı, arızi veya sonuçsal zararlardan sorumlu değildir. Platformun azami sorumluluğu,
              kullanıcının son 3 ay içinde ödediği abonelik bedeli ile sınırlıdır.
            </p>
          </Section>

          <Section title="12. Uygulanacak Hukuk">
            <p>
              Bu kullanım şartları Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıkların çözümünde
              Türk mahkemeleri ve icra daireleri yetkilidir.
            </p>
          </Section>

          <Section title="13. İletişim">
            <p>
              Kullanım şartlarına ilişkin sorularınız için{' '}
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
