import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import { COVERAGE_CATEGORIES } from '../types';
import type { Portfolio, PortfolioPerson, CoverageItem } from '../types';

export function emptyCoverage(): CoverageItem[] {
  return COVERAGE_CATEGORIES.map((category) => ({ category, target: 0, inForce: 0, premium: 0, notes: '' }));
}

export async function getPortfolioForClient(clientId: string): Promise<Portfolio> {
  const db = await getDb();
  const existing = await db.getFromIndex('portfolios', 'clientId', clientId);
  if (existing) {
    return {
      ...existing,
      people: existing.people.map((person) => ({
        ...person,
        coverage: person.coverage.map((c) => ({ ...c, premium: c.premium ?? 0 })),
      })),
    };
  }
  const portfolio: Portfolio = {
    id: newId(),
    clientId,
    people: [],
    updatedAt: nowIso(),
  };
  await db.put('portfolios', portfolio);
  return portfolio;
}

export async function savePortfolio(portfolio: Portfolio): Promise<void> {
  const db = await getDb();
  await db.put('portfolios', { ...portfolio, updatedAt: nowIso() });
}

export function newPortfolioPerson(label: string, relationship: PortfolioPerson['relationship']): PortfolioPerson {
  return {
    personId: crypto.randomUUID(),
    label,
    relationship,
    coverage: emptyCoverage(),
  };
}
