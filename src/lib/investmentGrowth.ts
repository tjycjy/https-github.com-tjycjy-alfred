import type { FundEntry, InvestmentHolding } from '../types';
import { computeFundSnapshot, navOnOrAfter, navOnOrBefore } from './fundMetrics';

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

function addYearsToDate(dateStr: string, years: number): Date {
  const d = new Date(dateStr);
  return new Date(d.getFullYear() + years, d.getMonth(), d.getDate());
}

interface Track {
  fund: FundEntry;
  principalUnits: number;
  welcomeUnits: number;
  loyaltyUnits: number;
}

// Welcome / Special Welcome bonuses are modelled the way ILPs actually credit them: extra
// units bought in the same fund(s) at the same purchase price, so they compound with the
// fund's own performance rather than sitting as a flat cash add-on.
//
// Loyalty bonus is modelled by simulating each policy-year crediting event using the fund's
// real historical NAV: at each anniversary from the configured start year, the bonus is a
// percentage of the ACCOUNT VALUE at that point in time (not the original premium), added as
// extra units apportioned across the held funds by their value share — exactly how insurers
// describe it in their benefit illustrations. This assumes continuous premiums and no
// withdrawals, since those can suspend or reduce bonus eligibility per the policy's terms.
export function computeHoldingLiveValue(holding: InvestmentHolding, fundsById: Map<string, FundEntry>): HoldingLiveValue | null {
  if (!holding.purchaseDate || holding.allocations.length === 0) return null;
  const totalPercentage = holding.allocations.reduce((s, a) => s + a.percentage, 0);
  if (totalPercentage <= 0) return null;

  const bonusUplift = (holding.welcomeBonusPct + holding.specialWelcomeBonusPct) / 100;
  const tracks: Track[] = [];

  for (const alloc of holding.allocations) {
    const fund = fundsById.get(alloc.fundId);
    if (!fund || fund.history.length === 0) continue;
    const purchaseNav = navOnOrAfter(fund.history, holding.purchaseDate);
    if (purchaseNav === null || purchaseNav === 0) continue;
    const splitAmount = (holding.investedAmount * alloc.percentage) / totalPercentage;
    tracks.push({
      fund,
      principalUnits: splitAmount / purchaseNav,
      welcomeUnits: (splitAmount * bonusUplift) / purchaseNav,
      loyaltyUnits: 0,
    });
  }

  if (tracks.length === 0) return null;

  if (holding.loyaltyBonusPct > 0) {
    const today = new Date();
    for (let year = holding.loyaltyBonusStartYear; ; year++) {
      const anniversary = addYearsToDate(holding.purchaseDate, year);
      if (anniversary > today) break;

      const trackValues = tracks.map((t) => {
        const nav = navOnOrBefore(t.fund.history, anniversary) ?? navOnOrAfter(t.fund.history, holding.purchaseDate!);
        const units = t.principalUnits + t.welcomeUnits + t.loyaltyUnits;
        return { nav, value: nav ? units * nav : 0 };
      });
      const accountValue = trackValues.reduce((s, v) => s + v.value, 0);
      if (accountValue <= 0) continue;

      const bonusTotal = accountValue * (holding.loyaltyBonusPct / 100);
      tracks.forEach((t, i) => {
        const { nav, value } = trackValues[i];
        if (!nav || value <= 0) return;
        const share = value / accountValue;
        t.loyaltyUnits += (bonusTotal * share) / nav;
      });
    }
  }

  const allocations: AllocationLiveValue[] = [];
  let latestDate: string | null = null;
  let welcomeBonusValue = 0;
  let loyaltyBonusValue = 0;
  let baseCurrentValue = 0;

  for (let i = 0; i < tracks.length; i++) {
    const t = tracks[i];
    const alloc = holding.allocations[i];
    const snap = computeFundSnapshot(t.fund.history);
    if (snap.latestNav === null) continue;
    const totalUnits = t.principalUnits + t.welcomeUnits + t.loyaltyUnits;
    const value = totalUnits * snap.latestNav;
    const splitAmount = (holding.investedAmount * alloc.percentage) / totalPercentage;
    const purchaseNav = navOnOrAfter(t.fund.history, holding.purchaseDate) ?? 0;

    allocations.push({
      allocationId: alloc.id,
      fund: t.fund,
      percentage: alloc.percentage,
      splitAmount,
      purchaseNav,
      latestNav: snap.latestNav,
      units: totalUnits,
      value,
    });
    baseCurrentValue += t.principalUnits * snap.latestNav;
    welcomeBonusValue += t.welcomeUnits * snap.latestNav;
    loyaltyBonusValue += t.loyaltyUnits * snap.latestNav;
    if (snap.latestDate && (!latestDate || snap.latestDate > latestDate)) latestDate = snap.latestDate;
  }

  if (allocations.length === 0) return null;

  const currentValue = baseCurrentValue + welcomeBonusValue + loyaltyBonusValue;
  const gainPct = holding.investedAmount > 0 ? ((currentValue - holding.investedAmount) / holding.investedAmount) * 100 : 0;

  return { allocations, baseCurrentValue, welcomeBonusValue, loyaltyBonusValue, currentValue, gainPct, latestDate, totalPercentage };
}
