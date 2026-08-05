import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import type { Household } from '../types';

export async function listHouseholds(): Promise<Household[]> {
  const db = await getDb();
  return db.getAll('households');
}

export async function getHousehold(id: string): Promise<Household | undefined> {
  const db = await getDb();
  return db.get('households', id);
}

export async function createHousehold(name: string, memberClientIds: string[]): Promise<Household> {
  const db = await getDb();
  const household: Household = {
    id: newId(),
    name,
    memberClientIds,
    createdAt: nowIso(),
  };
  await db.put('households', household);
  const tx = db.transaction('clients', 'readwrite');
  for (const clientId of memberClientIds) {
    const client = await tx.store.get(clientId);
    if (client) {
      client.householdId = household.id;
      await tx.store.put(client);
    }
  }
  await tx.done;
  return household;
}

export async function updateHouseholdMembers(householdId: string, memberClientIds: string[]): Promise<void> {
  const db = await getDb();
  const household = await db.get('households', householdId);
  if (!household) return;
  const removed = household.memberClientIds.filter((id) => !memberClientIds.includes(id));
  household.memberClientIds = memberClientIds;
  await db.put('households', household);
  const tx = db.transaction('clients', 'readwrite');
  for (const clientId of memberClientIds) {
    const client = await tx.store.get(clientId);
    if (client && client.householdId !== householdId) {
      client.householdId = householdId;
      await tx.store.put(client);
    }
  }
  for (const clientId of removed) {
    const client = await tx.store.get(clientId);
    if (client && client.householdId === householdId) {
      client.householdId = null;
      await tx.store.put(client);
    }
  }
  await tx.done;
}

export async function deleteHousehold(id: string): Promise<void> {
  const db = await getDb();
  const household = await db.get('households', id);
  if (household) {
    const tx = db.transaction('clients', 'readwrite');
    for (const clientId of household.memberClientIds) {
      const client = await tx.store.get(clientId);
      if (client) {
        client.householdId = null;
        await tx.store.put(client);
      }
    }
    await tx.done;
  }
  await db.delete('households', id);
}
