export type CompoundingFrequency = 'annual' | 'semiAnnual' | 'quarterly' | 'monthly';

export const COMPOUNDING_PERIODS_PER_YEAR: Record<CompoundingFrequency, number> = {
  annual: 1,
  semiAnnual: 2,
  quarterly: 4,
  monthly: 12,
};

export interface CompoundInterestPoint {
  year: number;
  balance: number;
  contributed: number;
}

export function compoundInterestSeries(
  principal: number,
  annualRatePct: number,
  years: number,
  frequency: CompoundingFrequency,
  monthlyContribution = 0,
): CompoundInterestPoint[] {
  const periodsPerYear = COMPOUNDING_PERIODS_PER_YEAR[frequency];
  const ratePerPeriod = annualRatePct / 100 / periodsPerYear;
  const contributionPerPeriod = (monthlyContribution * 12) / periodsPerYear;

  const points: CompoundInterestPoint[] = [{ year: 0, balance: principal, contributed: principal }];
  let balance = principal;
  let contributed = principal;

  for (let year = 1; year <= years; year++) {
    for (let p = 0; p < periodsPerYear; p++) {
      balance = balance * (1 + ratePerPeriod) + contributionPerPeriod;
      contributed += contributionPerPeriod;
    }
    points.push({ year, balance: Math.round(balance), contributed: Math.round(contributed) });
  }
  return points;
}

export function futureValue(
  presentValue: number,
  annualRatePct: number,
  years: number,
  monthlyContribution = 0,
): number {
  const series = compoundInterestSeries(presentValue, annualRatePct, years, 'monthly', monthlyContribution);
  return series[series.length - 1]?.balance ?? presentValue;
}

export function cagr(initialValue: number, finalValue: number, years: number): number {
  if (initialValue <= 0 || years <= 0) return 0;
  return (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
}

export function totalRoiPct(initialValue: number, finalValue: number): number {
  if (initialValue <= 0) return 0;
  return ((finalValue - initialValue) / initialValue) * 100;
}

export function requiredMonthlyContribution(
  targetSum: number,
  years: number,
  annualRatePct: number,
  currentSavings = 0,
): number {
  const months = years * 12;
  if (months <= 0) return 0;
  const monthlyRate = annualRatePct / 100 / 12;
  const growthOfCurrent = currentSavings * Math.pow(1 + monthlyRate, months);
  const remainingTarget = Math.max(0, targetSum - growthOfCurrent);
  if (monthlyRate === 0) return remainingTarget / months;
  const factor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
  return remainingTarget / factor;
}

export function retirementNestEgg(
  desiredMonthlyIncome: number,
  yearsInRetirement: number,
  annualReturnDuringRetirementPct: number,
  inflationPct = 0,
  yearsToRetirement = 0,
): number {
  const inflatedMonthlyIncome = desiredMonthlyIncome * Math.pow(1 + inflationPct / 100, yearsToRetirement);
  const monthlyReturn = annualReturnDuringRetirementPct / 100 / 12;
  const months = yearsInRetirement * 12;
  if (months <= 0) return 0;
  if (monthlyReturn === 0) return inflatedMonthlyIncome * months;
  return inflatedMonthlyIncome * ((1 - Math.pow(1 + monthlyReturn, -months)) / monthlyReturn);
}

export interface AccumulationPoint {
  month: number;
  year: number;
  balance: number;
}

export function simulateAccumulation(
  initialLumpSum: number,
  monthlyContribution: number,
  annualGrowthPct: number,
  targetAmount: number,
  maxYears = 40,
): { series: AccumulationPoint[]; monthsToTarget: number | null } {
  const monthlyRate = annualGrowthPct / 100 / 12;
  const maxMonths = maxYears * 12;
  const series: AccumulationPoint[] = [{ month: 0, year: 0, balance: Math.round(initialLumpSum) }];
  let balance = initialLumpSum;
  let monthsToTarget: number | null = balance >= targetAmount ? 0 : null;

  for (let m = 1; m <= maxMonths; m++) {
    balance = balance * (1 + monthlyRate) + monthlyContribution;
    if (m % 12 === 0) {
      series.push({ month: m, year: m / 12, balance: Math.round(balance) });
    }
    if (monthsToTarget === null && balance >= targetAmount) {
      monthsToTarget = m;
    }
  }
  return { series, monthsToTarget };
}

export function requiredPrincipalForYield(annualIncomeNeeded: number, dividendYieldPct: number): number {
  if (dividendYieldPct <= 0) return Infinity;
  return annualIncomeNeeded / (dividendYieldPct / 100);
}

export function formatYearsMonths(months: number | null): string {
  if (months === null) return 'Beyond projection horizon';
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0) return `${remMonths} month${remMonths === 1 ? '' : 's'}`;
  if (remMonths === 0) return `${years} year${years === 1 ? '' : 's'}`;
  return `${years}y ${remMonths}m`;
}
