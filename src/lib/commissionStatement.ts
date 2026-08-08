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

// Insurer rate schedules ("Schedule of Commissions", "Commission Rates (%) ... by Policy Year")
// list a commission *rate* per product, not a dollar amount actually paid to you — every row
// still matches AMOUNT_RE, so they must be rejected by content rather than by number of matches.
const RATE_SCHEDULE_RE = /schedule of commissions|commission rates? \(%\)|by policy year|rates? on premium received/i;

export function guessCommissionCandidates(lines: string[]): CommissionCandidate[] {
  if (lines.some((line) => RATE_SCHEDULE_RE.test(line))) return [];

  const candidates: CommissionCandidate[] = [];
  for (const line of lines) {
    const matches = Array.from(line.matchAll(AMOUNT_RE));
    if (matches.length === 0) continue;
    // A real statement row names one client and lists at most a couple of dollar figures
    // (premium, then commission). Rate-schedule tables (% commission by policy year) pack
    // several decimal numbers into a single row — skip those rather than mis-reading them
    // as an earned-commission amount.
    if (matches.length > 2) continue;
    const numbers = matches.map((m) => Number(m[1].replace(/,/g, ''))).filter((n) => !Number.isNaN(n) && n > 0);
    if (numbers.length === 0) continue;
    // Commission is usually the last dollar figure on a statement row (after premium/sum-assured columns).
    const amount = numbers[numbers.length - 1];
    const textOnly = line.replace(AMOUNT_RE, '').replace(/\s{2,}/g, ' ').trim();
    if (textOnly.length < 3) continue;
    // Rate-schedule rows collapse to fragments like "4 NA NA" once the numbers are stripped —
    // real client/product names contain letters beyond a stray "NA".
    if (!/[a-zA-Z]{3,}/.test(textOnly) || /^\d+(\s+NA)+$/i.test(textOnly)) continue;
    candidates.push({ raw: line, clientName: textOnly, product: '', amount });
  }
  // If most of the document's lines look like dollar rows, it's almost certainly a rate
  // table/schedule rather than an itemized statement — bail out instead of returning noise.
  if (lines.length > 20 && candidates.length > lines.length * 0.3) return [];
  return candidates;
}
