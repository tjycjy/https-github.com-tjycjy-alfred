import type { CommissionEntry, CommissionRateTier, PremiumFrequency } from '../types';
import { formatDate } from './age';
import { formatCurrency } from './coverageGap';

export const COMMISSION_PAYMENTS_PER_YEAR: Record<PremiumFrequency, number> = {
  Yearly: 1,
  'Half-Yearly': 2,
  Quarterly: 4,
  'Bi-Monthly': 6,
  Monthly: 12,
};

// Insurer commission rates vary year-by-year (e.g. 48% / 23% / 15% / 5% / 5% / 5%) rather than
// stepping down in even bands, and some products pay the same trail rate indefinitely once they
// reach a certain policy year (toYear === null). Find whichever tier covers the given year.
export function commissionPctForYear(tiers: CommissionRateTier[], year: number): number {
  const tier = tiers.find((t) => year >= t.fromYear && (t.toYear === null || year <= t.toYear));
  return tier?.pct ?? 0;
}

// premiumAmount is what the client pays PER INSTALLMENT (not annualized) — a client paying
// $1200/yr monthly pays $100/installment, and commission is a % of each installment as it's
// collected, not a single once-a-year %-of-$1200 lump sum.
export function commissionPerPaymentForYear(e: CommissionEntry, year: number): number {
  return e.premiumAmount * (commissionPctForYear(e.rateTiers, year) / 100);
}

export function commissionAmountForYear(e: CommissionEntry, year: number): number {
  return commissionPerPaymentForYear(e, year) * COMMISSION_PAYMENTS_PER_YEAR[e.paymentFrequency];
}

export function year1CommissionAmount(e: CommissionEntry): number {
  return commissionAmountForYear(e, 1);
}

// FYC (First Year Commission) — the figure MDRT/COT/TOT/IDA award tiers run off. Computed the
// same way here as on the Commission page's "YTD received" so Goals never needs a second,
// manually-kept-in-sync number.
export function ytdFyc(entries: CommissionEntry[], year = new Date().getFullYear()): number {
  return entries
    .filter((e) => new Date(e.date).getFullYear() === year)
    .reduce((s, e) => s + year1CommissionAmount(e), 0);
}

export function tierRangeLabel(t: CommissionRateTier): string {
  if (t.toYear === null) return `Yr ${t.fromYear}+`;
  if (t.toYear === t.fromYear) return `Yr ${t.fromYear}`;
  return `Yr ${t.fromYear}–${t.toYear}`;
}

// e.g. "$30 × 12 = $360/yr" for a monthly-paid tier, or just "$480" for a yearly one-off tier.
export function tierCommissionLabel(e: CommissionEntry, t: CommissionRateTier): string {
  const perPayment = e.premiumAmount * (t.pct / 100);
  const n = COMMISSION_PAYMENTS_PER_YEAR[e.paymentFrequency];
  const annual = perPayment * n;
  const suffix = t.toYear !== t.fromYear ? '/yr' : '';
  if (n === 1) return `${formatCurrency(annual)}${suffix}`;
  return `${formatCurrency(perPayment)} × ${n} = ${formatCurrency(annual)}${suffix}`;
}

function tierScheduleLabel(tiers: CommissionRateTier[]): string {
  return tiers
    .slice()
    .sort((a, b) => a.fromYear - b.fromYear)
    .map((t) => `${tierRangeLabel(t)}: ${t.pct}%`)
    .join('; ');
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function exportCommissionCsv(entries: CommissionEntry[]): void {
  const header = ['Date', 'Client', 'Product', 'Premium per Payment ($)', 'Payment Frequency', 'Rate Schedule', 'Year 1 Commission ($)'];
  const rows = entries.map((e) => [
    formatDate(e.date),
    e.clientName,
    e.product,
    e.premiumAmount.toFixed(2),
    e.paymentFrequency,
    tierScheduleLabel(e.rateTiers),
    year1CommissionAmount(e).toFixed(2),
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `commission-statement-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
