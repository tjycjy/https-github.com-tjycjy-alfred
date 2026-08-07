import { calcCpfContribution } from './cpf';
import type { LifeEvent } from '../../types';

export interface CashflowYearRow {
  age: number;
  year: number;
  status: 'Working' | 'Retired';
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySurplus: number;
  cpfContribution: number;
  annualSurplus: number;
  cumulativeSavings: number;
  activeEvents: string[];
}

export interface CashflowProjectionParams {
  currentAge: number;
  startYear: number;
  baseMonthlyIncome: number;
  baseMonthlyExpenses: number;
  salaryGrowthPct: number;
  expenseInflationPct: number;
  retirementAge: number;
  lifeExpectancyAge: number;
  lifeEvents: LifeEvent[];
  startingSavings: number;
}

export function projectCashflow(params: CashflowProjectionParams): CashflowYearRow[] {
  const {
    currentAge, startYear, baseMonthlyIncome, baseMonthlyExpenses,
    salaryGrowthPct, expenseInflationPct, retirementAge, lifeExpectancyAge,
    lifeEvents, startingSavings,
  } = params;

  const rows: CashflowYearRow[] = [];
  let cumulativeSavings = startingSavings;

  for (let age = currentAge; age <= Math.max(currentAge, lifeExpectancyAge); age++) {
    const yearsElapsed = age - currentAge;
    const isWorking = age < retirementAge;
    const status: 'Working' | 'Retired' = isWorking ? 'Working' : 'Retired';

    const grownIncome = isWorking ? baseMonthlyIncome * Math.pow(1 + salaryGrowthPct / 100, yearsElapsed) : 0;
    const grownExpenses = baseMonthlyExpenses * Math.pow(1 + expenseInflationPct / 100, yearsElapsed);

    const activeEvents = lifeEvents.filter((e) => age >= e.startAge && (e.endAge === null || age <= e.endAge));
    const incomeDelta = activeEvents.reduce((s, e) => s + e.incomeDeltaMonthly, 0);
    const expenseDelta = activeEvents.reduce((s, e) => s + e.expenseDeltaMonthly, 0);

    const monthlyIncomeGross = Math.max(0, grownIncome + incomeDelta);
    const monthlyExpenses = Math.max(0, grownExpenses + expenseDelta);

    const cpf = isWorking && monthlyIncomeGross > 0 ? calcCpfContribution(monthlyIncomeGross, age) : null;
    const monthlyTakeHome = cpf ? cpf.takeHomeAfterCpf : monthlyIncomeGross;
    const monthlySurplus = monthlyTakeHome - monthlyExpenses;
    const annualSurplus = monthlySurplus * 12;
    cumulativeSavings += annualSurplus;

    rows.push({
      age,
      year: startYear + yearsElapsed,
      status,
      monthlyIncome: Math.round(monthlyTakeHome),
      monthlyExpenses: Math.round(monthlyExpenses),
      monthlySurplus: Math.round(monthlySurplus),
      cpfContribution: cpf ? Math.round(cpf.totalContribution * 12) : 0,
      annualSurplus: Math.round(annualSurplus),
      cumulativeSavings: Math.round(cumulativeSavings),
      activeEvents: activeEvents.map((e) => e.label),
    });
  }
  return rows;
}
