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
  AppSettings,
  Brochure,
  MeetingRecording,
  KnowledgeDoc,
} from '../types';

type ExportedBrochure = Omit<Brochure, 'file'> & { file: string };
type ExportedRecording = Omit<MeetingRecording, 'audio'> & { audio: string };
type ExportedKnowledgeDoc = Omit<KnowledgeDoc, 'file'> & { file: string };

export interface ExportBundle {
  version: 2;
  exportedAt: string;
  settings: AppSettings | null;
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
  brochures: ExportedBrochure[];
  recordings: ExportedRecording[];
  knowledgeDocs: ExportedKnowledgeDoc[];
}

// Plain JSON-serializable stores — copied across as-is.
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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function exportAllData(): Promise<ExportBundle> {
  const db = await getDb();
  const bundle: Partial<ExportBundle> = {
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: (await db.get('settings', 'settings')) ?? null,
  };
  for (const store of STORE_NAMES) {
    (bundle as Record<string, unknown>)[store] = await db.getAll(store);
  }

  const [brochures, recordings, knowledgeDocs] = await Promise.all([
    db.getAll('brochures'),
    db.getAll('recordings'),
    db.getAll('knowledgeDocs'),
  ]);
  bundle.brochures = await Promise.all(brochures.map(async (b) => ({ ...b, file: await blobToDataUrl(b.file) })));
  bundle.recordings = await Promise.all(recordings.map(async (r) => ({ ...r, audio: await blobToDataUrl(r.audio) })));
  bundle.knowledgeDocs = await Promise.all(knowledgeDocs.map(async (k) => ({ ...k, file: await blobToDataUrl(k.file) })));

  return bundle as ExportBundle;
}

export function downloadExport(bundle: ExportBundle, filenamePrefix = 'alfred-backup'): void {
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

  if (bundle.settings) {
    await db.put('settings', bundle.settings);
  }

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

  const blobStores: { name: 'brochures' | 'recordings' | 'knowledgeDocs'; field: 'file' | 'audio' }[] = [
    { name: 'brochures', field: 'file' },
    { name: 'recordings', field: 'audio' },
    { name: 'knowledgeDocs', field: 'file' },
  ];
  for (const { name, field } of blobStores) {
    const records = (bundle[name] as Record<string, unknown>[] | undefined) ?? [];
    if (mode === 'replace') {
      const tx = db.transaction(name, 'readwrite');
      await tx.store.clear();
      await tx.done;
    }
    for (const record of records) {
      const dataUrl = record[field];
      if (typeof dataUrl !== 'string') continue;
      const blob = await dataUrlToBlob(dataUrl);
      await db.put(name, { ...record, [field]: blob } as never);
    }
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
