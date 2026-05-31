/**
 * Araç kayıt defteri — yeni araç = sadece bu dosyaya kayıt.
 * Anasayfa grid ve her türlü araç listeleme buradan beslenir.
 */
export interface ToolConfig {
  slug: string;
  name: string;
  description: string;
  status: 'aktif' | 'yakinda';
  route?: string;        // sadece aktif araçlarda
  icon: string;          // emoji veya ikon slug
  etiketler: string[];   // özellik etiketleri
}

export const TOOLS: ToolConfig[] = [
  {
    slug: 'takbis-okuyucu',
    name: 'TAKBIS Okuyucu',
    description:
      'Web Tapu PDF\'ini yükleyin; taşınmaz bilgileri, malik, beyan, şerh ve ipotek kayıtları otomatik ayrıştırılsın. İki çıktı modu: rapora yapıştırılabilir Takyidat metni ve detaylı Tam Rapor.',
    status: 'aktif',
    route: '/araclar/takbis-okuyucu',
    icon: '📄',
    etiketler: ['PDF → metin', 'Takyidat & Tam Rapor', 'Excel / TXT dışa aktar', 'Tek tıkla kopyala', 'KVKK uyumlu'],
  },
  {
    slug: 'imar-okuyucu',
    name: 'İmar Durumu Okuyucu',
    description:
      'İmar durumu/plan notu belgesinden yapılaşma koşullarını (TAKS, KAKS, Hmax, kullanım) çeker.',
    status: 'yakinda',
    icon: '🏗️',
    etiketler: ['PDF → metin', 'İmar analizi'],
  },
  {
    slug: 'emsal-karsilastirma',
    name: 'Emsal & Rayiç Karşılaştırma',
    description:
      'Emsal verilerini tabloya döker, m² birim değer aralığı önerir.',
    status: 'yakinda',
    icon: '📊',
    etiketler: ['Emsal analizi', 'Değerleme'],
  },
  {
    slug: 'maliyet-hesaplayici',
    name: 'Yaklaşık Maliyet Hesaplayıcı',
    description:
      'Çevre, Şehircilik ve İklim Değişikliği Bakanlığı yapı yaklaşık birim m² fiyatlarına göre maliyet yöntemi hesabı.',
    status: 'yakinda',
    icon: '🧮',
    etiketler: ['Maliyet yöntemi', 'Hesaplama'],
  },
  {
    slug: 'gelir-yontemi',
    name: 'Gelir Yöntemi / Kira Değeri',
    description:
      'Kapitalizasyon oranıyla gelir indirgeme ve kira değeri hesabı.',
    status: 'yakinda',
    icon: '💰',
    etiketler: ['Gelir yöntemi', 'Kira analizi'],
  },
  {
    slug: 'rapor-sablonu',
    name: 'Değerleme Raporu Şablonu',
    description:
      'Toplanan verilerden SPK/BDDK formatında rapor iskeleti üretir.',
    status: 'yakinda',
    icon: '📋',
    etiketler: ['SPK formatı', 'Rapor üretimi'],
  },
];
