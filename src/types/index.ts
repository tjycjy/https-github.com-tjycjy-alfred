export type UUID = string;

export type CoverageCategory =
  | 'hospital'
  | 'ci'
  | 'earlyCi'
  | 'death'
  | 'accidentalDeath'
  | 'ltc'
  | 'savings'
  | 'investment';

export const COVERAGE_CATEGORY_LABELS: Record<CoverageCategory, string> = {
  hospital: 'Hospital Plan',
  ci: 'Critical Illness (CI)',
  earlyCi: 'Early / Intermediate CI',
  death: 'Death (Life Coverage)',
  accidentalDeath: 'Accidental Death',
  ltc: 'Long-Term Care',
  savings: 'Savings / Endowment',
  investment: 'Investment (ILP / Unit Trust)',
};

export const COVERAGE_CATEGORIES: CoverageCategory[] = [
  'hospital',
  'ci',
  'earlyCi',
  'death',
  'accidentalDeath',
  'ltc',
  'savings',
  'investment',
];

export interface FamilyMember {
  id: UUID;
  name: string;
  relationship: 'Spouse' | 'Child' | 'Other';
  dob: string | null;
}

export type EmploymentType = 'Employed' | 'Self-Employed' | 'Not Working';

export interface Client {
  id: UUID;
  householdId: UUID | null;
  name: string;
  dob: string | null;
  occupation: string;
  employmentType: EmploymentType;
  salary: number | null;
  address: string;
  familyMembers: FamilyMember[];
  notes: string;
  lastVisitDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Household {
  id: UUID;
  name: string;
  memberClientIds: UUID[];
  createdAt: string;
}

export interface MeetingLogEntry {
  id: UUID;
  clientId: UUID;
  date: string;
  journal: string;
  nextStep: string;
  createdAt: string;
}

export interface CoverageItem {
  category: CoverageCategory;
  target: number;
  inForce: number;
  notes: string;
}

export interface PortfolioPerson {
  personId: UUID;
  label: string;
  relationship: 'Self' | 'Spouse' | 'Child' | 'Other';
  coverage: CoverageItem[];
}

export interface Portfolio {
  id: UUID;
  clientId: UUID;
  people: PortfolioPerson[];
  updatedAt: string;
}

export interface LiabilityItem {
  id: UUID;
  type: string;
  amount: number;
}

export interface RetirementGoal {
  desiredMonthlyIncome: number | null;
  startAge: number | null;
  endAge: number | null;
  adjustForInflation: boolean;
  inflationPct: number;
  returnDuringRetirementPct: number;
}

export interface FactFind {
  id: UUID;
  clientId: UUID;
  income: number | null;
  dependants: number | null;
  liabilities: LiabilityItem[];
  goals: string;
  riskProfile: string;
  retirementGoal: RetirementGoal;
  updatedAt: string;
}

export interface Task {
  id: UUID;
  clientId: UUID | null;
  description: string;
  dueDate: string | null;
  status: 'open' | 'done';
  createdAt: string;
  sourceMeetingId: UUID | null;
}

export interface CommissionEntry {
  id: UUID;
  date: string;
  clientId: UUID | null;
  clientName: string;
  product: string;
  amount: number;
}

export type PipelineStatus = 'Proposed' | 'Pending' | 'Closed';

export interface PipelineEntry {
  id: UUID;
  clientId: UUID | null;
  clientName: string;
  product: string;
  expectedAmount: number;
  expectedCloseDate: string | null;
  status: PipelineStatus;
}

export interface PracticeGoal {
  id: UUID;
  label: string;
  target: number;
  current: number;
  period: string;
}

export type ReferralStatus = 'contacted' | 'met' | 'converted';

export interface Referral {
  id: UUID;
  referrerName: string;
  referrerClientId: UUID | null;
  clientName: string;
  date: string;
  status: ReferralStatus;
}

export interface AppSettings {
  id: 'settings';
  advisorName: string;
  registrationNumber: string;
  contact: string;
  photo: string | null;
  licenses: string;
  ceDeadline: string | null;
  pinHash: string | null;
  pinSalt: string | null;
  webauthnCredentialId: string | null;
  biometricEnabled: boolean;
  visitCadenceMonths: number;
  backupReminderWeeks: number;
  lastBackupAt: string | null;
  onboardingComplete: boolean;
  summaryEndpointUrl: string | null;
  summaryApiKey: string | null;
  theme: 'light' | 'dark' | 'system';
}

export interface MeetingRecording {
  id: UUID;
  meetingId: UUID;
  clientId: UUID;
  audio: Blob;
  createdAt: string;
}

export interface NewsBriefing {
  id: 'briefing';
  globalNews: string;
  sgNews: string;
  otherNews: string;
  lastRefreshedAt: string | null;
}

export interface FundEntry {
  id: UUID;
  name: string;
  nav: number | null;
  return1y: number | null;
  return3y: number | null;
  return5y: number | null;
  sourceFileName: string | null;
  updatedAt: string;
}

export interface ObjectionEntry {
  id: UUID;
  objection: string;
  response: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export type ReminderKind = 'visit' | 'premiumDue' | 'renewal' | 'birthday' | 'task';
export type ReminderUrgency = 'overdue' | 'soon' | 'upcoming';

export interface ReminderItem {
  id: string;
  kind: ReminderKind;
  urgency: ReminderUrgency;
  title: string;
  detail: string;
  date: string | null;
  clientId: UUID | null;
}

export interface Brochure {
  id: UUID;
  name: string;
  file: Blob;
  addedAt: string;
  lastOpenedAt: string;
}
