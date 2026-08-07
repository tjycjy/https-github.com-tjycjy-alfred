import { pdfjsLib } from './pdfjs';

export async function extractStatementLines(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const lines: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const rows = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x, str: item.str });
    }
    const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const rowItems = rows.get(y)!.sort((a, b) => a.x - b.x);
      const line = rowItems
        .map((r) => r.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (line) lines.push(line);
    }
  }
  return lines;
}

export interface CommissionCandidate {
  raw: string;
  clientName: string;
  product: string;
  amount: number;
}

// Requires cents (".dd") to avoid matching policy numbers, dates, and page numbers.
const AMOUNT_RE = /\$?\s?(\d{1,3}(?:,\d{3})*\.\d{2})\b/g;

export function guessCommissionCandidates(lines: string[]): CommissionCandidate[] {
  const candidates: CommissionCandidate[] = [];
  for (const line of lines) {
    const matches = Array.from(line.matchAll(AMOUNT_RE));
    if (matches.length === 0) continue;
    const numbers = matches.map((m) => Number(m[1].replace(/,/g, ''))).filter((n) => !Number.isNaN(n) && n > 0);
    if (numbers.length === 0) continue;
    // Commission is usually the last dollar figure on a statement row (after premium/sum-assured columns).
    const amount = numbers[numbers.length - 1];
    const textOnly = line.replace(AMOUNT_RE, '').replace(/\s{2,}/g, ' ').trim();
    if (textOnly.length < 3) continue;
    candidates.push({ raw: line, clientName: textOnly, product: '', amount });
  }
  return candidates;
}
