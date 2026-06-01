import Link from 'next/link';

export const metadata = {
  title: 'Mesafeli Satış Sözleşmesi | Değerleme Araçları',
  description: 'Platform abonelik hizmetine ilişkin mesafeli satış sözleşmesi.',
};

export default function MesafeliSatisSozlesmesiPage() {
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
          Mesafeli Satış Sözleşmesi
        </h1>
        <p className="text-xs font-mono text-text-muted mb-12">
          Son güncellenme: 1 Haziran 2025
        </p>

        <div className="space-y-10 text-sm text-on-surface-variant leading-[22px]">

          <Section title="1. Taraflar">
            <p>
              <strong className="text-on-surface">Satıcı:</strong> Değerleme Araçları platformunu işleten kişi veya kuruluş.
              İletişim: <a href="mailto:psknecdetgulnar@gmail.com" className="text-primary hover:underline">psknecdetgulnar@gmail.com</a>
            </p>
            <p className="mt-2">
              <strong className="text-on-surface">Alıcı:</strong> Platform üzerinden abonelik satın alan ve hesap oluşturan gerçek veya tüzel kişi.
            </p>
          </Section>

          <Section title="2. Sözleşmenin Konusu">
            <p>
              Bu sözleşme; Değerleme Araçları platformunda sunulan dijital araçlara erişim aboneliğinin
              satışına ve teslimatına ilişkin karşılıklı hak ve yükümlülükleri düzenler. Sözleşme,
              6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği
              hükümleri çerçevesinde akdedilmektedir.
            </p>
          </Section>

          <Section title="3. Hizmet Tanımı">
            <p>Abonelik kapsamında sunulan dijital hizmetler:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 ml-2">
              <li>TAKBIS / Tapu Kayıt Belgesi Okuyucu aracına sınırsız erişim</li>
              <li>Platforma ileride eklenecek tüm araçlara aynı abonelik dahilinde erişim</li>
              <li>Takyidat metni ve tam rapor çıktısı (TXT, Word, Excel formatları)</li>
              <li>Teknik destek (e-posta)</li>
            </ul>
          </Section>

          <Section title="4. Fiyat ve Ödeme">
            <p>
              Abonelik ücreti, satın alma sırasında ekranda açıkça gösterilir. Tüm fiyatlar Türk
              Lirası (TL) cinsinden KDV dahil olarak belirtilir. Ödeme; kredi kartı veya banka
              kartı aracılığıyla güvenli ödeme altyapısı üzerinden gerçekleştirilir. Abonelik
              bedeli seçilen plana göre aylık veya yıllık olarak tahsil edilir.
            </p>
          </Section>

          <Section title="5. Teslimat">
            <p>
              Hizmet dijital nitelikte olup ödeme onayının ardından derhal etkinleştirilir. Fiziksel
              bir teslimat söz konusu değildir. Hesap aktivasyonu e-posta ile bildirilir.
            </p>
          </Section>

          <Section title="6. Abonelik Yenileme ve İptali">
            <p>
              Abonelikler, iptal edilmediği sürece dönem sonunda otomatik olarak yenilenir. İptal
              işlemi hesap ayarları üzerinden veya e-posta yoluyla mevcut dönem bitmeden yapılabilir.
              İptal sonrası mevcut dönem süresince hizmetten yararlanmaya devam edilir; bir sonraki
              dönem için ücret alınmaz. Ayrıntılar için{' '}
              <Link href="/iptal-ve-iade" className="text-primary hover:underline">
                İptal ve İade Politikası
              </Link>
              &apos;na bakınız.
            </p>
          </Section>

          <Section title="7. Cayma Hakkı">
            <p>
              Tüketici, dijital içeriklere ilişkin mesafeli sözleşmelerde 6502 sayılı Kanun&apos;un
              49. maddesi uyarınca 14 gün içinde cayma hakkına sahiptir. Ancak, alıcının onayıyla
              hizmetin cayma süresi dolmadan ifasına başlanmış olması hâlinde cayma hakkı
              kullanılamaz. Abonelik aktivasyonu bu onayı içermektedir.
            </p>
          </Section>

          <Section title="8. Uyuşmazlık Çözümü">
            <p>
              Taraflar arasında doğabilecek uyuşmazlıklarda öncelikle doğrudan iletişim yoluyla
              çözüm aranır. Çözüme kavuşturulamayan uyuşmazlıklar için Tüketici Hakem Heyetleri
              ve Tüketici Mahkemeleri yetkilidir. Yetkili yer, satıcının kayıtlı bulunduğu il
              mahkemeleri ve icra daireleridir.
            </p>
          </Section>

          <Section title="9. Yürürlük">
            <p>
              Bu sözleşme, alıcının abonelik satın alma işlemini tamamlaması ile birlikte her iki
              taraf açısından bağlayıcı hale gelir. Sözleşmenin bir nüshası kayıtlı e-posta
              adresine gönderilir.
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
