# TAKBIS / Tapu Kayıt Belgesi — Çıktı Format Spesifikasyonu

> Bu dosya, ham TKGM (Web Tapu / TAKBIS) PDF/metin çıktısının **değerleme raporuna doğrudan yapıştırılabilir** standart metne dönüştürülmesinin kurallarını tanımlar. Uygulama bu spec'e harfiyen uymalıdır; örnek çıktılarla birebir eşleşmelidir.

İki çıktı modu vardır:
- **Takyidat**: sadece takyidat metni (Beyanlar / Şerhler / Rehinler / Rehinlere Ait Şerhler + açılış ve kapanış cümleleri).
- **Tam Rapor**: Tapu Kayıt Bilgileri + Mülkiyet Bilgileri + Takyidat metni.

---

## 1. Pipeline

```
Ham PDF/metin  →  PARSE  →  NORMALIZE (veri modeli)  →  RENDER (şablon)  →  Çıktı (Takyidat | Tam Rapor)
```

Parse ve render birbirinden ayrı tutulmalı. Render sadece normalize edilmiş veri modelini okur, ham metne dokunmaz.

---

## 2. Veri Modeli (normalize sonrası)

```json
{
  "belge": {
    "alimTarihi": "2021-05-20",          // ISO
    "alimSaati": "07:31",
    "dogrulamaKodu": "Online"            // varsa kod, yoksa "Online"
  },
  "tasinmaz": {
    "zeminTipi": "KatIrtifaki",
    "il": "ÇANAKKALE",
    "ilce": "MERKEZ",
    "mahalle": "ARSLANCA",
    "ada": "1366",
    "parsel": "7",
    "yuzolcum": "3957,24",
    "bbNitelik": "DUBLEKS İŞ YERİ",
    "blok": "B",
    "kat": "5+ÇATI ARASI",
    "bbNo": "24",
    "arsaPay": "156",
    "arsaPayda": "28800",
    "anaNitelik": "ARSA"
  },
  "malikler": [
    { "ad": "...", "hissePay": "1/1", "edinmeTarihi": "2018-01-31", "edinmeYevmiye": "1674" }
  ],
  "beyanlar":       [ /* TakyidatItem */ ],
  "serhler":        [ /* TakyidatItem */ ],
  "rehinler":       [ /* TakyidatItem */ ],
  "rehinSerhleri":  [ /* TakyidatItem */ ]
}
```

### TakyidatItem
```json
{
  "tip": "icrai_haciz | ihtiyati_haciz | kamu_haczi | satis | iik_150c | ipotek | beyan_2565 | beyan_yonetim_plani | beyan_yabanci | beyan_diger",
  "ham": "kaynaktaki ham açıklama (fallback için saklanır)",
  "merci": "ÇANAKKALE 3. İCRA DAİRESİ",
  "kararTarihi": "10/12/2018",   // metin içi tarih, OLDUĞU GİBİ (bkz. §3)
  "esasNo": "2018/5240 ESAS",
  "bedel": "95000",              // sayı string, TL'siz
  "alacakli": "İRFAN KÜTÜKLÜ",
  "tescilTarihi": "2018-12-11",  // ISO; render'da DD.MM.YYYY
  "yevmiye": "20442"
}
```

---

## 3. Tarih ve Sayı Normalizasyonu

**Tescil/yevmiye tarihi (parantez içi):** Daima `DD.MM.YYYY`. Saat varsa atılır.
- Kaynak: `08.05.2018 10:07`, `30-03-2026 11:01`, `16-04-2007 00:00` → çıktı: `08.05.2018`, `30.03.2026`, `16.04.2007`

**Metin içi tarihler (kararTarihi, ESAS tarihi vb.):** Kaynakta nasıl yazıldıysa **aynen korunur** (genelde `DD/MM/YYYY`).
- Örnek: "... nin **10/12/2018** tarih 2018/5240ESAS ..." içteki tarih `/` ile, parantezdeki tarih `.` ile.

**Saat:** `HH:MM` formatında, sadece açılış cümlesinde kullanılır.

