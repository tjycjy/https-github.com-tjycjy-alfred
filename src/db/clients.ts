import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import type { Client, FamilyMember } from '../types';

export async function listClients(): Promise<Client[]> {
  const db = await getDb();
  const all = await db.getAll('clients');
  return all
    .map((c) => ({ ...c, employmentType: c.employmentType ?? 'Employed' }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getClient(id: string): Promise<Client | undefined> {
  const db = await getDb();
  const client = await db.get('clients', id);
  if (!client) return undefined;
  return { ...client, employmentType: client.employmentType ?? 'Employed' };
}

export async function createClient(input: {
  name: string;
  dob: string | null;
  occupation: string;
  employmentType?: Client['employmentType'];
  salary: number | null;
  address: string;
  notes: string;
  familyMembers?: FamilyMember[];
}): Promise<Client> {
  const db = await getDb();
  const client: Client = {
    id: newId(),
    householdId: null,
    name: input.name,
    dob: input.dob,
    occupation: input.occupation,
    employmentType: input.employmentType ?? 'Employed',
    salary: input.salary,
    address: input.address,
    familyMembers: input.familyMembers ?? [],
    notes: input.notes,
    lastVisitDate: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await db.put('clients', client);
  return client;
}

export async function updateClient(client: Client): Promise<void> {
  const db = await getDb();
  await db.put('clients', { ...client, updatedAt: nowIso() });
}

export async function deleteClient(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('clients', id);
}

export async function touchLastVisit(clientId: string, dateIso: string): Promise<void> {
  const db = await getDb();
  const client = await db.get('clients', clientId);
  if (!client) return;
  if (!client.lastVisitDate || new Date(dateIso) > new Date(client.lastVisitDate)) {
    client.lastVisitDate = dateIso;
    client.updatedAt = nowIso();
    await db.put('clients', client);
  }
}
