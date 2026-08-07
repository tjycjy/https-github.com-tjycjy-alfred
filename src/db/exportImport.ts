import { getDb } from './db';
import type {
  Client,
  Household,
  MeetingLogEntry,
  Portfolio,
  FactFind,
  Task,
  CommissionEntry,
  PipelineEntry,
  PracticeGoal,
  NewsBriefing,
  FundEntry,
  FinancialProfile,
  CalendarEvent,
  Prospect,
} from '../types';

export interface ExportBundle {
  version: 1;
  exportedAt: string;
  clients: Client[];
  households: Household[];
  meetings: MeetingLogEntry[];
  portfolios: Portfolio[];
  factfinds: FactFind[];
  tasks: Task[];
  commissions: CommissionEntry[];
  pipeline: PipelineEntry[];
  goals: PracticeGoal[];
  news: NewsBriefing[];
  funds: FundEntry[];
  financialProfiles: FinancialProfile[];
  calendarEvents: CalendarEvent[];
  prospects: Prospect[];
}

const STORE_NAMES = [
  'clients',
  'households',
  'meetings',
  'portfolios',
  'factfinds',
  'tasks',
  'commissions',
  'pipeline',
  'goals',
  'news',
  'funds',
  'financialProfiles',
  'calendarEvents',
  'prospects',
] as const;

export async function exportAllData(): Promise<ExportBundle> {
  const db = await getDb();
  const bundle: Partial<ExportBundle> = {
    version: 1,
    exportedAt: new Date().toISOString(),
  };
  for (const store of STORE_NAMES) {
    (bundle as Record<string, unknown>)[store] = await db.getAll(store);
  }
  return bundle as ExportBundle;
}

export function downloadExport(bundle: ExportBundle, filenamePrefix = 'fa-dashboard-backup'): void {
  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${filenamePrefix}-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function exportClientData(clientId: string): Promise<Record<string, unknown>> {
  const db = await getDb();
  const client = await db.get('clients', clientId);
  const meetings = await db.getAllFromIndex('meetings', 'clientId', clientId);
  const portfolio = await db.getFromIndex('portfolios', 'clientId', clientId);
  const factfind = await db.getFromIndex('factfinds', 'clientId', clientId);
  const tasks = await db.getAllFromIndex('tasks', 'clientId', clientId);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    client,
    meetings,
    portfolio,
    factfind,
    tasks,
  };
}

export type ImportMode = 'merge' | 'replace';

export async function importData(bundle: ExportBundle, mode: ImportMode = 'merge'): Promise<void> {
  const db = await getDb();
  for (const store of STORE_NAMES) {
    const tx = db.transaction(store, 'readwrite');
    if (mode === 'replace') {
      await tx.store.clear();
    }
    const records = ((bundle[store] as unknown) as Record<string, unknown>[] | undefined) ?? [];
    for (const record of records) {
      await tx.store.put(record as never);
    }
    await tx.done;
  }
}

export function parseImportFile(file: File): Promise<ExportBundle> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        resolve(parsed as ExportBundle);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
