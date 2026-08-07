import { pdfjsLib } from './pdfjs';

const MAX_PAGES = 500;

export async function extractPdfFullText(file: File, onProgress?: (page: number, total: number) => void): Promise<string> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const totalPages = Math.min(doc.numPages, MAX_PAGES);
  let text = '';
  for (let i = 1; i <= totalPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    text += `\n\n[Page ${i}]\n${pageText}`;
    onProgress?.(i, totalPages);
  }
  return text.trim();
}
