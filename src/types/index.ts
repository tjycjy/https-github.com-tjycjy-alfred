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
  phone: string;
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
  premium: number;
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

export interface SavingsGoal {
  id: UUID;
  purpose: string;
  targetAmount: number;
  targetYears: number;
  currentSavings: number;
  adjustForInflation: boolean;
  inflationPct: number;
  expectedReturnPct: number;
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
  savingsGoals: SavingsGoal[];
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

export interface CommissionRateTier {
  id: UUID;
  fromYear: number;
  toYear: number | null; // null = continues indefinitely at this rate
  pct: number;
}

export interface CommissionEntry {
  id: UUID;
  date: string;
  clientId: UUID | null;
  clientName: string;
  product: string;
  premiumAmount: number;
  rateTiers: CommissionRateTier[];
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

export interface AppSettings {
  id: 'settings';
  advisorName: string;
  companyName: string;
  agencyName: string;
  registrationNumber: string;
  contact: string;
  photo: string | null;
  namecard: string | null;
  licenses: string;
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
  knowledgeEndpointUrl: string | null;
  knowledgeApiKey: string | null;
  fundEndpointUrl: string | null;
  fundApiKey: string | null;
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

export interface FundHistoryPoint {
  date: string; // yyyy-mm-dd
  nav: number;
}

export interface FundEntry {
  id: UUID;
  name: string;
  insurer: string;
  assetClass: string;
  nav: number | null;
  return1y: number | null;
  return3y: number | null;
  return5y: number | null;
  history: FundHistoryPoint[];
  sourceFileName: string | null;
  updatedAt: string;
}

export interface KnowledgeDoc {
  id: UUID;
  name: string;
  category: string;
  text: string;
  file: Blob;
  addedAt: string;
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

export interface IncomeItem {
  id: UUID;
  label: string;
  amount: number;
}

export const EXPENSE_CATEGORIES = ['Housing', 'Transport', 'Food', 'Insurance', 'Debt Repayment', 'Discretionary', 'Other'] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface ExpenseItem {
  id: UUID;
  label: string;
  category: ExpenseCategory;
  amount: number;
}

export const ASSET_CATEGORIES = ['Cash', 'Investment', 'Property', 'CPF', 'Other'] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export interface AssetItem {
  id: UUID;
  label: string;
  category: AssetCategory;
  amount: number;
}

export interface FundAllocation {
  id: UUID;
  fundId: string;
  percentage: number;
}

export const PREMIUM_TYPES = ['Single', 'Regular'] as const;
export type PremiumType = (typeof PREMIUM_TYPES)[number];

export const PREMIUM_FREQUENCIES = ['Yearly', 'Half-Yearly', 'Quarterly', 'Monthly'] as const;
export type PremiumFrequency = (typeof PREMIUM_FREQUENCIES)[number];

export interface WelcomeBonusTier {
  id: UUID;
  policyYear: number;
  percentage: number;
}

export interface InvestmentHolding {
  id: UUID;
  fundName: string;
  investedAmount: number;
  currentValue: number;
  expectedReturnPct: number;
  purchaseDate: string | null;
  allocations: FundAllocation[];
  premiumType: PremiumType;
  premiumFrequency: PremiumFrequency;
  premiumTermYears: number | null;
  welcomeBonusTiers: WelcomeBonusTier[];
  loyaltyBonusPct: number;
  loyaltyBonusStartYear: number;
}

export const LIFE_EVENT_TYPES = ['Income Change', 'Career Break', 'Retrenchment', 'Critical Illness', 'New Dependant', 'Other'] as const;
export type LifeEventType = (typeof LIFE_EVENT_TYPES)[number];

export interface LifeEvent {
  id: UUID;
  label: string;
  type: LifeEventType;
  startAge: number;
  endAge: number | null;
  incomeDeltaMonthly: number;
  expenseDeltaMonthly: number;
}

export interface FinancialProfile {
  id: UUID;
  clientId: UUID;
  incomeItems: IncomeItem[];
  expenseItems: ExpenseItem[];
  assets: AssetItem[];
  cpfOA: number;
  cpfSA: number;
  cpfMA: number;
  cpfRA: number;
  investments: InvestmentHolding[];
  retirementAge: number;
  lifeExpectancyAge: number;
  salaryGrowthPct: number;
  expenseInflationPct: number;
  lifeEvents: LifeEvent[];
  updatedAt: string;
}

export interface Brochure {
  id: UUID;
  name: string;
  file: Blob;
  addedAt: string;
  lastOpenedAt: string;
}

export const EVENT_TYPES = ['Appointment', 'Meeting', 'Course', 'Other'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface CalendarEvent {
  id: UUID;
  title: string;
  type: EventType;
  date: string; // yyyy-mm-dd
  time: string | null; // HH:mm
  notes: string;
  clientId: UUID | null;
  createdAt: string;
}

export const PROSPECT_STATUSES = ['New', 'Contacted', 'Meeting Booked', 'Proposal Sent', 'Not Interested', 'Converted'] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export interface Prospect {
  id: UUID;
  name: string;
  phone: string;
  email: string;
  source: string;
  firstMeetingNotes: string;
  nextApproach: string;
  nextApproachDate: string | null;
  status: ProspectStatus;
  convertedClientId: UUID | null;
  createdAt: string;
  updatedAt: string;
}
