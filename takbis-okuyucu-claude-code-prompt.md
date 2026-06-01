# Claude Code Master Prompt — TAKBIS / Web Tapu PDF Okuyucu (Web Uygulaması)

Aşağıdaki spesifikasyona göre, üretime hazır bir web uygulaması kur. Önce mimariyi ve klasör yapısını oluştur, sonra adım adım kodla. Belirsiz kalan teknik kararları aşağıdaki tercihlere göre ver; yeni varsayım gerekiyorsa kodun içinde yorum satırı olarak belirt.

---

## 1. Ürün Amacı

Gayrimenkul değerleme uzmanları için web aracı. Kullanıcı Web Tapu'dan indirdiği **TAKBIS Tapu Kayıt Belgesi PDF'lerini** yükler; uygulama bu PDF'leri **tamamen tarayıcıda** parse eder ve **Excel (.xlsx)** olarak indirir. Manuel veri girişini ortadan kaldırır.

Şu an **tek özellik** var: PDF → Excel dönüştürücü. Site ileride çok özellikli olacak, bu yüzden dönüştürücüyü kendi içinde kapsüllenmiş bir bileşen olarak yaz.

## 2. Kritik Mimari Kuralı (KVKK)

- PDF içeriği **hiçbir zaman sunucuya gönderilmeyecek.** Tüm metin çıkarma, parse ve Excel üretimi **tarayıcıda (client-side)** olacak.
- Supabase **yalnızca kimlik doğrulama (auth) ve kullanıcı kaydı** için kullanılacak. PDF içeriği, parse edilmiş veri veya Excel dosyaları Supabase'e veya herhangi bir sunucuya **yazılmayacak / loglanmayacak.**
- Arayüzde net şekilde belirt: "Belgeleriniz cihazınızdan çıkmaz, hiçbir yerde saklanmaz."

## 3. Teknoloji Stack

