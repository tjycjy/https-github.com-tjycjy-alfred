import type { FundEntry, InvestmentHolding, PremiumFrequency } from '../types';
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
  totalInvested: number;
  paymentCount: number;
}

function addYearsToDate(dateStr: string, years: number): Date {
  const d = new Date(dateStr);
  return new Date(d.getFullYear() + years, d.getMonth(), d.getDate());
}

function addMonthsToDate(dateStr: string, months: number): Date {
  const d = new Date(dateStr);
  return new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
}

const FREQUENCY_MONTHS: Record<PremiumFrequency, number> = {
  Yearly: 12,
  'Half-Yearly': 6,
  Quarterly: 3,
  'Bi-Monthly': 2,
  Monthly: 1,
};

interface PaymentEvent {
  date: Date;
  kind: 'payment';
  policyYear: number;
}
interface LoyaltyEvent {
  date: Date;
  kind: 'loyalty';
}
type TimelineEvent = PaymentEvent | LoyaltyEvent;

function generatePaymentEvents(holding: InvestmentHolding): PaymentEvent[] {
  if (!holding.purchaseDate) return [];
  if (holding.premiumType === 'Single') {
    return [{ date: new Date(holding.purchaseDate), kind: 'payment', policyYear: 1 }];
  }
  const today = new Date();
  const stepMonths = FREQUENCY_MONTHS[holding.premiumFrequency];
  const termEnd = holding.premiumTermYears !== null ? addYearsToDate(holding.purchaseDate, holding.premiumTermYears) : null;
  const events: PaymentEvent[] = [];
  for (let i = 0; i < 1200; i++) {
    const d = addMonthsToDate(holding.purchaseDate, stepMonths * i);
    if (d > today) break;
    if (termEnd && d >= termEnd) break;
    events.push({ date: d, kind: 'payment', policyYear: Math.floor((stepMonths * i) / 12) + 1 });
  }
  return events;
}

function generateLoyaltyEvents(holding: InvestmentHolding): LoyaltyEvent[] {
  if (!holding.purchaseDate || holding.loyaltyBonusPct <= 0) return [];
  const today = new Date();
  const events: LoyaltyEvent[] = [];
  for (let year = holding.loyaltyBonusStartYear; year < 200; year++) {
    const anniversary = addYearsToDate(holding.purchaseDate, year);
    if (anniversary > today) break;
    events.push({ date: anniversary, kind: 'loyalty' });
  }
  return events;
}

interface Track {
  fund: FundEntry;
  principalUnits: number;
  welcomeUnits: number;
  loyaltyUnits: number;
}

// Welcome bonuses are modelled the way ILPs actually credit them: extra units bought in the
// same fund(s) at the same NAV as the premium that earned them, so they compound with the
// fund rather than sitting as a flat cash add-on. Each premium payment is matched against the
// welcome bonus tier(s) for that policy year, so a bonus that's front-loaded into year 1 only,
// or spread across years 1-3, is modelled exactly as configured.
//
// Loyalty bonus is simulated by walking the real historical NAV at each policy anniversary
// from the configured start year: the bonus is a percentage of the account value at that point
// in time (not the original premium), added as extra units apportioned across the held funds
// by value share, then compounded forward — matching how insurers describe it in their benefit
// illustrations. This assumes continuous premiums and no withdrawals.
export function computeHoldingLiveValue(holding: InvestmentHolding, fundsById: Map<string, FundEntry>): HoldingLiveValue | null {
  if (!holding.purchaseDate || holding.allocations.length === 0) return null;
  const totalPercentage = holding.allocations.reduce((s, a) => s + a.percentage, 0);
  if (totalPercentage <= 0) return null;

  const resolved = holding.allocations
    .map((alloc) => ({ alloc, fund: fundsById.get(alloc.fundId) }))
    .filter((x): x is { alloc: (typeof holding.allocations)[number]; fund: FundEntry } => !!x.fund && x.fund.history.length > 0);
  if (resolved.length === 0) return null;

  const tracks: Track[] = resolved.map((x) => ({ fund: x.fund, principalUnits: 0, welcomeUnits: 0, loyaltyUnits: 0 }));

  const paymentEvents = generatePaymentEvents(holding);
  const timeline: TimelineEvent[] = [...paymentEvents, ...generateLoyaltyEvents(holding)].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  let totalInvested = 0;

  for (const event of timeline) {
    if (event.kind === 'payment') {
      totalInvested += holding.investedAmount;
      const bonusPct = holding.welcomeBonusTiers
        .filter((t) => t.policyYear === event.policyYear)
        .reduce((s, t) => s + t.percentage, 0);
      const dateStr = event.date.toISOString().slice(0, 10);
      resolved.forEach((x, i) => {
        const nav = navOnOrAfter(x.fund.history, dateStr);
        if (!nav) return;
        const split = (holding.investedAmount * x.alloc.percentage) / totalPercentage;
        tracks[i].principalUnits += split / nav;
        if (bonusPct > 0) tracks[i].welcomeUnits += (split * bonusPct) / 100 / nav;
      });
    } else {
      const values = resolved.map((x, i) => {
        const nav = navOnOrBefore(x.fund.history, event.date) ?? navOnOrAfter(x.fund.history, holding.purchaseDate!);
        const t = tracks[i];
        const units = t.principalUnits + t.welcomeUnits + t.loyaltyUnits;
        return { nav, value: nav ? units * nav : 0 };
      });
      const accountValue = values.reduce((s, v) => s + v.value, 0);
      if (accountValue > 0) {
        const bonusTotal = accountValue * (holding.loyaltyBonusPct / 100);
        tracks.forEach((t, i) => {
          const { nav, value } = values[i];
          if (!nav || value <= 0) return;
          t.loyaltyUnits += (bonusTotal * (value / accountValue)) / nav;
        });
      }
    }
  }

  const allocations: AllocationLiveValue[] = [];
  let latestDate: string | null = null;
  let welcomeBonusValue = 0;
  let loyaltyBonusValue = 0;
  let baseCurrentValue = 0;

  resolved.forEach((x, i) => {
    const t = tracks[i];
    const snap = computeFundSnapshot(x.fund.history);
    if (snap.latestNav === null) return;
    const totalUnits = t.principalUnits + t.welcomeUnits + t.loyaltyUnits;
    const value = totalUnits * snap.latestNav;
    const purchaseNav = navOnOrAfter(x.fund.history, holding.purchaseDate!) ?? 0;

    allocations.push({
      allocationId: x.alloc.id,
      fund: x.fund,
      percentage: x.alloc.percentage,
      splitAmount: (holding.investedAmount * x.alloc.percentage) / totalPercentage,
      purchaseNav,
      latestNav: snap.latestNav,
      units: totalUnits,
      value,
    });
    baseCurrentValue += t.principalUnits * snap.latestNav;
    welcomeBonusValue += t.welcomeUnits * snap.latestNav;
    loyaltyBonusValue += t.loyaltyUnits * snap.latestNav;
    if (snap.latestDate && (!latestDate || snap.latestDate > latestDate)) latestDate = snap.latestDate;
  });

  if (allocations.length === 0) return null;

  const currentValue = baseCurrentValue + welcomeBonusValue + loyaltyBonusValue;
  const gainPct = totalInvested > 0 ? ((currentValue - totalInvested) / totalInvested) * 100 : 0;

  return {
    allocations,
    baseCurrentValue,
    welcomeBonusValue,
    loyaltyBonusValue,
    currentValue,
    gainPct,
    latestDate,
    totalPercentage,
    totalInvested,
    paymentCount: paymentEvents.length,
  };
}
