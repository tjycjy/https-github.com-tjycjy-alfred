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
  Referral,
  AppSettings,
  Brochure,
  MeetingRecording,
  NewsBriefing,
  FundEntry,
  ObjectionEntry,
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
  referrals: { key: string; value: Referral };
  settings: { key: string; value: AppSettings };
  brochures: { key: string; value: Brochure };
  recordings: { key: string; value: MeetingRecording; indexes: { meetingId: string } };
  news: { key: string; value: NewsBriefing };
  funds: { key: string; value: FundEntry };
  objections: { key: string; value: ObjectionEntry };
}

const DB_NAME = 'fa-dashboard';
const DB_VERSION = 4;

let dbPromise: Promise<IDBPDatabase<FaDashboardSchema>> | null = null;

export function getDb(): Promise<IDBPDatabase<FaDashboardSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<FaDashboardSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
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
          db.createObjectStore('referrals', { keyPath: 'id' });
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
          db.createObjectStore('objections', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export type { FaDashboardSchema };
