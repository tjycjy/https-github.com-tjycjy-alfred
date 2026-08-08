import type { FundEntry, InvestmentHolding } from '../types';
import { computeFundSnapshot, navOnOrAfter } from './fundMetrics';

export interface AllocationLiveValue {
  allocationId: string;
  fund: FundEntry;
  percentage: number;
  splitAmount: number;
  purchaseNav: number;
  latestNav: number;
  units: number;
  value: number;
}

export interface HoldingLiveValue {
  allocations: AllocationLiveValue[];
  baseCurrentValue: number;
  welcomeBonusValue: number;
  loyaltyBonusValue: number;
  currentValue: number;
  gainPct: number;
  latestDate: string | null;
  totalPercentage: number;
}

// Welcome / Special Welcome bonuses are modelled the way GREAT Wealth Advantage-style ILPs
// actually credit them: extra units bought in the same funds at the same purchase price, so
// they compound with the fund's own performance rather than sitting as a flat cash add-on.
//
// Loyalty bonus is fundamentally different (a periodic credit from a policy anniversary
// onward) and its exact mechanics vary by policy series, so it's modelled as a clearly
// labelled illustrative estimate — advisors should confirm exact figures against the
// client's Benefit Illustration before quoting them.
export function computeHoldingLiveValue(holding: InvestmentHolding, fundsById: Map<string, FundEntry>): HoldingLiveValue | null {
  if (!holding.purchaseDate || holding.allocations.length === 0) return null;
  const totalPercentage = holding.allocations.reduce((s, a) => s + a.percentage, 0);
  if (totalPercentage <= 0) return null;

  const bonusUplift = 1 + (holding.welcomeBonusPct + holding.specialWelcomeBonusPct) / 100;
  const allocations: AllocationLiveValue[] = [];
  let latestDate: string | null = null;

  for (const alloc of holding.allocations) {
    const fund = fundsById.get(alloc.fundId);
    if (!fund || fund.history.length === 0) continue;
    const purchaseNav = navOnOrAfter(fund.history, holding.purchaseDate);
    if (purchaseNav === null || purchaseNav === 0) continue;
    const snap = computeFundSnapshot(fund.history);
    if (snap.latestNav === null) continue;
    const splitAmount = (holding.investedAmount * alloc.percentage) / totalPercentage;
    const units = (splitAmount * bonusUplift) / purchaseNav;
    const value = units * snap.latestNav;
    allocations.push({
      allocationId: alloc.id,
      fund,
      percentage: alloc.percentage,
      splitAmount,
      purchaseNav,
      latestNav: snap.latestNav,
      units,
      value,
    });
    if (snap.latestDate && (!latestDate || snap.latestDate > latestDate)) latestDate = snap.latestDate;
  }

  if (allocations.length === 0) return null;

  const baseCurrentValue = allocations.reduce((s, a) => s + a.value, 0);
  const welcomeBonusValue = bonusUplift > 0 ? baseCurrentValue - baseCurrentValue / bonusUplift : 0;

  let loyaltyBonusValue = 0;
  if (holding.loyaltyBonusPct > 0) {
    const yearsHeld = (Date.now() - new Date(holding.purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const qualifyingYears = Math.max(0, Math.floor(yearsHeld) - holding.loyaltyBonusStartYear + 1);
    loyaltyBonusValue = baseCurrentValue * (holding.loyaltyBonusPct / 100) * qualifyingYears;
  }

  const currentValue = baseCurrentValue + loyaltyBonusValue;
  const gainPct = holding.investedAmount > 0 ? ((currentValue - holding.investedAmount) / holding.investedAmount) * 100 : 0;

  return { allocations, baseCurrentValue, welcomeBonusValue, loyaltyBonusValue, currentValue, gainPct, latestDate, totalPercentage };
}