**Para/sayı:** Varsayılan davranış: **kaynaktaki haliyle bırak** (örn. `95000`, `8048.93`, `800000.00`). Referans çıktılar ayraçsızdır.
- `FORMAT_CURRENCY_TR = false` (varsayılan). `true` yapılırsa `800000.00 → 800.000,00` (binlik nokta, ondalık virgül) uygulanır. Tek noktadan kontrol edilebilir config olmalı.

**Kişi adları:** Kaynaktaki büyük/küçük harf karması **aynen korunur** (örn. "aydın demir", "İRFAN KÜTÜKLÜ" hepsi olduğu gibi). Düzeltilmez.

---

## 4. Takyidat Metni — İskelet

Sıra sabittir. **Sadece dolu olan haneler** yazılır; boş hane başlığı hiç basılmaz.

```
{ACILIS}

Beyanlar Hanesinde:
{beyan satırları}

Şerhler Hanesinde:
{şerh satırları}

Rehinler Hanesinde:
{rehin satırları}

Rehinlere Ait Şerhler:
{rehin şerh satırları}

{KAPANIS}
```

**Açılış cümlesi (her zaman):**
```
Web Tapu portaldan elektronik ortamda {alimTarihi:DD.MM.YYYY} tarih ve saat {alimSaati:HH:MM} itibarıyla alınan ve rapor ekinde yer alan Tapu Kayıt Belgesi'ne göre taşınmaz üzerinde aşağıda yer alan takyidatlar bulunmaktadır.
```

**Kapanış cümlesi (her zaman):**
```
{alimTarihi:DD.MM.YYYY} tarihinde alınmış olan Takbis belgesi ve Tapu senedi arasında farklılık bulunmamaktadır.
```

Her satır `-` ile başlar, satır başında `-` ile metin arasında boşluk YOKTUR (`-İcrai Haciz : ...`, `-2565 Sayılı...`).

---

## 5. Hane Satır Şablonları

Tüm parantez sonu: ` ({tescilTarihi:DD.MM.YYYY} tarih, {yevmiye} yevmiye)`

### 5.1 Beyanlar

**2565 Sayılı Kanun:**
```
-2565 Sayılı Kanunun 28. Maddesi Gereği Belirtilen Alan İçerisinde Kalmaktadır ({tescil} tarih, {yev} yevmiye)
```

**Yönetim Planı:**
```
-Yönetim Planı : {planTarihi} ({tescil} tarih, {yev} yevmiye)
```

**Yabancıya satış kısıtı (3255 tipi) — tam metin korunur:**
```
-06/02/2007 TARİHLİ BAKANLAR KURULU KARARINA İSTİNADEN YABANCI GERÇEK KİŞİLERE VE TÜZEL KİŞİLERE SATILAMAZ.SINIRLI VE AYNI HAK TESİS EDİLEMEZ. TARİH: 16/04/2007 YEV:3255 ({tescil} tarih, {yev} yevmiye)
```

**Diğer (veraset vb.):**
```
-Diğer (Konusu: {konu}) Tarih: - Sayı: - ({tescil} tarih, {yev} yevmiye)
```

> Beyanlarda kaynaktaki `( Şablon: ... )` eki, `(SN:...)`, sistem no, "BİLGİ AMAÇLIDIR", sayfa numaraları **silinir**.

### 5.2 Şerhler

**İcrai Haciz:**
```
-İcrai Haciz : {merci} nin {kararTarihi} tarih {esasNo} sayılı Haciz Yazısı sayılı yazıları ile {bedel} TL bedel ile Alacaklı : {alacakli} lehine haciz işlenmiştir. ({tescil} tarih, {yev} yevmiye)
```

**İhtiyati Haciz:**
```
-İhtiyati Haciz : {merci} nin {kararTarihi} tarih {esasNo} sayılı Haciz Yazısı sayılı yazıları ile. Borç : {bedel} TL . (Alacaklı : {alacakli} ) ({tescil} tarih, {yev} yevmiye)
```

**Kamu Haczi:**
```
-Kamu Haczi : {merci} nin {kararTarihi} tarih {sayi} sayılı Haciz Yazısı sayılı yazıları ile. Borç : {bedel} TL (Alacaklı : {merci} ) ({tescil} tarih, {yev} yevmiye)
```

