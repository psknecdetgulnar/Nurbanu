/** Known şerh/beyan patterns → short labels */
const PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /arkeolojik sit/i, label: 'Arkeolojik sit alanı' },
  { re: /doğal sit/i, label: 'Doğal sit alanı' },
  { re: /kentsel sit/i, label: 'Kentsel sit alanı' },
  { re: /tarihi sit/i, label: 'Tarihi sit alanı' },
  { re: /sit alan/i, label: 'Sit alanı' },
  { re: /osb.*devir|devir.*osb/i, label: 'OSB devir kısıtı' },
  { re: /yabancı.*satılamaz|satılamaz.*yabancı|yabancılara.*satış/i, label: 'Yabancıya satış yasağı' },
  { re: /haciz/i, label: 'Haciz' },
  { re: /tedbir/i, label: 'İhtiyati tedbir' },
  { re: /şufa/i, label: 'Şufa hakkı' },
  { re: /intifa/i, label: 'İntifa hakkı' },
  { re: /irtifak/i, label: 'İrtifak hakkı' },
  { re: /kira\s+şerhi|kira\s+sözleş/i, label: 'Kira şerhi' },
  { re: /yola terk/i, label: 'Yola terk' },
  { re: /kamulaştırma/i, label: 'Kamulaştırma' },
  { re: /orman/i, label: 'Orman sınırı' },
  { re: /imar/i, label: 'İmar kısıtı' },
  { re: /taşkın/i, label: 'Taşkın riski' },
];

/**
 * Condense a list of şerh/beyan descriptions into a short summary string.
 * Known patterns are replaced with short labels; unknown descriptions are
 * truncated to 60 characters.
 */
export function generateRiskSummary(descriptions: string[]): string {
  if (descriptions.length === 0) return '';

  const seen = new Set<string>();
  const parts: string[] = [];

  for (const desc of descriptions) {
    const trimmed = desc.trim();
    if (!trimmed) continue;

    let matched = false;
    for (const { re, label } of PATTERNS) {
      if (re.test(trimmed) && !seen.has(label)) {
        parts.push(label);
        seen.add(label);
        matched = true;
        break;
      }
    }

    if (!matched) {
      const short = trimmed.slice(0, 60);
      if (!seen.has(short)) {
        parts.push(short);
        seen.add(short);
      }
    }
  }

  return parts.join('; ');
}
