import type { CoverageItem } from '../types';

export type GapStatus = 'met' | 'amber' | 'red';

export interface GapResult {
  gap: number;
  ratio: number;
  status: GapStatus;
}

export function computeGap(item: Pick<CoverageItem, 'target' | 'inForce'>): GapResult {
  const target = item.target ?? 0;
  const inForce = item.inForce ?? 0;
  const gap = Math.max(0, target - inForce);
  const ratio = target > 0 ? Math.min(1, inForce / target) : inForce > 0 ? 1 : 1;
  let status: GapStatus = 'met';
  if (target > 0) {
    if (ratio < 0.5) status = 'red';
    else if (ratio < 1) status = 'amber';
    else status = 'met';
  }
  return { gap, ratio, status };
}

export const GAP_STATUS_COLOR: Record<GapStatus, { bg: string; text: string; ring: string }> = {
  met: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'stroke-emerald-500' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'stroke-amber-500' },
  red: { bg: 'bg-rose-100', text: 'text-rose-700', ring: 'stroke-rose-500' },
};

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function combineCoverage(items: CoverageItem[][]): CoverageItem[] {
  const categories = items.flat().map((i) => i.category);
  const uniqueCategories = Array.from(new Set(categories));
  return uniqueCategories.map((category) => {
    const matching = items.flat().filter((i) => i.category === category);
    return {
      category,
      target: matching.reduce((sum, i) => sum + (i.target ?? 0), 0),
      inForce: matching.reduce((sum, i) => sum + (i.inForce ?? 0), 0),
      premium: matching.reduce((sum, i) => sum + (i.premium ?? 0), 0),
      notes: '',
    };
  });
}
