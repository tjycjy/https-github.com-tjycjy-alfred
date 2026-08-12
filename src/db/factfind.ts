import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import type { FactFind, RetirementGoal } from '../types';

const DEFAULT_RETIREMENT_GOAL: RetirementGoal = {
  desiredMonthlyIncome: null,
  startAge: 65,
  endAge: 85,
  adjustForInflation: true,
  inflationPct: 2.5,
  returnDuringRetirementPct: 3,
};

export async function getFactFindForClient(clientId: string): Promise<FactFind> {
  const db = await getDb();
  const existing = await db.getFromIndex('factfinds', 'clientId', clientId);
  if (existing) {
    return {
      ...existing,
      retirementGoal: { ...DEFAULT_RETIREMENT_GOAL, ...existing.retirementGoal },
      savingsGoals: existing.savingsGoals ?? [],
    };
  }
  const factFind: FactFind = {
    id: newId(),
    clientId,
    dependants: null,
    liabilities: [],
    goals: '',
    riskProfile: '',
    retirementGoal: { ...DEFAULT_RETIREMENT_GOAL },
    savingsGoals: [],
    updatedAt: nowIso(),
  };
  await db.put('factfinds', factFind);
  return factFind;
}

export async function saveFactFind(factFind: FactFind): Promise<void> {
  const db = await getDb();
  await db.put('factfinds', { ...factFind, updatedAt: nowIso() });
}
