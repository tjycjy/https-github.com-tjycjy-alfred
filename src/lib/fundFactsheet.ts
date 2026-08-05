import { pdfjsLib } from './pdfjs';

export async function extractFactsheetText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = '';
  const pagesToScan = Math.min(doc.numPages, 5);
  for (let i = 1; i <= pagesToScan; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => ('str' in item ? item.str : '')).join(' ');
    text += `${pageText}\n`;
  }
  return text;
}

export interface FactsheetGuess {
  nav: number | null;
  return1y: number | null;
  return3y: number | null;
  return5y: number | null;
}

export function guessFactsheetFields(text: string): FactsheetGuess {
  const navMatch = text.match(/NAV[^0-9]{0,25}([\d,]+\.\d{2,4})/i);
  const ret1yMatch = text.match(/1[\s-]*Year[^%\d-]{0,25}(-?\d+\.\d+)\s*%/i);
  const ret3yMatch = text.match(/3[\s-]*Year[^%\d-]{0,25}(-?\d+\.\d+)\s*%/i);
  const ret5yMatch = text.match(/5[\s-]*Year[^%\d-]{0,25}(-?\d+\.\d+)\s*%/i);

  return {
    nav: navMatch ? Number(navMatch[1].replace(/,/g, '')) : null,
    return1y: ret1yMatch ? Number(ret1yMatch[1]) : null,
    return3y: ret3yMatch ? Number(ret3yMatch[1]) : null,
    return5y: ret5yMatch ? Number(ret5yMatch[1]) : null,
  };
}
