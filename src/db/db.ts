import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
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
  AppSettings,
  Brochure,
  MeetingRecording,
  NewsBriefing,
  FundEntry,
  KnowledgeDoc,
  FinancialProfile,
} from '../types';

interface FaDashboardSchema extends DBSchema {
  clients: { key: string; value: Client; indexes: { householdId: string } };
  households: { key: string; value: Household };
  meetings: { key: string; value: MeetingLogEntry; indexes: { clientId: string } };
  portfolios: { key: string; value: Portfolio; indexes: { clientId: string } };
  factfinds: { key: string; value: FactFind; indexes: { clientId: string } };
  tasks: { key: string; value: Task; indexes: { clientId: string; status: string } };
  commissions: { key: string; value: CommissionEntry };
  pipeline: { key: string; value: PipelineEntry };
  goals: { key: string; value: PracticeGoal };
  settings: { key: string; value: AppSettings };
  brochures: { key: string; value: Brochure };
  recordings: { key: string; value: MeetingRecording; indexes: { meetingId: string } };
  news: { key: string; value: NewsBriefing };
  funds: { key: string; value: FundEntry };
  knowledgeDocs: { key: string; value: KnowledgeDoc };
  financialProfiles: { key: string; value: FinancialProfile; indexes: { clientId: string } };
}

const DB_NAME = 'fa-dashboard';
const DB_VERSION = 8;

let dbPromise: Promise<IDBPDatabase<FaDashboardSchema>> | null = null;

export function getDb(): Promise<IDBPDatabase<FaDashboardSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FaDashboardSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Historical store names ('referrals', 'objections') no longer exist in the current
        // schema type — the raw native handle lets migration code still create/drop them.
        const rawDb = db as unknown as IDBDatabase;
        if (oldVersion < 1) {
          db.createObjectStore('clients', { keyPath: 'id' }).createIndex('householdId', 'householdId');
          db.createObjectStore('households', { keyPath: 'id' });
          db.createObjectStore('meetings', { keyPath: 'id' }).createIndex('clientId', 'clientId');
          db.createObjectStore('portfolios', { keyPath: 'id' }).createIndex('clientId', 'clientId');
          db.createObjectStore('factfinds', { keyPath: 'id' }).createIndex('clientId', 'clientId');
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('clientId', 'clientId');
          taskStore.createIndex('status', 'status');
          db.createObjectStore('commissions', { keyPath: 'id' });
          db.createObjectStore('pipeline', { keyPath: 'id' });
          db.createObjectStore('goals', { keyPath: 'id' });
          rawDb.createObjectStore('referrals', { keyPath: 'id' });
          db.createObjectStore('settings', { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          db.createObjectStore('brochures', { keyPath: 'id' });
        }
        if (oldVersion < 3) {
          db.createObjectStore('recordings', { keyPath: 'id' }).createIndex('meetingId', 'meetingId');
        }
        if (oldVersion < 4) {
          db.createObjectStore('news', { keyPath: 'id' });
          db.createObjectStore('funds', { keyPath: 'id' });
          rawDb.createObjectStore('objections', { keyPath: 'id' });
        }
        if (oldVersion < 5) {
          // Referral tracker and objection-handling crib sheet were removed — drop their stores.
          if (rawDb.objectStoreNames.contains('referrals')) rawDb.deleteObjectStore('referrals');
          if (rawDb.objectStoreNames.contains('objections')) rawDb.deleteObjectStore('objections');
          db.createObjectStore('knowledgeDocs', { keyPath: 'id' });
        }
        if (oldVersion < 6) {
          rawDb.createObjectStore('watchlist', { keyPath: 'id' });
        }
        if (oldVersion < 7) {
          // Stock-ticker watchlist was replaced by insurer-tagged fund tracking (funds store).
          if (rawDb.objectStoreNames.contains('watchlist')) rawDb.deleteObjectStore('watchlist');
        }
        if (oldVersion < 8) {
          db.createObjectStore('financialProfiles', { keyPath: 'id' }).createIndex('clientId', 'clientId');
        }
      },
    });
  }
  return dbPromise;
}

export type { FaDashboardSchema };
