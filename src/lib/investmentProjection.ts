import type { InvestmentHolding, PremiumFrequency } from '../types';
import type { HoldingLiveValue } from './investmentGrowth';

export interface ProjectionPoint {
  year: number;
  balance: number;
}

export interface HoldingProjection {
  points: { year: number; value: number; loyaltyBonusThisYear: number }[];
  firstLoyaltyYear: number | null;
  firstLoyaltyValue: number | null;
  firstLoyaltyBonusAmount: number | null;
}

const PAYMENTS_PER_YEAR: Record<PremiumFrequency, number> = {
  Yearly: 1,
  'Half-Yearly': 2,
  Quarterly: 4,
  'Bi-Monthly': 6,
  Monthly: 12,
};

function currentPolicyYear(purchaseDate: string): number {
  const yearsHeld = (Date.now() - new Date(purchaseDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(yearsHeld) + 1;
}

// Forward-looking projection for a single holding, starting from its real value today and
// simulated one policy-year at a time using the advisor's assumed growth rate: each future
// year adds that year's regular premium (if the holding is still within its payment term),
// applies the assumed annual return, then — once the policy reaches the configured loyalty
// bonus start year — credits that year's loyalty bonus as a percentage of the resulting
// account value, same mechanic as the real historical simulation but projected forward.
export function projectHolding(holding: InvestmentHolding, startValue: number, maxYears: number): HoldingProjection {
  const points: HoldingProjection['points'] = [{ year: 0, value: startValue, loyaltyBonusThisYear: 0 }];
  if (!holding.purchaseDate) {
    for (let y = 1; y <= maxYears; y++) points.push({ year: y, value: startValue, loyaltyBonusThisYear: 0 });
    return { points, firstLoyaltyYear: null, firstLoyaltyValue: null, firstLoyaltyBonusAmount: null };
  }

  const basePolicyYear = currentPolicyYear(holding.purchaseDate);
  const paymentsPerYear = holding.premiumType === 'Regular' ? PAYMENTS_PER_YEAR[holding.premiumFrequency] : 0;

  let value = startValue;
  let firstLoyaltyYear: number | null = null;
  let firstLoyaltyValue: number | null = null;
  let firstLoyaltyBonusAmount: number | null = null;

  for (let y = 1; y <= maxYears; y++) {
    const policyYear = basePolicyYear + y;
    const stillPaying =
      holding.premiumType === 'Regular' && (holding.premiumTermYears === null || policyYear <= holding.premiumTermYears);

    if (stillPaying) {
      const bonusPct = holding.welcomeBonusTiers.filter((t) => t.policyYear === policyYear).reduce((s, t) => s + t.percentage, 0);
      const annualContribution = holding.investedAmount * paymentsPerYear;
      value += annualContribution * (1 + bonusPct / 100);
    }

    const rate = holding.expectedReturnPct / 100;
    value = value * (1 + rate);

    let loyaltyBonusThisYear = 0;
    if (holding.loyaltyBonusPct > 0 && policyYear >= holding.loyaltyBonusStartYear) {
      loyaltyBonusThisYear = value * (holding.loyaltyBonusPct / 100);
      value += loyaltyBonusThisYear;
      if (firstLoyaltyYear === null) {
        firstLoyaltyYear = y;
        firstLoyaltyValue = value;
        firstLoyaltyBonusAmount = loyaltyBonusThisYear;
      }
    }

    points.push({ year: y, value, loyaltyBonusThisYear });
  }

  return { points, firstLoyaltyYear, firstLoyaltyValue, firstLoyaltyBonusAmount };
}

export function projectPortfolio(
  holdings: InvestmentHolding[],
  liveValues: Map<string, HoldingLiveValue>,
  years: number,
): ProjectionPoint[] {
  const perHolding = holdings.map((h) => {
    const startValue = liveValues.get(h.id)?.currentValue ?? h.currentValue;
    return projectHolding(h, startValue, years).points;
  });

  const totals: ProjectionPoint[] = [];
  for (let y = 0; y <= years; y++) {
    const balance = perHolding.reduce((s, points) => s + (points[y]?.value ?? 0), 0);
    totals.push({ year: y, balance: Math.round(balance) });
  }
  return totals;
}
