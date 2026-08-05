export interface TaxBracket {
  upTo: number | null;
  ratePct: number;
}

export const SG_RESIDENT_TAX_BRACKETS: TaxBracket[] = [
  { upTo: 20000, ratePct: 0 },
  { upTo: 30000, ratePct: 2 },
  { upTo: 40000, ratePct: 3.5 },
  { upTo: 80000, ratePct: 7 },
  { upTo: 120000, ratePct: 11.5 },
  { upTo: 160000, ratePct: 15 },
  { upTo: 200000, ratePct: 18 },
  { upTo: 240000, ratePct: 19 },
  { upTo: 280000, ratePct: 19.5 },
  { upTo: 320000, ratePct: 20 },
  { upTo: null, ratePct: 24 },
];

export interface TaxBracketBreakdown {
  from: number;
  to: number | null;
  ratePct: number;
  taxInBracket: number;
}

export interface TaxResult {
  chargeableIncome: number;
  totalTax: number;
  effectiveRatePct: number;
  breakdown: TaxBracketBreakdown[];
}

export function calcResidentIncomeTax(chargeableIncome: number): TaxResult {
  const income = Math.max(0, chargeableIncome);
  let remaining = income;
  let lowerBound = 0;
  let totalTax = 0;
  const breakdown: TaxBracketBreakdown[] = [];

  for (const bracket of SG_RESIDENT_TAX_BRACKETS) {
    const bandWidth = bracket.upTo === null ? remaining : Math.max(0, Math.min(remaining, bracket.upTo - lowerBound));
    const taxInBracket = bandWidth * (bracket.ratePct / 100);
    if (bandWidth > 0) {
      breakdown.push({ from: lowerBound, to: bracket.upTo, ratePct: bracket.ratePct, taxInBracket });
      totalTax += taxInBracket;
      remaining -= bandWidth;
    }
    lowerBound = bracket.upTo ?? lowerBound;
    if (remaining <= 0) break;
  }

  return {
    chargeableIncome: income,
    totalTax: Math.round(totalTax),
    effectiveRatePct: income > 0 ? (totalTax / income) * 100 : 0,
    breakdown,
  };
}
