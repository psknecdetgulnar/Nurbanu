/**
 * A single PDF file can contain multiple Tapu Kayıt Belgesi documents.
 * Each document starts with "Kaydı Oluşturan:" (words may be separated
 * by multiple spaces in the raw PDF text — we use \s+ to be safe).
 */
export function splitDocuments(fullText: string): string[] {
  // Split on every occurrence of "Kaydı Oluşturan:" (any whitespace between words)
  const segments = fullText.split(/(?=Kaydı\s+Oluşturan\s*:)/i);

  return segments
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && /Kaydı\s+Oluşturan\s*:/i.test(s));
}
