import type { FundHistoryPoint } from '../types';

export interface FundSnapshot {
  latestDate: string | null;
  latestNav: number | null;
  dailyReturn: number | null;
  volatility: number | null;
  maxDrawdown: number | null;
  maxDrawdownDate: string | null;
  currentDrawdown: number | null;
  inception: string | null;
  ytd: number | null;
  r1w: number | null;
  r1m: number | null;
  r3m: number | null;
  r6m: number | null;
  r1y: number | null;
  r3y: number | null;
  r5y: number | null;
  r10y: number | null;
}

const EMPTY_SNAPSHOT: FundSnapshot = {
  latestDate: null,
  latestNav: null,
  dailyReturn: null,
  volatility: null,
  maxDrawdown: null,
  maxDrawdownDate: null,
  currentDrawdown: null,
  inception: null,
  ytd: null,
  r1w: null,
  r1m: null,
  r3m: null,
  r6m: null,
  r1y: null,
  r3y: null,
  r5y: null,
  r10y: null,
};

function sortHistory(history: FundHistoryPoint[]): FundHistoryPoint[] {
  return [...history].sort((a, b) => a.date.localeCompare(b.date));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

function navOnOrBefore(history: FundHistoryPoint[], target: Date): number | null {
  let result: number | null = null;
  for (const p of history) {
    if (new Date(p.date) <= target) result = p.nav;
    else break;
  }
  return result;
}

function pctChange(from: number | null, to: number | null): number | null {
  if (from === null || to === null || from === 0) return null;
  return to / from - 1;
}

function annualize(totalReturn: number | null, years: number): number | null {
  if (totalReturn === null) return null;
  const base = 1 + totalReturn;
  if (base <= 0) return null;
  return Math.pow(base, 1 / years) - 1;
}

export function computeFundSnapshot(historyRaw: FundHistoryPoint[]): FundSnapshot {
  const history = sortHistory(historyRaw);
  if (history.length === 0) return EMPTY_SNAPSHOT;

  const latest = history[history.length - 1];
  const latestDate = new Date(latest.date);
  const prev = history.length > 1 ? history[history.length - 2] : null;
  const dailyReturn = prev ? pctChange(prev.nav, latest.nav) : null;
  const inception = history[0].date;

  const yearStart = new Date(latestDate.getFullYear(), 0, 1);
  const ytdBase = navOnOrBefore(history, yearStart) ?? history[0].nav;
  const ytd = pctChange(ytdBase, latest.nav);

  const r1w = pctChange(navOnOrBefore(history, addDays(latestDate, -7)), latest.nav);
  const r1m = pctChange(navOnOrBefore(history, addMonths(latestDate, -1)), latest.nav);
  const r3m = pctChange(navOnOrBefore(history, addMonths(latestDate, -3)), latest.nav);
  const r6m = pctChange(navOnOrBefore(history, addMonths(latestDate, -6)), latest.nav);
  const r1y = pctChange(navOnOrBefore(history, addYears(latestDate, -1)), latest.nav);
  const r3yTotal = pctChange(navOnOrBefore(history, addYears(latestDate, -3)), latest.nav);
  const r5yTotal = pctChange(navOnOrBefore(history, addYears(latestDate, -5)), latest.nav);
  const r10yTotal = pctChange(navOnOrBefore(history, addYears(latestDate, -10)), latest.nav);

  const dailyReturns: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const r = pctChange(history[i - 1].nav, history[i].nav);
    if (r !== null) dailyReturns.push(r);
  }
  let volatility: number | null = null;
  if (dailyReturns.length > 1) {
    const mean = dailyReturns.reduce((s, v) => s + v, 0) / dailyReturns.length;
    const variance = dailyReturns.reduce((s, v) => s + (v - mean) ** 2, 0) / (dailyReturns.length - 1);
    volatility = Math.sqrt(variance) * Math.sqrt(252);
  }

  let peak = history[0].nav;
  let maxDrawdown = 0;
  let maxDrawdownDate: string | null = null;
  for (const p of history) {
    if (p.nav > peak) peak = p.nav;
    const dd = p.nav / peak - 1;
    if (dd < maxDrawdown) {
      maxDrawdown = dd;
      maxDrawdownDate = p.date;
    }
  }
  const currentDrawdown = peak > 0 ? latest.nav / peak - 1 : null;

  return {
    latestDate: latest.date,
    latestNav: latest.nav,
    dailyReturn,
    volatility,
    maxDrawdown,
    maxDrawdownDate,
    currentDrawdown,
    inception,
    ytd,
    r1w,
    r1m,
    r3m,
    r6m,
    r1y,
    r3y: annualize(r3yTotal, 3),
    r5y: annualize(r5yTotal, 5),
    r10y: annualize(r10yTotal, 10),
  };
}

export function computeDrawdownSeries(historyRaw: FundHistoryPoint[]): { date: string; drawdown: number }[] {
  const history = sortHistory(historyRaw);
  let peak = -Infinity;
  return history.map((p) => {
    if (p.nav > peak) peak = p.nav;
    return { date: p.date, drawdown: peak > 0 ? p.nav / peak - 1 : 0 };
  });
}

export interface MonthlyReturnRow {
  year: number;
  months: (number | null)[];
  yearReturn: number | null;
}

export function computeMonthlyReturns(historyRaw: FundHistoryPoint[]): MonthlyReturnRow[] {
  const history = sortHistory(historyRaw);
  if (history.length === 0) return [];

  const monthEndNav = new Map<string, number>();
  for (const p of history) {
    const d = new Date(p.date);
    monthEndNav.set(`${d.getFullYear()}-${d.getMonth()}`, p.nav);
  }

  const first = new Date(history[0].date);
  const last = new Date(history[history.length - 1].date);
  const firstMonthKey = `${first.getFullYear()}-${first.getMonth()}`;

  const rows: MonthlyReturnRow[] = [];
  let prevNav: number | null = null;

  for (let y = first.getFullYear(); y <= last.getFullYear(); y++) {
    const months: (number | null)[] = [];
    for (let m = 0; m < 12; m++) {
      const key = `${y}-${m}`;
      const nav = monthEndNav.get(key);
      if (nav === undefined) {
        months.push(null);
        continue;
      }
      if (key === firstMonthKey) {
        months.push(null);
        prevNav = nav;
        continue;
      }
      if (prevNav === null) {
        months.push(null);
        prevNav = nav;
        continue;
      }
      months.push(pctChange(prevNav, nav));
      prevNav = nav;
    }
    const definedMonths = months.filter((m): m is number => m !== null);
    const yearReturn = definedMonths.length > 0 ? definedMonths.reduce((acc, r) => acc * (1 + r), 1) - 1 : null;
    rows.push({ year: y, months, yearReturn });
  }
  return rows;
}
