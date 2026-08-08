import type { CommissionEntry } from '../types';

export function year1CommissionAmount(e: CommissionEntry): number {
  return e.premiumAmount * (e.year1Pct / 100);
}

export function year2to5CommissionAmount(e: CommissionEntry): number {
  return e.premiumAmount * (e.year2to5Pct / 100);
}

export function year6PlusCommissionAmount(e: CommissionEntry): number {
  return e.premiumAmount * (e.year6PlusPct / 100);
}

// FYC (First Year Commission) — the figure MDRT/COT/TOT/IDA award tiers run off. Computed the
// same way here as on the Commission page's "YTD received" so Goals never needs a second,
// manually-kept-in-sync number.
export function ytdFyc(entries: CommissionEntry[], year = new Date().getFullYear()): number {
  return entries
    .filter((e) => new Date(e.date).getFullYear() === year)
    .reduce((s, e) => s + year1CommissionAmount(e), 0);
}
