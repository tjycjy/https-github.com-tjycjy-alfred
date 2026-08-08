import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import type { FinancialProfile, InvestmentHolding } from '../types';

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

// Investment holdings saved by earlier versions of this app can be missing fields added since
// (fund-splitting allocations, regular-premium schedule, welcome bonus tiers, etc.) — normalize
// every holding on load so older client data never crashes the newer UI/calculations.
function normalizeHolding(h: Partial<InvestmentHolding> & { id: string }): InvestmentHolding {
  return {
    id: h.id,
    fundName: h.fundName ?? '',
    investedAmount: h.investedAmount ?? 0,
    currentValue: h.currentValue ?? 0,
    expectedReturnPct: h.expectedReturnPct ?? 5,
    purchaseDate: h.purchaseDate ?? null,
    allocations: h.allocations ?? [],
    premiumType: h.premiumType ?? 'Single',
    premiumFrequency: h.premiumFrequency ?? 'Yearly',
    premiumTermYears: h.premiumTermYears ?? null,
    welcomeBonusTiers: h.welcomeBonusTiers ?? [],
    loyaltyBonusPct: h.loyaltyBonusPct ?? 0,
    loyaltyBonusStartYear: h.loyaltyBonusStartYear ?? 10,
  };
}

export async function getFinancialProfile(clientId: string): Promise<FinancialProfile> {
  const db = await getDb();
  const existing = await db.getFromIndex('financialProfiles', 'clientId', clientId);
  if (existing) {
    return { ...DEFAULTS, ...existing, investments: (existing.investments ?? []).map(normalizeHolding) };
  }
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