- **Next.js (App Router) + TypeScript + Tailwind CSS**
- Dağıtım hedefi: **Vercel** (statik + serverless, ayrı VPS YOK)
- Auth: **Supabase Auth (e-posta + şifre)**. (Not: İleride magic link'e geçilebilsin diye auth çağrılarını tek bir `lib/auth.ts` dosyasında topla.)
- PDF metin çıkarma: **pdf.js** (`pdfjs-dist`) — tarayıcıda
- Excel üretimi: **SheetJS** (`xlsx`) — tarayıcıda
- State: gereksiz kütüphane ekleme, React state yeterli.

Tarayıcıda `localStorage`/`sessionStorage` kullanma (Supabase auth kendi oturum yönetimini yapar).

## 4. Sayfa Yapısı

### 4.1. Landing / Ana Ekran (`/`) — public
- Üstte sade bir navbar; **sağ üst köşede "Giriş Yap" butonu** → `/login`'e gider.
- Kısa hero: ürün adı, "Web Tapu / TAKBIS belgelerinizi saniyede Excel'e çevirin", "Belgeleriniz cihazınızdan çıkmaz" vurgusu.
- Tek bir CTA ("Giriş Yap" veya "Başla").

### 4.2. Login (`/login`)
- E-posta + şifre ile giriş.
- "Hesabın yok mu? Kayıt ol" linki → kayıt formu (aynı sayfada toggle veya `/register`).
- Supabase Auth ile giriş/kayıt. Hata mesajlarını Türkçe ve kullanıcı dostu göster.
- Başarılı girişte `/app`'e yönlendir.

### 4.3. Uygulama / Dashboard (`/app`) — korumalı (protected) route
- Giriş yapmamış kullanıcı `/login`'e atılır (middleware veya client guard).
- Sağ üstte kullanıcı e-postası + **Çıkış Yap** butonu.
- İçerikte **tek özellik:** TAKBIS PDF → Excel dönüştürücü (bkz. bölüm 5).
- Bu dashboard ileride büyüyecek; dönüştürücüyü `components/TakbisConverter/` altında bağımsız bir bileşen olarak yaz ki sonradan sidebar/başka modüller eklenebilsin.

## 5. Çekirdek Özellik: TAKBIS PDF → Excel

### 5.1. Akış
1. Kullanıcı bir veya **birden fazla** PDF'i sürükle-bırak veya dosya seç ile yükler (toplu işlem).
2. Her PDF tarayıcıda pdf.js ile okunur, metni çıkarılır.
3. Metin parse edilir → yapılandırılmış veri (bkz. 5.3).
4. Sonuçlar ekranda bir **önizleme tablosunda** gösterilir (her taşınmaz bir satır).
5. **"Excel İndir"** butonu → SheetJS ile `.xlsx` üretilir, indirilir.
6. İşlem bitince PDF'ler bellekten temizlenir.

### 5.2. Önemli: PDF Yapısı
Bu PDF'ler **dijital metin** (taranmış görüntü DEĞİL), bu yüzden OCR gerekmez. pdf.js `getTextContent()` ile metin doğrudan çıkar. Tablolar bozuk sırada gelebileceği için, gerekiyorsa text item'ların `transform` (x/y) koordinatlarından satır/sütun yeniden kur.

**Bir PDF dosyası birden fazla "Tapu Kayıt Belgesi" içerebilir.** Örnek: bir dosyada iki ayrı bağımsız bölüm (C blok ve D blok) art arda gelir; her birinin kendi doğrulama kodu ve "BU BELGE TOPLAM X SAYFADAN" başlığı vardır. Parse etmeden önce metni **belge bölümlerine ayır.** Ayırma için güvenilir sınır: her belge `Kaydı Oluşturan:` ile başlar ve sonunda bir Web Tapu **doğrulama kodu** bulunur. Her belge bölümü ayrı bir taşınmaz kaydı olarak işlenir.

### 5.3. Parse Spesifikasyonu (her belge bölümü için)

**A. Üst bilgi**
- `Tarih`
- `Kaydı Oluşturan` (ör. "ÖZHAN YURTSEVEN ( EVA GAYRİMENKUL DEĞERLEME DANIŞMANLIK A.Ş. )")
- `Makbuz No`, `Dekont No`, `Başvuru No`
- `Doğrulama Kodu` (footer'daki kod, ör. `Qp1ivvxfgN`) → her belge için benzersiz anahtar olarak kullan.

**B. TAPU KAYIT BİLGİSİ (key-value)**
- `Zemin Tipi` (ör. AnaTasinmaz, KatIrtifaki)
- `Taşınmaz Kimlik No`
- `İl/İlçe` (ör. ÇANAKKALE/MERKEZ) → İl ve İlçe'yi ayrı sütunlara da böl
- `Kurum Adı`
- `Mahalle/Köy Adı`
- `Mevkii`
- `Cilt/Sayfa No`
- `Kayıt Durum`
- `Ada/Parsel` (ör. 164/11) → Ada ve Parsel'i ayrı sütunlara da böl
- `AT Yüzölçüm(m2)`
- `Bağımsız Bölüm Nitelik` (boş olabilir)
- `Bağımsız Bölüm Brüt Yüzölçümü` (boş olabilir)
- `Bağımsız Bölüm Net Yüzölçümü` (boş olabilir)
- `Blok/Kat/Giriş/BBNo` (ör. C/ZEMİN+1//1)
- `Arsa Pay/Payda` (ör. 185/1482)
- `Ana Taşınmaz Nitelik` (ör. "tek katlı imalathane binası ve arsası")

**C. TAŞINMAZA AİT ŞERH BEYAN İRTİFAK BİLGİLERİ** (tablo, 0..n satır)
Her satır: `Tür (Şerh/Beyan/İrtifak)`, `Açıklama`, `Malik/Lehtar`, `Tesis Kurum-Tarih-Yevmiye`, `Terkin Sebebi-Tarih-Yevmiye`.
Açıklamalar uzun olabilir (ör. "3.derece arkeolojik sit alanında kalmaktadır", "OSB ... devrinde uygunluk görüşü alınması zorunludur", "Yabancı gerçek/tüzel kişilere satılamaz").

**D. MÜLKİYET BİLGİLERİ** (tablo, 1..n satır — birden fazla malik / el birliği olabilir)
Her satır: `Sistem No`, `Malik` (ör. "KADİR YAŞAR : ARİF Oğlu" veya tüzel kişi adı), `El Birliği No`, `Hisse Pay/Payda`, `Metrekare`, `Toplam Metrekare`, `Edinme Sebebi-Tarih-Yevmiye`, `Terkin Sebebi-Tarih-Yevmiye`.

**E. MÜLKİYETE AİT REHİN / İPOTEK BİLGİLERİ** (tablo, 0..n satır — bir belgede birden fazla ipotek olabilir, ör. derece 1/0, 2/0, 3/0)
Her ipotek için: `Alacaklı` (banka adı + VKN), `Müşterek Mi? (Evet/Hayır)`, `Borç` (TL), `Faiz` (ör. "%36 yıllık", "%28 değişken", "faizsiz"), `Derece/Sıra` (ör. 1/0), `Süre` (ör. F.B.K.), `Tesis Tarih-Yevmiye`.
İpoteğin konulduğu hisse bilgisi: `Borçlu Malik`, `Malik Borç`, `Tescil Tarih-Yevmiye`.

### 5.4. Hesaplanan / türetilmiş alanlar (değer katan)
Her taşınmaz için şunları hesapla:
- `İpotek Var/Yok` (en az bir ipotek varsa "Var")
- `İpotek Derece Sayısı` (kaç ipotek kaydı)
- `Toplam İpotek Borcu (TL)` (tüm ipotek borçlarının toplamı)
- `Şerh/Beyan Özeti`: şerh/beyan açıklamalarını kısa, virgülle ayrılmış bir özet metne indir (ör. "Sit alanı; OSB devir kısıtı; Yabancıya satış yasağı"). Anahtar kelime eşleştirmesiyle bilinen kalıpları kısalt, bilinmeyenleri olduğu gibi ekle.

### 5.5. Excel Çıktısı
SheetJS ile çok sayfalı bir `.xlsx` üret:

- **Sayfa "Özet"** (ana, her taşınmaz bir satır). Sütunlar (sıra önemli, sonradan kolay değiştirilebilsin diye **tek bir `COLUMNS` config dizisi**nde tanımla):
  Doğrulama Kodu, Tarih, İl, İlçe, Mahalle/Köy, Mevkii, Ada, Parsel, Zemin Tipi, Ana Taşınmaz Nitelik, Bağımsız Bölüm Nitelik, Blok/Kat/Giriş/BBNo, Arsa Pay/Payda, AT Yüzölçüm (m2), Malik(ler), İpotek Var/Yok, İpotek Derece Sayısı, Toplam İpotek Borcu (TL), Şerh/Beyan Özeti, Kaydı Oluşturan.
- **Sayfa "Mülkiyet"** (her malik bir satır; Doğrulama Kodu ile Özet'e bağlanır).
- **Sayfa "İpotek"** (her ipotek bir satır; Doğrulama Kodu ile bağlanır).
- **Sayfa "Şerh-Beyan"** (her şerh/beyan bir satır; Doğrulama Kodu ile bağlanır).

Birden fazla PDF yüklendiğinde tüm taşınmazlar aynı dosyada birleşsin. Sayısal alanları (yüzölçüm, borç) metin değil **sayı** olarak yaz. Türkçe karakterler bozulmasın.

Not: Excel sütunları kesinleşmemiştir; değerleme uzmanı geri bildirimine göre ayarlanacak. Bu yüzden sütun tanımlarını **tek bir merkezi config**te tut.

## 6. Auth & Veritabanı (Supabase)

- Supabase projesi için `.env.local` kullan, **anahtarları koda gömme**. `.env.example` oluştur:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  ```
- E-posta + şifre ile kayıt/giriş/çıkış. Oturum yönetimi Supabase SSR helper'ları ile.
- `/app` route'unu koru (giriş yoksa `/login`).
- **`profiles` tablosu** (RLS açık): `id (uuid, auth.users'a referans)`, `email`, `plan (text, default 'free')`, `created_at`. Yeni kayıtta otomatik bir profil satırı oluştur (trigger veya client-side upsert).
- **Şu an kullanım limiti YOK — herkes sınırsız.** `plan` alanını şimdilik sadece tut, hiçbir yerde paywall/limit uygulama. (İleride premium bunun üzerine eklenecek.)

Supabase kurulumu için gereken SQL'i (profiles tablosu + RLS politikaları + trigger) ayrı bir `supabase/setup.sql` dosyasında ver ki ben Supabase panelinde çalıştırayım.

## 7. UI/UX

- Temiz, profesyonel, masaüstü öncelikli (kullanıcılar masa başında çalışıyor). frontend-design ilkelerine uy, jenerik AI görünümünden kaçın.
- Türkçe arayüz.
- Dönüştürücüde: net bir bırakma alanı, yüklenen dosya listesi, işlem durumu (işleniyor/başarılı/hata), önizleme tablosu, "Excel İndir" butonu.
- Parse edilemeyen / beklenmeyen formatta bir belge gelirse o belgeyi atla, kullanıcıya hangi dosyanın işlenemediğini bildir, diğerlerini işlemeye devam et (tek bozuk dosya tüm işlemi düşürmesin).

## 8. Klasör Yapısı (öneri)
```
app/
  page.tsx                 # landing
  login/page.tsx
  app/page.tsx             # korumalı dashboard
  layout.tsx
components/
  Navbar.tsx
  TakbisConverter/
    index.tsx              # ana bileşen
    FileDropzone.tsx
    ResultTable.tsx
lib/
  supabase/
    client.ts
    server.ts
  auth.ts                  # tüm auth çağrıları burada
  takbis/
    extractText.ts         # pdf.js ile metin çıkarma
    splitDocuments.ts      # tek dosyadaki çoklu belgeyi ayırma
    parseDocument.ts       # bir belgeyi yapılandırılmış veriye çevirme
    types.ts               # TakbisRecord, Malik, Ipotek, SerhBeyan tipleri
    toExcel.ts             # SheetJS export + COLUMNS config
  riskSummary.ts           # şerh/beyan özeti üretimi
supabase/
  setup.sql
.env.example
README.md
```

## 9. Kabul Kriterleri
1. Giriş yapılmadan `/app` görülemiyor.
2. E-posta + şifre ile kayıt ve giriş çalışıyor.
3. Tek PDF ve birden fazla PDF yüklenebiliyor; biri çoklu belge/çoklu ipotek/çoklu malik içeriyorsa hepsi doğru ayrıştırılıyor.
4. Önizleme tablosu doğru veriyi gösteriyor.
5. İndirilen Excel'de Özet + Mülkiyet + İpotek + Şerh-Beyan sayfaları var, sayısal alanlar sayı olarak, Türkçe karakterler düzgün.
6. PDF içeriği hiçbir ağ isteğinde gönderilmiyor (DevTools Network'te doğrulanabilir).
7. `npm run build` hatasız; Vercel'e deploy edilebilir durumda.
8. README'de kurulum, Supabase SQL çalıştırma ve env adımları yazılı.

## 10. Çalışma Sırası
1. Proje iskeleti + Tailwind + Supabase client kurulumu.
2. Auth (login/register/logout) + korumalı `/app` + `supabase/setup.sql`.
3. `lib/takbis/` parse hattı: extractText → splitDocuments → parseDocument (tipler + birim test edilebilir saf fonksiyonlar).
4. Dönüştürücü UI + önizleme.
5. Excel export.
6. Landing + navbar + cila.
7. README.

Önce 1–3'ü kurup bana parse çıktısını JSON olarak gösterecek küçük bir doğrulama ekranı yap; parse'ı gerçek örneklerle teyit edince UI ve Excel'e geçeriz.