**Satışa gidilmesi:**
```
-{merci} nin {kararTarihi} tarih {esasNo} sayılı İcra Dairesinin Yazısı yazısı ile satışına gidilmiştir. ({tescil} tarih, {yev} yevmiye)
```

**İİK 150/c (şerhlerde de görülebilir):**
```
-İİK 150/c Md. Gereği İpoteğin paraya çevrilmesi için takibe geçilmiştir. {merci} nin {kararTarihi} tarih {esasNo} sayılı Resmi Yazı ({tescil} tarih, {yev} yevmiye)
```

### 5.3 Rehinler (İpotek)
```
-{alacakli} lehine {derece} dereceden {bedel} TL bedelle {tescil:DD.MM.YYYY} tarih, {yev} yevmiye ile tesis edilmiş ipotek kaydı görülmüştür.
```
`derece` örn. `1/0`.

### 5.4 Rehinlere Ait Şerhler
İçerik genelde İİK 150/c kaydıdır; §5.2'deki İİK 150/c şablonu kullanılır.

---

## 6. Sıralama, Sayım, Tekilleştirme

- **Sıralama:** Her hane kendi içinde `tescilTarihi` artan, eşitse `yevmiye` artan.
- **Tekilleştirme:** Aynı kayıt hem Şerhler hem Rehinlere Ait Şerhler'de görünebilir (İİK 150/c). Her hanede kendi yerinde yazılır AMA **toplam takyidat sayımında bir kez** sayılır (aynı yevmiye = aynı kayıt).
- **Özet sayaç:** `{n} Beyan, {n} Şerh, {n} İpotek`. Buton rozeti = benzersiz yevmiye sayısı.

---

## 7. Tam Rapor Başlığı

```
═══════════════════════════════════════════════════════════════
                    TAPU KAYIT BİLGİ RAPORU
═══════════════════════════════════════════════════════════════

▸ TAPU KAYIT BİLGİLERİ
───────────────────────────────────────────────────────────────
Zemin Tipi        : {zeminTipi}
İl/İlçe           : {il}/{ilce}
Mahalle           : {mahalle}
Ada/Parsel        : {ada}/{parsel}
Yüzölçüm (m²)     : {yuzolcum}
BB Nitelik        : {bbNitelik}
Blok/Kat/BB No    : Blok: {blok}, Kat: {kat}, BB No: {bbNo}
Arsa Pay/Payda    : {arsaPay}/{arsaPayda}
Nitelik           : {anaNitelik}


▸ MÜLKİYET BİLGİLERİ
───────────────────────────────────────────────────────────────
• {malik.ad} - Hisse: {malik.hissePay}
  Edinme: {malik.edinmeTarihi:DD.MM.YYYY}-{malik.edinmeYevmiye}


▸ TAKYİDAT BİLGİLERİ
───────────────────────────────────────────────────────────────
{Takyidat metni — §4}
```

- Dolu olmayan tasinmaz alanları (ör. BB No yoksa) satırda **boş bırakılır**, satır silinmez.
- Birden çok malik varsa her biri `•` ile yeni madde.

---

## 8. Boş / Eksik Veri Davranışı

- Hane boşsa başlığı **basılmaz** (Takyidat metninde).
- Tam Rapor'daki sabit alanlar boş olsa da satırı kalır (`: ` boş).
- Hiç takyidat yoksa: açılış cümlesi → "...takyidat bulunmamaktadır." varyantı + kapanış cümlesi. (Açılış cümlesinin bu varyantını config'le seçilebilir tut.)
- Parse edilemeyen bir kalem olursa: `tip` atanamayan kalem `ham` alanıyla aynen yazılır + log'a "unparsed" düşülür (sessizce kaybetme).

---

## 9. Test Kabul Kriteri (regression)

`docs/fixtures/` altına en az 2 referans çifti konur: `*.ham.txt` (girdi) ve `*.takyidat.txt` + `*.tamrapor.txt` (beklenen çıktı). Render çıktısı bunlarla **karakter karakter** eşleşmeli (sadece satır sonu normalize edilerek). Bu repodaki örnek: Arslanca 1366/7 (74 takyidat).
