import { parseCsv, num } from '../lib/csv';
import supremeHealthCitizensRaw from './rates/GE_SupremeHealth_Citizens_PR_Premiums.csv?raw';
import supremeHealthForeignerRaw from './rates/GE_SupremeHealth_Foreigner_Premiums.csv?raw';
import totalCare2Raw from './rates/GE_TotalCare2_and_Plus2_Premiums.csv?raw';

export interface SupremeHealthCitizenRow {
  age: number;
  medishieldLifePremium: number;
  pPlusPremium: number;
  pPrimePremium: number;
  aPlusPremium: number;
  bPlusPremium: number;
  standardPremium: number;
}

export interface SupremeHealthForeignerRow {
  age: number;
  pPlusPremium: number;
  pPrimePremium: number;
  aPlusPremium: number;
}

export interface TotalCare2Row {
  age: number;
  pPremium: number;
  primePremium: number;
  aPremium: number;
  bPremium: number;
  essentialPremium: number;
}

function byAge<T extends { age: number }>(rows: T[]): Map<number, T> {
  const map = new Map<number, T>();
  for (const row of rows) map.set(row.age, row);
  return map;
}

const supremeHealthCitizensRows: SupremeHealthCitizenRow[] = parseCsv(supremeHealthCitizensRaw)
  .filter((r) => /^\d+$/.test(r.Age_Next_Birthday))
  .map((r) => ({
    age: num(r.Age_Next_Birthday),
    medishieldLifePremium: num(r.MediShield_Life_Premium),
    pPlusPremium: num(r.P_PLUS_Premium),
    pPrimePremium: num(r.P_PRIME_Premium),
    aPlusPremium: num(r.A_PLUS_Premium),
    bPlusPremium: num(r.B_PLUS_Premium),
    standardPremium: num(r.STANDARD_Premium),
  }));

const supremeHealthForeignerRows: SupremeHealthForeignerRow[] = parseCsv(supremeHealthForeignerRaw)
  .filter((r) => /^\d+$/.test(r.Age_Next_Birthday))
  .map((r) => ({
    age: num(r.Age_Next_Birthday),
    pPlusPremium: num(r.P_PLUS_Annual_Premium),
    pPrimePremium: num(r.P_PRIME_Annual_Premium),
    aPlusPremium: num(r.A_PLUS_Annual_Premium),
  }));

const totalCare2Rows: TotalCare2Row[] = parseCsv(totalCare2Raw)
  .filter((r) => /^\d+$/.test(r.Age_Next_Birthday))
  .map((r) => ({
    age: num(r.Age_Next_Birthday),
    pPremium: num(r.TotalCare2_P_Premium),
    primePremium: num(r.TotalCare2_PRIME_Premium),
    aPremium: num(r.TotalCare2_A_Premium),
    bPremium: num(r.TotalCare2_B_Premium),
    essentialPremium: num(r.TotalCarePlus2_ESSENTIAL_Premium),
  }));

const supremeHealthCitizensByAge = byAge(supremeHealthCitizensRows);
const supremeHealthForeignerByAge = byAge(supremeHealthForeignerRows);
const totalCare2ByAge = byAge(totalCare2Rows);

function clampAge(age: number): number {
  return Math.min(100, Math.max(1, Math.round(age)));
}

export function getSupremeHealthCitizenRates(age: number): SupremeHealthCitizenRow {
  return supremeHealthCitizensByAge.get(clampAge(age)) ?? supremeHealthCitizensRows[0];
}

export function getSupremeHealthForeignerRates(age: number): SupremeHealthForeignerRow {
  return supremeHealthForeignerByAge.get(clampAge(age)) ?? supremeHealthForeignerRows[0];
}

export function getTotalCare2Rates(age: number): TotalCare2Row {
  return totalCare2ByAge.get(clampAge(age)) ?? totalCare2Rows[0];
}

