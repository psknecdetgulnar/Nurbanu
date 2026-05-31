'use client';

export interface RawTextItem {
  str: string;
  transform: number[]; // [scaleX, skewX, skewY, scaleY, tx, ty]
  width: number;
  height: number;
}

export interface PageText {
  pageNumber: number;
  items: RawTextItem[];
  text: string;
}

export interface DocumentText {
  pages: PageText[];
  fullText: string;
}

/**
 * Extract all text from a PDF File using pdf.js (browser-only).
 *
 * PDF text items often contain extra whitespace runs (font-based kerning
 * or word-spacing encoded as separate items). Each line is normalised to
 * a single-space-separated string so downstream parsers see clean text.
 */
export async function extractTextFromPDF(file: File): Promise<DocumentText> {
  const pdfjsLib = await import('pdfjs-dist');

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: PageText[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const items: RawTextItem[] = (content.items as RawTextItem[]).filter(
      (item) => typeof item.str === 'string'
    );

    // Group by y-coordinate (within 3px tolerance) to form logical lines
    const yMap = new Map<number, RawTextItem[]>();
    for (const item of items) {
      const y = item.transform[5];
      const existingKey = Array.from(yMap.keys()).find((ky) => Math.abs(ky - y) <= 3);
      if (existingKey !== undefined) {
        yMap.get(existingKey)!.push(item);
      } else {
        yMap.set(y, [item]);
      }
    }

    // Sort lines top-to-bottom, items within a line left-to-right
    const sortedLines = Array.from(yMap.entries())
      .sort(([ya], [yb]) => yb - ya)
      .map(([, lineItems]) =>
        lineItems.sort((a, b) => a.transform[4] - b.transform[4])
      );

    // Join items on the same line; collapse any multi-space runs to one space
    const text = sortedLines
      .map((line) =>
        line
          .map((i) => i.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
      )
      .filter((l) => l.length > 0)
      .join('\n');

    pages.push({ pageNumber: pageNum, items: sortedLines.flat(), text });
  }

  const fullText = pages.map((p) => p.text).join('\n');
  return { pages, fullText };
}
