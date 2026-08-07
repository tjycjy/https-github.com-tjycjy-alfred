import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import type { FinancialProfile } from '../types';

const DEFAULTS: Omit<FinancialProfile, 'id' | 'clientId' | 'updatedAt'> = {
  incomeItems: [],
  expenseItems: [],
  assets: [],
  cpfOA: 0,
  cpfSA: 0,
  cpfMA: 0,
  cpfRA: 0,
  investments: [],
  retirementAge: 65,
  lifeExpectancyAge: 85,
  salaryGrowthPct: 3,
  expenseInflationPct: 2.5,
  lifeEvents: [],
};

export async function getFinancialProfile(clientId: string): Promise<FinancialProfile> {
  const db = await getDb();
  const existing = await db.getFromIndex('financialProfiles', 'clientId', clientId);
  if (existing) return { ...DEFAULTS, ...existing };
  const profile: FinancialProfile = {
    id: newId(),
    clientId,
    ...DEFAULTS,
    updatedAt: nowIso(),
  };
  await db.put('financialProfiles', profile);
  return profile;
}

export async function saveFinancialProfile(profile: FinancialProfile): Promise<void> {
  const db = await getDb();
  await db.put('financialProfiles', { ...profile, updatedAt: nowIso() });
}
