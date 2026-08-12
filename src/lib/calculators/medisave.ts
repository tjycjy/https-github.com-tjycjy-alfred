// Sourced from CPF Board (cpf.gov.sg) — "What are Additional Withdrawal Limits (AWLs) for
// Integrated Shield Plan (IP) premiums?" and "Using your MediSave savings". MediShield Life (MSL)
// base premiums are always fully MediSave-payable; the additional private-insurer coverage on top
// of MSL (i.e. what makes an IP an IP) is capped by an age-banded Additional Withdrawal Limit —
// anything above MSL + AWL must be paid in cash. Bands are keyed by "age next birthday".
export interface AwlBand {
  label: string;
  maxAgeNextBirthday: number | null;
  amount: number;
}

export const IP_AWL_BANDS: AwlBand[] = [
  { label: '40 and below', maxAgeNextBirthday: 40, amount: 300 },
  { label: '41 to 70', maxAgeNextBirthday: 70, amount: 600 },
  { label: '71 and above', maxAgeNextBirthday: null, amount: 900 },
];

export function getAwlForAge(age: number): AwlBand {
  return IP_AWL_BANDS.find((b) => b.maxAgeNextBirthday === null || age <= b.maxAgeNextBirthday) ?? IP_AWL_BANDS[IP_AWL_BANDS.length - 1];
}

// MediShield Life annual premiums before subsidies, by age band (published schedule, last
// reviewed 2024). These estimate the MSL-equivalent portion embedded in an IP's main-plan
// premium — verify the client's exact split against their policy schedule / CPF Board.
export interface MslBand {
  label: string;
  maxAge: number;
  premium: number;
}

export const MEDISHIELD_LIFE_PREMIUMS: MslBand[] = [
  { label: '1–20', maxAge: 20, premium: 190 },
  { label: '21–25', maxAge: 25, premium: 245 },
  { label: '26–30', maxAge: 30, premium: 280 },
  { label: '31–35', maxAge: 35, premium: 330 },
  { label: '36–40', maxAge: 40, premium: 395 },
  { label: '41–45', maxAge: 45, premium: 490 },
  { label: '46–50', maxAge: 50, premium: 625 },
  { label: '51–55', maxAge: 55, premium: 825 },
  { label: '56–60', maxAge: 60, premium: 1090 },
  { label: '61–65', maxAge: 65, premium: 1430 },
  { label: '66–70', maxAge: 70, premium: 1740 },
  { label: '71–73', maxAge: 73, premium: 2015 },
  { label: '74 and above', maxAge: Infinity, premium: 2015 },
];

export function getMslPremiumForAge(age: number): number {
  return (MEDISHIELD_LIFE_PREMIUMS.find((b) => age <= b.maxAge) ?? MEDISHIELD_LIFE_PREMIUMS[MEDISHIELD_LIFE_PREMIUMS.length - 1]).premium;
}

export interface MedisaveSplit {
  medisavePayable: number;
  cashPortion: number;
}

// IP main-plan premium: MediSave covers the MediShield Life portion in full, plus the
// age-banded AWL for the private-insurer top-up — capped at the actual premium.
export function estimateIpMedisaveSplit(annualPremium: number, age: number | null): MedisaveSplit {
  if (age === null) return { medisavePayable: 0, cashPortion: annualPremium };
  const allowance = getMslPremiumForAge(age) + getAwlForAge(age).amount;
  const medisavePayable = Math.min(annualPremium, allowance);
  return { medisavePayable, cashPortion: Math.max(0, annualPremium - medisavePayable) };
}

// Riders (co-payment / deductible riders on top of an IP) have been cash-only since MOH's
// April 2021 reform — MediSave cannot be used for rider premiums at all.
export const IP_RIDER_MEDISAVE_NOTE = 'Riders are cash-only — MediSave cannot pay rider premiums since MOH’s 2021 reform.';

// Hospital cash / income plans are indemnity-style cash payouts, not MediSave-approved
// insurance products (only MediShield Life, IPs, and CareShield/ElderShield qualify).
export const HOSPITAL_CASH_MEDISAVE_NOTE = 'Not a MediSave-approved product — paid entirely in cash.';

// CareShield Life base premiums are fully MediSave-payable. Private CareShield/ElderShield
// supplements (bought to increase the payout beyond the government scheme) are MediSave-payable
// up to $600/year per insured person — the rest is cash.
export const CARESHIELD_SUPPLEMENT_MEDISAVE_CAP = 600;

export function estimateLtcMedisaveSplit(basePremium: number, supplementPremium: number): MedisaveSplit {
  const supplementMedisave = Math.min(supplementPremium, CARESHIELD_SUPPLEMENT_MEDISAVE_CAP);
  const medisavePayable = basePremium + supplementMedisave;
  const cashPortion = Math.max(0, basePremium + supplementPremium - medisavePayable);
  return { medisavePayable, cashPortion };
}
