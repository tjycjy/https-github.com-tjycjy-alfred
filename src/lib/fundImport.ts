import type { FundHistoryPoint } from '../types';

export interface ParsedFund {
  name: string;
  assetClass: string;
  history: FundHistoryPoint[];
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function splitLine(line: string): string[] {
  const delim = line.includes('\t') ? '\t' : ',';
  return line.split(delim).map((c) => c.trim().replace(/^"|"$/g, ''));
}

function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.\-]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parseBulkFundCsv(text: string): { funds: ParsedFund[]; errors: string[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const errors: string[] = [];
  if (lines.length < 2) return { funds: [], errors: ['Paste at least a header row and one data row.'] };

  const headers = splitLine(lines[0]).map(normalizeHeader);
  const idx = {
    fund: headers.findIndex((h) => ['fund', 'fundname', 'name'].includes(h)),
    class: headers.findIndex((h) => ['class', 'assetclass', 'category', 'type'].includes(h)),
    date: headers.findIndex((h) => h === 'date'),
    nav: headers.findIndex((h) => ['nav', 'price', 'value'].includes(h)),
  };
  if (idx.fund === -1 || idx.date === -1 || idx.nav === -1) {
    return { funds: [], errors: ['Could not find "fund", "date" and "nav" columns. Expected a header like: fund,class,date,nav'] };
  }

  const byFund = new Map<string, ParsedFund>();
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const fundName = cols[idx.fund]?.trim();
    const dateStr = parseDate(cols[idx.date] ?? '');
    const nav = parseNumber(cols[idx.nav] ?? '');
    if (!fundName || !dateStr || nav === null) {
      errors.push(`Row ${i + 1}: could not parse (skipped)`);
      continue;
    }
    const assetClass = idx.class !== -1 ? cols[idx.class]?.trim() || 'Other' : 'Other';
    if (!byFund.has(fundName)) byFund.set(fundName, { name: fundName, assetClass, history: [] });
    byFund.get(fundName)!.history.push({ date: dateStr, nav });
  }

  const funds = Array.from(byFund.values()).map((f) => ({
    ...f,
    history: f.history.sort((a, b) => a.date.localeCompare(b.date)),
  }));
  return { funds, errors };
}

export function parseSingleFundCsv(text: string): { history: FundHistoryPoint[]; errors: string[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const errors: string[] = [];
  if (lines.length === 0) return { history: [], errors: ['Paste some date,nav rows.'] };

  let startIdx = 0;
  let dateCol = 0;
  let navCol = 1;
  const firstCols = splitLine(lines[0]).map(normalizeHeader);
  const looksLikeHeader = firstCols.some((c) => ['date', 'nav', 'price', 'value'].includes(c));
  if (looksLikeHeader) {
    const foundDate = firstCols.findIndex((h) => h === 'date');
    const foundNav = firstCols.findIndex((h) => ['nav', 'price', 'value'].includes(h));
    if (foundDate !== -1) dateCol = foundDate;
    if (foundNav !== -1) navCol = foundNav;
    startIdx = 1;
  }

  const history: FundHistoryPoint[] = [];
  for (let i = startIdx; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const dateStr = parseDate(cols[dateCol] ?? '');
    const nav = parseNumber(cols[navCol] ?? '');
    if (!dateStr || nav === null) {
      errors.push(`Row ${i + 1}: could not parse (skipped)`);
      continue;
    }
    history.push({ date: dateStr, nav });
  }
  history.sort((a, b) => a.date.localeCompare(b.date));
  return { history, errors };
}
