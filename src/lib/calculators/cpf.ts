export interface CpfAgeBand {
  label: string;
  maxAge: number | null;
  employeePct: number;
  employerPct: number;
  oaPct: number;
  saPct: number;
  maPct: number;
}

export const CPF_RATES_NOTE =
  'Rates are indicative (Singapore Citizen / PR 3rd-year-and-above, published multi-year schedule). Verify against the current CPF Board table before using with a client.';

export const CPF_AGE_BANDS: CpfAgeBand[] = [
  { label: '55 and below', maxAge: 55, employeePct: 20, employerPct: 17, oaPct: 23, saPct: 6, maPct: 8 },
  { label: 'Above 55 to 60', maxAge: 60, employeePct: 15, employerPct: 15.5, oaPct: 12.5, saPct: 3.5, maPct: 14.5 },
  { label: 'Above 60 to 65', maxAge: 65, employeePct: 9.5, employerPct: 12, oaPct: 3.5, saPct: 2.5, maPct: 15.5 },
  { label: 'Above 65 to 70', maxAge: 70, employeePct: 7.5, employerPct: 9, oaPct: 1, saPct: 1, maPct: 14.5 },
  { label: 'Above 70', maxAge: null, employeePct: 5, employerPct: 7.5, oaPct: 1, saPct: 1, maPct: 10.5 },
];

export const DEFAULT_OW_CEILING = 7400;

export function getCpfAgeBand(age: number): CpfAgeBand {
  return CPF_AGE_BANDS.find((band) => band.maxAge === null || age <= band.maxAge) ?? CPF_AGE_BANDS[CPF_AGE_BANDS.length - 1];
}

export interface CpfBreakdown {
  band: CpfAgeBand;
  assessableWage: number;
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  oaAmount: number;
  saAmount: number;
  maAmount: number;
  takeHomeAfterCpf: number;
}

export function calcCpfContribution(monthlyWage: number, age: number, owCeiling = DEFAULT_OW_CEILING): CpfBreakdown {
  const band = getCpfAgeBand(age);
  const assessableWage = Math.min(monthlyWage, owCeiling);
  const employeeContribution = assessableWage * (band.employeePct / 100);
  const employerContribution = assessableWage * (band.employerPct / 100);
  const totalContribution = employeeContribution + employerContribution;
  const totalPct = band.oaPct + band.saPct + band.maPct;
  const oaAmount = totalPct > 0 ? (totalContribution * band.oaPct) / totalPct : 0;
  const saAmount = totalPct > 0 ? (totalContribution * band.saPct) / totalPct : 0;
  const maAmount = totalPct > 0 ? (totalContribution * band.maPct) / totalPct : 0;

  return {
    band,
    assessableWage,
    employeeContribution: Math.round(employeeContribution),
    employerContribution: Math.round(employerContribution),
    totalContribution: Math.round(totalContribution),
    oaAmount: Math.round(oaAmount),
    saAmount: Math.round(saAmount),
    maAmount: Math.round(maAmount),
    takeHomeAfterCpf: Math.round(monthlyWage - employeeContribution),
  };
}
