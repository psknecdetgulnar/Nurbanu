/**
 * TAKBİS AI Takyidat Raporu — DeepSeek için mesaj üretimi.
 *
 * Görev: ham (dağınık) TAKBİS PDF metnini, değerleme raporuna hazır
 * TEMİZ takyidat dökümüne dönüştürmek. Few-shot örnek (ornek-girdi/ornek-cikti)
 * modele hedef formatı birebir öğretir.
 *
 * Bu modül sunucuda (route handler) çalışır.
 */
import { FEW_SHOT_INPUT, FEW_SHOT_OUTPUT } from './fewshot';

// ── Sistem prompt'u: transkripsiyon kuralları ───────────────────────────────

export const SYSTEM_PROMPT = `Sen Türkiye'de gayrimenkul değerleme raporları hazırlayan uzman bir asistansın. Sana Web Tapu'dan alınmış bir TAKBİS Tapu Kayıt Belgesi'nin HAM metni verilecek. Bu metin PDF'ten çıkarıldığı için dağınıktır: filigranlar, sayfa numaraları, şablon notları ve tekrarlar içerir.

GÖREVİN: Bu ham metni, değerleme raporuna eklenecek TEMİZ ve STANDART bir takyidat dökümüne dönüştürmek. Verilen örnekteki (few-shot) format ve üslubu BİREBİR takip et.

═══ KATI KURALLAR ═══
- HİÇBİR takyidatı atlama. Ham metindeki her beyan, şerh, haciz, ipotek ve rehne ait şerhi çıktıya dahil et.
- HİÇBİR bilgi UYDURMA. Tutar, tarih, yevmiye no, esas no, alacaklı adı, icra dairesi, bedel — hepsini ham metindeki haliyle BİREBİR aktar.
- Şu gürültüleri TEMİZLE ve çıktıya ASLA yazma: "BİLGİ AMAÇLIDIR", "BU BELGE ... SAYFADAN OLUŞMAKTADIR", sayfa numaraları ("2 / 29"), "(Şablon: ...)" notları, her satırda tekrarlayan malik/şirket adı blokları.
- Tarihleri ham metindeki "GG-AA-YYYY SS:DD - YYYYY" biçiminden, örnekteki gibi "(GG.AA.YYYY tarih, YYYYY yevmiye)" biçimine çevir.
- Takyidatları örnekteki başlıklar altında grupla: "Beyanlar Hanesinde:", "Şerhler Hanesinde:", "Rehinler Hanesinde:", "Rehinlere Ait Şerhler:". Sadece dolu olan haneleri yaz.
- Her kalemin önüne "-" koy. Sıralamayı ham metindeki tescil sırasına göre koru.
- İpotekleri örnekteki kalıpla yaz: "... lehine X/Y dereceden TUTAR TL bedelle GG.AA.YYYY tarih, YYYYY yevmiye ile tesis edilmiş ipotek kaydı görülmüştür."
- Açılış cümlesini belgenin tarih/saat bilgisiyle örnekteki gibi kur. Kapanış cümlesini örnekteki gibi ekle.

Çıktı SADECE temiz takyidat raporu olsun; ek açıklama, başlık veya yorum ekleme.`;

export function buildMessages(rawText: string) {
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  // Few-shot: ham girdi → ideal temiz çıktı
  if (FEW_SHOT_INPUT && FEW_SHOT_OUTPUT) {
    messages.push({ role: 'user', content: `Aşağıdaki ham TAKBİS metnini temiz takyidat raporuna dönüştür:\n\n${FEW_SHOT_INPUT}` });
    messages.push({ role: 'assistant', content: FEW_SHOT_OUTPUT });
  }

  messages.push({
    role: 'user',
    content: `Aşağıdaki ham TAKBİS metnini temiz takyidat raporuna dönüştür:\n\n${rawText}`,
  });

  return messages;
}
