# TAKBIS Okuyucu

Web Tapu / TAKBIS Tapu Kayıt Belgesi PDF'lerini saniyede Excel'e çeviren web uygulaması.

## Özellikler

- Tarayıcıda PDF parse (pdf.js) — hiçbir veri sunucuya gönderilmez
- Tek dosyada birden fazla belge desteği
- Özet + Mülkiyet + İpotek + Şerh-Beyan sayfaları içeren Excel çıktısı (SheetJS)
- Supabase e-posta + şifre kimlik doğrulaması

## Hızlı Başlangıç

### 1. Bağımlılıkları yükle

```bash
npm install
```

### 2. Ortam değişkenlerini ayarla

`.env.example` dosyasını `.env.local` olarak kopyalayıp doldurun:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3. Supabase'i kur

Supabase Dashboard → **SQL Editor**'ü açın ve `supabase/setup.sql` dosyasının tamamını yapıştırıp çalıştırın.

Bu SQL:
- `profiles` tablosunu oluşturur (RLS açık)
- Yeni kayıtta otomatik profil oluşturan trigger ekler

### 4. Geliştirme sunucusunu başlat

```bash
npm run dev
```

`http://localhost:3000` adresini açın.

### 5. Vercel'e deploy

```bash
vercel --prod
```

Vercel ortam değişkenlerine `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` ekleyin.

---

## Mimari Notlar

- **KVKK / Gizlilik:** PDF içeriği hiçbir zaman sunucuya gönderilmez. Tüm parse ve Excel işlemleri tarayıcıda çalışır.
- **Auth:** `lib/auth.ts` içinde merkezi. Magic link gibi farklı bir yönteme geçmek için yalnızca bu dosyayı değiştirin.
- **Parse hattı:** `lib/takbis/` — `extractText → splitDocuments → parseDocument`
- **Excel sütunları:** `lib/takbis/toExcel.ts` içindeki `SUMMARY_COLUMNS` dizisini düzenleyin.
- **Supabase:** yalnızca auth için kullanılır; PDF verisi veya parse çıktısı hiçbir tabloya yazılmaz.

## Klasör Yapısı

```
app/
  page.tsx              # Landing sayfası
  login/page.tsx        # Giriş / kayıt
  app/page.tsx          # Korumalı dashboard (doğrulama ekranı)
components/
  Navbar.tsx
  TakbisConverter/      # PDF→Excel bileşeni (Adım 4'te tamamlanacak)
lib/
  auth.ts               # Tüm auth çağrıları
  supabase/             # Supabase client/server helpers
  takbis/               # Parse hattı
    types.ts
    extractText.ts
    splitDocuments.ts
    parseDocument.ts
    toExcel.ts
  riskSummary.ts        # Şerh/beyan özeti
supabase/
  setup.sql             # Supabase'de bir kez çalıştırılacak SQL
```