export type SupremeHealthPlan = 'P_PLUS' | 'P_PRIME' | 'A_PLUS' | 'B_PLUS' | 'STANDARD';
export type TotalCare2Plan = 'P' | 'PRIME' | 'A' | 'B' | 'NONE';
export type Residency = 'citizen' | 'foreigner';

export const SUPREME_HEALTH_PLAN_LABELS: Record<SupremeHealthPlan, string> = {
  P_PLUS: 'SupremeHealth P PLUS',
  P_PRIME: 'SupremeHealth P PRIME',
  A_PLUS: 'SupremeHealth A PLUS',
  B_PLUS: 'SupremeHealth B PLUS',
  STANDARD: 'SupremeHealth STANDARD',
};

export const TOTAL_CARE_2_PLAN_LABELS: Record<TotalCare2Plan, string> = {
  P: 'TotalCare 2 P',
  PRIME: 'TotalCare 2 PRIME',
  A: 'TotalCare 2 A',
  B: 'TotalCare 2 B',
  NONE: 'No TotalCare 2 rider',
};

// Annual claim limit per SupremeHealth plan tier — from the GE benefits summary
// (GELS-PDT-PD-GSH-GTC-TOB-ENG, effective 1 Apr 2026). These are fixed per tier,
// unlike premiums, so no age lookup is needed here.
export const SUPREME_HEALTH_ANNUAL_LIMIT: Record<SupremeHealthPlan, number> = {
  P_PLUS: 1_500_000,
  P_PRIME: 1_500_000,
  A_PLUS: 1_200_000,
  B_PLUS: 500_000,
  STANDARD: 200_000,
};

export const P_PRIME_TOP_UP_LIMIT = 1_000_000;

export const SUPREME_HEALTH_WARD_LABELS: Record<SupremeHealthPlan, string> = {
  P_PLUS: 'Private hospital, any ward',
  P_PRIME: 'Private hospital, any ward (with top-up option)',
  A_PLUS: 'Government / Restructured hospital — Ward A',
  B_PLUS: 'Government / Restructured hospital — Ward B1',
  STANDARD: 'Government / Restructured hospital — Ward B1/B2 (lower-cost tier)',
};

export const CITIZEN_PLAN_TIERS: SupremeHealthPlan[] = ['P_PLUS', 'P_PRIME', 'A_PLUS', 'B_PLUS', 'STANDARD'];
export const FOREIGNER_PLAN_TIERS: SupremeHealthPlan[] = ['P_PLUS', 'P_PRIME', 'A_PLUS'];

export function getHospitalPlanAnnualPremium(
  age: number,
  residency: Residency,
  supremePlan: SupremeHealthPlan,
  totalCarePlan: TotalCare2Plan,
): { supremeHealth: number; totalCare2: number; total: number } {
  let supremeHealth = 0;
  if (residency === 'citizen') {
    const row = getSupremeHealthCitizenRates(age);
    const map: Record<SupremeHealthPlan, number> = {
      P_PLUS: row.pPlusPremium,
      P_PRIME: row.pPrimePremium,
      A_PLUS: row.aPlusPremium,
      B_PLUS: row.bPlusPremium,
      STANDARD: row.standardPremium,
    };
    supremeHealth = map[supremePlan];
  } else {
    const row = getSupremeHealthForeignerRates(age);
    const map: Partial<Record<SupremeHealthPlan, number>> = {
      P_PLUS: row.pPlusPremium,
      P_PRIME: row.pPrimePremium,
      A_PLUS: row.aPlusPremium,
    };
    supremeHealth = map[supremePlan] ?? 0;
  }

  let totalCare2 = 0;
  if (totalCarePlan !== 'NONE') {
    const row = getTotalCare2Rates(age);
    const map: Record<Exclude<TotalCare2Plan, 'NONE'>, number> = {
      P: row.pPremium,
      PRIME: row.primePremium,
      A: row.aPremium,
      B: row.bPremium,
    };
    totalCare2 = map[totalCarePlan];
  }

  return { supremeHealth, totalCare2, total: supremeHealth + totalCare2 };
}
