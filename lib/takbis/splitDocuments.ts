/**
 * A single PDF file can contain multiple Tapu Kayıt Belgesi documents.
 *
 * Real TAKBIS PDFs start each document with:
 *   "BU BELGE TOPLAM X SAYFADAN OLUŞMAKTADIR ... Tarih: DD-M-YYYY-HH:MM"
 *   "Kaydı Oluşturan: ..."
 *
 * We prefer splitting on "BU BELGE TOPLAM" so the Tarih line is included
 * in the segment. If that marker is absent we fall back to "Kaydı Oluşturan:".
 */
export function splitDocuments(fullText: string): string[] {
  // Primary: split on BU BELGE TOPLAM (includes the Tarih line above Kaydı Oluşturan)
  let segments = fullText.split(/(?=BU\s+BELGE\s+TOPLAM)/i);
  let valid = segments
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && /Kaydı\s+Oluşturan\s*:/i.test(s));

  if (valid.length > 0) return valid;

  // Fallback: split on Kaydı Oluşturan (Tarih line won't be captured)
  segments = fullText.split(/(?=Kaydı\s+Oluşturan\s*:)/i);
  valid = segments
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && /Kaydı\s+Oluşturan\s*:/i.test(s));

  return valid;
}
