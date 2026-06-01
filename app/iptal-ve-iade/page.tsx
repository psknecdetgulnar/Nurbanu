import Link from 'next/link';

export const metadata = {
  title: 'İptal ve İade Politikası | Değerleme Araçları',
  description: 'Abonelik iptali ve iade koşulları hakkında bilgi.',
};

export default function IptalVeIadePage() {
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
          İptal ve İade Politikası
        </h1>
        <p className="text-xs font-mono text-text-muted mb-12">
          Son güncellenme: 1 Haziran 2025
        </p>

        <div className="space-y-10 text-sm text-on-surface-variant leading-[22px]">

          <Section title="1. Abonelik İptali">
            <p>
              Aboneliğinizi dilediğiniz zaman iptal edebilirsiniz. İptal işlemi;
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
              <li>Hesap ayarları sayfasından kendiniz yapabilirsiniz, veya</li>
              <li>
                <a href="mailto:psknecdetgulnar@gmail.com" className="text-primary hover:underline">
                  psknecdetgulnar@gmail.com
                </a>{' '}
                adresine e-posta göndererek talep edebilirsiniz.
              </li>
            </ul>
            <p className="mt-2">
              İptal talebinin mevcut fatura döneminin bitmesinden önce iletilmesi gerekir. İptal
              onayı e-posta ile bildirilir.
            </p>
          </Section>

          <Section title="2. İptal Sonrası Erişim">
            <p>
              Aboneliğinizi iptal ettiğinizde mevcut ödeme döneminin sonuna kadar tüm araçlara
              erişiminiz devam eder. Dönem bitiminde hesabınız otomatik olarak devre dışı kalır;
              bir sonraki dönem için herhangi bir ücret tahsil edilmez.
            </p>
          </Section>

          <Section title="3. İade Koşulları">
            <p>
              Dijital hizmet niteliği gereği aşağıdaki koşullar geçerlidir:
            </p>

            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-subtle p-4 bg-surface-container">
                <p className="font-medium text-on-surface text-xs mb-1">Aylık Abonelik</p>
                <p>
                  Aylık abonelik ödemelerinde iade yapılmamaktadır. Aboneliği iptal ettiğinizde
                  mevcut dönem sonuna kadar hizmetten yararlanmaya devam edersiniz.
                </p>
              </div>
              <div className="rounded-lg border border-subtle p-4 bg-surface-container">
                <p className="font-medium text-on-surface text-xs mb-1">Yıllık Abonelik</p>
                <p>
                  Yıllık abonelik satın alımından itibaren <strong className="text-on-surface">14 gün</strong> içinde
                  iptal talebinde bulunulması durumunda, hizmetin kullanılmamış olması koşuluyla
                  tam iade yapılır. 14 günlük süre geçtikten sonra kısmi iade değerlendirmesi için
                  destek ekibiyle iletişime geçilmesi gerekmektedir.
                </p>
              </div>
              <div className="rounded-lg border border-subtle p-4 bg-surface-container">
                <p className="font-medium text-on-surface text-xs mb-1">Teknik Arıza</p>
                <p>
                  Platformdan kaynaklanan teknik bir nedenle hizmet kullanılamaz hale gelirse,
                  kesinti süresine orantılı iade veya abonelik uzatması uygulanır.
                </p>
              </div>
            </div>
          </Section>

          <Section title="4. İade Süreci">
            <p>
              İade talepleri{' '}
              <a href="mailto:psknecdetgulnar@gmail.com" className="text-primary hover:underline">
                psknecdetgulnar@gmail.com
              </a>{' '}
              adresine iletilmelidir. E-postanızda hesap e-posta adresinizi ve iade gerekçenizi
              belirtiniz. Talepler en geç <strong className="text-on-surface">5 iş günü</strong> içinde
              değerlendirilir; onaylanan iadeler ödeme yönteminize 7–14 iş günü içinde yansıtılır.
            </p>
          </Section>

          <Section title="5. Cayma Hakkı">
            <p>
              6502 sayılı Tüketicinin Korunması Hakkında Kanun uyarınca tüketiciler, mesafeli
              sözleşmelerde 14 günlük cayma hakkına sahiptir. Dijital hizmetlerde, tüketicinin
              hizmetin cayma süresi dolmadan ifasına başlanmasını açıkça onaylaması durumunda
              cayma hakkı sona erer. Abonelik aktivasyonu bu onayı içerir; dolayısıyla hizmet
              aktif kullanıma geçildikten sonra cayma hakkı kullanılamaz.
            </p>
          </Section>

          <Section title="6. İletişim">
            <p>
              Bu politikayla ilgili sorularınız için{' '}
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
