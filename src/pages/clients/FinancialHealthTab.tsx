import { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import { getFinancialProfile, saveFinancialProfile } from '../../db/financialProfiles';
import { getFactFindForClient } from '../../db/factfind';
import { getPortfolioForClient } from '../../db/portfolios';
import { newId } from '../../lib/id';
import { calcAge } from '../../lib/age';
import { calcCpfContribution, CPF_RATES_NOTE } from '../../lib/calculators/cpf';
import { compoundInterestSeries } from '../../lib/calculators/finance';
import { projectCashflow } from '../../lib/calculators/cashflowProjection';
import { computeGap, combineCoverage, formatCurrency } from '../../lib/coverageGap';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SliderInput } from '../../components/ui/SliderInput';
import { useClientTab } from './ClientTabContext';
import {
  EXPENSE_CATEGORIES,
  ASSET_CATEGORIES,
  LIFE_EVENT_TYPES,
  type FinancialProfile,
  type IncomeItem,
  type ExpenseItem,
  type AssetItem,
  type InvestmentHolding,
  type LifeEvent,
  type FactFind,
  type Portfolio,
} from '../../types';

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'cashflow', label: 'Cashflow' },
  { id: 'networth', label: 'Net Worth' },
  { id: 'cpf', label: 'CPF' },
  { id: 'investments', label: 'Investments' },
  { id: 'affordability', label: 'Affordability' },
  { id: 'projection', label: 'Projection' },
  { id: 'scenarios', label: 'Scenarios' },
] as const;
type SectionId = (typeof SECTIONS)[number]['id'];

export default function FinancialHealthTab() {
  const { client } = useClientTab();
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [factFind, setFactFind] = useState<FactFind | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [section, setSection] = useState<SectionId>('overview');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutosave = useRef(false);

  useEffect(() => {
    skipNextAutosave.current = true;
    Promise.all([
      getFinancialProfile(client.id),
      getFactFindForClient(client.id),
      getPortfolioForClient(client.id),
    ]).then(([p, f, pf]) => {
      setProfile(p);
      setFactFind(f);
      setPortfolio(pf);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  // Autosave shortly after any edit, so switching sections or navigating away never
  // loses data the way requiring an explicit Save click did.
  useEffect(() => {
    if (!profile) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await saveFinancialProfile(profile);
      setSaving(false);
      setSavedAt(Date.now());
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (!profile || !factFind || !portfolio) return <p className="text-slate-400">Loading…</p>;

  const totalMonthlyIncome = profile.incomeItems.reduce((s, i) => s + i.amount, 0);
  const totalMonthlyExpenses = profile.expenseItems.reduce((s, e) => s + e.amount, 0);
  const monthlySurplus = totalMonthlyIncome - totalMonthlyExpenses;
  const totalCpf = profile.cpfOA + profile.cpfSA + profile.cpfMA + profile.cpfRA;
  const totalOtherAssets = profile.assets.reduce((s, a) => s + a.amount, 0);
  const totalInvestments = profile.investments.reduce((s, h) => s + h.currentValue, 0);
  const totalLiabilities = factFind.liabilities.reduce((s, l) => s + (l.amount || 0), 0);
  const netWorth = totalCpf + totalOtherAssets + totalInvestments - totalLiabilities;
  const cashAssets = profile.assets.filter((a) => a.category === 'Cash').reduce((s, a) => s + a.amount, 0);
  const emergencyFundMonths = totalMonthlyExpenses > 0 ? cashAssets / totalMonthlyExpenses : 0;
  const savingsRatePct = totalMonthlyIncome > 0 ? (monthlySurplus / totalMonthlyIncome) * 100 : 0;
  const liabilitiesToIncomePct = totalMonthlyIncome > 0 ? (totalLiabilities / (totalMonthlyIncome * 12)) * 100 : 0;

  const combinedCoverage = combineCoverage(portfolio.people.map((p) => p.coverage));
  const overallTarget = combinedCoverage.reduce((s, c) => s + c.target, 0);
  const overallInForce = combinedCoverage.reduce((s, c) => s + c.inForce, 0);
  const overallGap = computeGap({ target: overallTarget, inForce: overallInForce });
  const ciCoverageInForce = combinedCoverage
    .filter((c) => c.category === 'ci' || c.category === 'earlyCi')
    .reduce((s, c) => s + c.inForce, 0);

  const currentAge = calcAge(client.dob);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Financial Health</h2>
          <p className="text-slate-500">A full financial picture built from this client's income, assets, CPF, investments, and coverage.</p>
        </div>
        <span className="whitespace-nowrap text-sm text-slate-400">
          {saving ? 'Saving…' : savedAt ? 'All changes saved ✓' : ''}
        </span>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              section === s.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === 'overview' && (
        <OverviewSection
          savingsRatePct={savingsRatePct}
          liabilitiesToIncomePct={liabilitiesToIncomePct}
          emergencyFundMonths={emergencyFundMonths}
          netWorth={netWorth}
          overallGap={overallGap}
          factFind={factFind}
        />
      )}
      {section === 'cashflow' && <CashflowSection profile={profile} setProfile={setProfile} />}
      {section === 'networth' && (
        <NetWorthSection
          profile={profile}
          setProfile={setProfile}
          totalLiabilities={totalLiabilities}
          totalInvestments={totalInvestments}
          totalCpf={totalCpf}
          netWorth={netWorth}
        />
      )}
      {section === 'cpf' && <CpfSection profile={profile} setProfile={setProfile} currentAge={currentAge} totalMonthlyIncome={totalMonthlyIncome} />}
      {section === 'investments' && <InvestmentsSection profile={profile} setProfile={setProfile} />}
      {section === 'affordability' && (
        <AffordabilitySection monthlySurplus={monthlySurplus} totalMonthlyIncome={totalMonthlyIncome} totalMonthlyExpenses={totalMonthlyExpenses} />
      )}
      {section === 'projection' && (
        <ProjectionSection
          profile={profile}
          setProfile={setProfile}
          currentAge={currentAge}
          totalMonthlyIncome={totalMonthlyIncome}
          totalMonthlyExpenses={totalMonthlyExpenses}
          cashAssets={cashAssets}
        />
      )}
      {section === 'scenarios' && (
        <ScenarioSection
          profile={profile}
          setProfile={setProfile}
          currentAge={currentAge}
          totalMonthlyIncome={totalMonthlyIncome}
          totalMonthlyExpenses={totalMonthlyExpenses}
          cashAssets={cashAssets}
          ciCoverageInForce={ciCoverageInForce}
        />
      )}
    </div>
  );
}

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#a855f7'];

function BreakdownPie({ data }: { data: { name: string; value: number }[] }) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) return null;
  return (
    <div style={{ width: '100%', height: 220 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={filtered} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
            {filtered.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatCurrency(Number(v))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-slate-600">{label}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function StatCard({ label, value, sub, status }: { label: string; value: string; sub?: string; status?: 'good' | 'warn' | 'bad' }) {
  const color = status === 'good' ? 'text-emerald-600' : status === 'bad' ? 'text-rose-600' : status === 'warn' ? 'text-amber-600' : 'text-slate-800';
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </Card>
  );
}

function OverviewSection({
  savingsRatePct,
  liabilitiesToIncomePct,
  emergencyFundMonths,
  netWorth,
  overallGap,
  factFind,
}: {
  savingsRatePct: number;
  liabilitiesToIncomePct: number;
  emergencyFundMonths: number;
  netWorth: number;
  overallGap: { ratio: number; status: 'met' | 'amber' | 'red' };
  factFind: FactFind;
}) {
  const savingsStatus = savingsRatePct >= 20 ? 'good' : savingsRatePct >= 10 ? 'warn' : 'bad';
  const liabStatus = liabilitiesToIncomePct <= 100 ? 'good' : liabilitiesToIncomePct <= 300 ? 'warn' : 'bad';
  const efStatus = emergencyFundMonths >= 6 ? 'good' : emergencyFundMonths >= 3 ? 'warn' : 'bad';
  const insuranceStatus = overallGap.status === 'met' ? 'good' : overallGap.status === 'amber' ? 'warn' : 'bad';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Savings Rate" value={`${savingsRatePct.toFixed(0)}%`} sub="of monthly take-home income" status={savingsStatus} />
      <StatCard label="Liabilities vs Income" value={`${liabilitiesToIncomePct.toFixed(0)}%`} sub="total liabilities ÷ annual income" status={liabStatus} />
      <StatCard label="Emergency Fund" value={`${emergencyFundMonths.toFixed(1)} mo`} sub="cash savings ÷ monthly expenses" status={efStatus} />
      <StatCard label="Net Worth" value={formatCurrency(netWorth)} sub="assets + CPF + investments − liabilities" />
      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Insurance Coverage</p>
        <p className={`mt-1 text-2xl font-bold ${insuranceStatus === 'good' ? 'text-emerald-600' : insuranceStatus === 'bad' ? 'text-rose-600' : 'text-amber-600'}`}>
          {Math.round(overallGap.ratio * 100)}% covered
        </p>
        <Link to="../portfolio" className="mt-2 inline-block text-xs font-semibold text-indigo-600">View Portfolio →</Link>
      </Card>
      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Goals & Milestones</p>
        <p className="mt-1 text-sm text-slate-600">
          {factFind.savingsGoals.length} savings goal{factFind.savingsGoals.length === 1 ? '' : 's'} · retirement goal{' '}
          {factFind.retirementGoal.desiredMonthlyIncome ? 'set' : 'not set'}
        </p>
        <Link to="../fact-find" className="mt-2 inline-block text-xs font-semibold text-indigo-600">View Fact-Find →</Link>
      </Card>
    </div>
  );
}

function CashflowSection({ profile, setProfile }: { profile: FinancialProfile; setProfile: (p: FinancialProfile) => void }) {
  const addIncome = () => setProfile({ ...profile, incomeItems: [...profile.incomeItems, { id: newId(), label: '', amount: 0 }] });
  const updateIncome = (id: string, patch: Partial<IncomeItem>) =>
    setProfile({ ...profile, incomeItems: profile.incomeItems.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const removeIncome = (id: string) => setProfile({ ...profile, incomeItems: profile.incomeItems.filter((i) => i.id !== id) });

  const addExpense = () =>
    setProfile({ ...profile, expenseItems: [...profile.expenseItems, { id: newId(), label: '', category: 'Other', amount: 0 }] });
  const updateExpense = (id: string, patch: Partial<ExpenseItem>) =>
    setProfile({ ...profile, expenseItems: profile.expenseItems.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const removeExpense = (id: string) => setProfile({ ...profile, expenseItems: profile.expenseItems.filter((i) => i.id !== id) });

  const totalIncome = profile.incomeItems.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = profile.expenseItems.reduce((s, i) => s + i.amount, 0);
  const surplus = totalIncome - totalExpenses;

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Monthly Income</h3>
          <Button variant="secondary" onClick={addIncome}>+ Add</Button>
        </div>
        {profile.incomeItems.length === 0 ? (
          <p className="text-slate-400">No income sources added.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {profile.incomeItems.map((i) => (
              <div key={i.id} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px_100px]">
                <input value={i.label} onChange={(e) => updateIncome(i.id, { label: e.target.value })} placeholder="e.g. Salary" className="input" />
                <input type="number" value={i.amount} onChange={(e) => updateIncome(i.id, { amount: Number(e.target.value) })} className="input" />
                <button onClick={() => removeIncome(i.id)} className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100">Remove</button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-right text-sm font-semibold text-slate-600">Total: {formatCurrency(totalIncome)}/mo</p>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Monthly Expenses</h3>
          <Button variant="secondary" onClick={addExpense}>+ Add</Button>
        </div>
        {profile.expenseItems.length === 0 ? (
          <p className="text-slate-400">No expenses added.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {profile.expenseItems.map((i) => (
              <div key={i.id} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px_160px_100px]">
                <input value={i.label} onChange={(e) => updateExpense(i.id, { label: e.target.value })} placeholder="e.g. Rent" className="input" />
                <select value={i.category} onChange={(e) => updateExpense(i.id, { category: e.target.value as ExpenseItem['category'] })} className="input">
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" value={i.amount} onChange={(e) => updateExpense(i.id, { amount: Number(e.target.value) })} className="input" />
                <button onClick={() => removeExpense(i.id)} className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100">Remove</button>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-right text-sm font-semibold text-slate-600">Total: {formatCurrency(totalExpenses)}/mo</p>
      </Card>

      {profile.expenseItems.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-1 font-bold text-slate-800">Expense Breakdown</h3>
          <BreakdownPie
            data={EXPENSE_CATEGORIES.map((c) => ({
              name: c,
              value: profile.expenseItems.filter((i) => i.category === c).reduce((s, i) => s + i.amount, 0),
            }))}
          />
        </Card>
      )}

      <div className={`rounded-2xl p-6 ${surplus >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
        <p className="text-sm font-semibold text-slate-600">Monthly Surplus</p>
        <p className={`text-3xl font-bold ${surplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatCurrency(surplus)}</p>
      </div>
    </div>
  );
}

function NetWorthSection({
  profile,
  setProfile,
  totalLiabilities,
  totalInvestments,
  totalCpf,
  netWorth,
}: {
  profile: FinancialProfile;
  setProfile: (p: FinancialProfile) => void;
  totalLiabilities: number;
  totalInvestments: number;
  totalCpf: number;
  netWorth: number;
}) {
  const addAsset = () => setProfile({ ...profile, assets: [...profile.assets, { id: newId(), label: '', category: 'Cash', amount: 0 }] });
  const updateAsset = (id: string, patch: Partial<AssetItem>) =>
    setProfile({ ...profile, assets: profile.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) });
  const removeAsset = (id: string) => setProfile({ ...profile, assets: profile.assets.filter((a) => a.id !== id) });
  const totalOtherAssets = profile.assets.reduce((s, a) => s + a.amount, 0);
  const pieData = [
    ...ASSET_CATEGORIES.filter((c) => c !== 'CPF').map((c) => ({
      name: c,
      value: profile.assets.filter((a) => a.category === c).reduce((s, a) => s + a.amount, 0),
    })),
    { name: 'CPF', value: totalCpf },
    { name: 'Investments', value: totalInvestments },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Assets</h3>
          <Button variant="secondary" onClick={addAsset}>+ Add</Button>
        </div>
        <p className="mb-4 text-sm text-slate-500">CPF is tracked separately in the CPF tab and added automatically below — no need to duplicate it here.</p>
        {profile.assets.length === 0 ? (
          <p className="text-slate-400">No assets added.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {profile.assets.map((a) => (
              <div key={a.id} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_160px_100px]">
                <input value={a.label} onChange={(e) => updateAsset(a.id, { label: e.target.value })} placeholder="e.g. Savings account" className="input" />
                <select value={a.category} onChange={(e) => updateAsset(a.id, { category: e.target.value as AssetItem['category'] })} className="input">
                  {ASSET_CATEGORIES.filter((c) => c !== 'CPF').map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" value={a.amount} onChange={(e) => updateAsset(a.id, { amount: Number(e.target.value) })} className="input" />
                <button onClick={() => removeAsset(a.id)} className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100">Remove</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 font-bold text-slate-800">Net Worth Summary</h3>
        <BreakdownPie data={pieData} />
        <div className="mt-4 flex flex-col divide-y divide-slate-100 text-sm">
          <Row label="Other assets" value={formatCurrency(totalOtherAssets)} />
          <Row label="CPF (OA + SA + MA + RA)" value={formatCurrency(totalCpf)} />
          <Row label="Investments (current value)" value={formatCurrency(totalInvestments)} />
          <Row label="Liabilities" value={`− ${formatCurrency(totalLiabilities)}`} sub="Edit in Fact-Find" />
        </div>
        <div className="mt-4 rounded-xl bg-indigo-50 p-4">
          <p className="text-sm font-semibold text-indigo-600">Net Worth</p>
          <p className="text-2xl font-bold text-indigo-700">{formatCurrency(netWorth)}</p>
        </div>
      </Card>
    </div>
  );
}

function CpfSection({
  profile,
  setProfile,
  currentAge,
  totalMonthlyIncome,
}: {
  profile: FinancialProfile;
  setProfile: (p: FinancialProfile) => void;
  currentAge: number | null;
  totalMonthlyIncome: number;
}) {
  const breakdown = currentAge !== null && totalMonthlyIncome > 0 ? calcCpfContribution(totalMonthlyIncome, currentAge) : null;
  const totalCpf = profile.cpfOA + profile.cpfSA + profile.cpfMA + profile.cpfRA;

  const updateBalance = (field: 'cpfOA' | 'cpfSA' | 'cpfMA' | 'cpfRA', value: number) => setProfile({ ...profile, [field]: value });

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h3 className="mb-1 font-bold text-slate-800">Current CPF Balances</h3>
        <p className="mb-4 text-sm text-slate-500">{CPF_RATES_NOTE}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Ordinary Account (OA)</label>
            <input type="number" value={profile.cpfOA} onChange={(e) => updateBalance('cpfOA', Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Special Account (SA)</label>
            <input type="number" value={profile.cpfSA} onChange={(e) => updateBalance('cpfSA', Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">MediSave (MA)</label>
            <input type="number" value={profile.cpfMA} onChange={(e) => updateBalance('cpfMA', Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Retirement Account (RA)</label>
            <input type="number" value={profile.cpfRA} onChange={(e) => updateBalance('cpfRA', Number(e.target.value))} className="input" />
          </div>
        </div>
        <p className="mt-3 text-right text-sm font-semibold text-slate-600">Total CPF: {formatCurrency(totalCpf)}</p>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 font-bold text-slate-800">Monthly CPF Contribution</h3>
        {!breakdown ? (
          <p className="text-slate-400">Add a date of birth (Basic Info) and monthly income (Cashflow tab) to see the contribution breakdown.</p>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100 text-sm">
            <Row label={`Age band: ${breakdown.band.label}`} value={`${breakdown.band.employeePct}% + ${breakdown.band.employerPct}%`} />
            <Row label="Employee contribution" value={formatCurrency(breakdown.employeeContribution)} />
            <Row label="Employer contribution" value={formatCurrency(breakdown.employerContribution)} />
            <Row label="Total monthly contribution" value={formatCurrency(breakdown.totalContribution)} />
            <Row label="→ Ordinary Account" value={formatCurrency(breakdown.oaAmount)} />
            <Row label="→ Special Account" value={formatCurrency(breakdown.saAmount)} />
            <Row label="→ MediSave" value={formatCurrency(breakdown.maAmount)} />
            <Row label="Take-home after CPF" value={formatCurrency(breakdown.takeHomeAfterCpf)} />
          </div>
        )}
      </Card>
    </div>
  );
}

function InvestmentsSection({ profile, setProfile }: { profile: FinancialProfile; setProfile: (p: FinancialProfile) => void }) {
  const [years, setYears] = useState(10);
  const addHolding = () =>
    setProfile({ ...profile, investments: [...profile.investments, { id: newId(), fundName: '', investedAmount: 0, currentValue: 0, expectedReturnPct: 5 }] });
  const updateHolding = (id: string, patch: Partial<InvestmentHolding>) =>
    setProfile({ ...profile, investments: profile.investments.map((h) => (h.id === id ? { ...h, ...patch } : h)) });
  const removeHolding = (id: string) => setProfile({ ...profile, investments: profile.investments.filter((h) => h.id !== id) });

  const totalInvested = profile.investments.reduce((s, h) => s + h.investedAmount, 0);
  const totalCurrent = profile.investments.reduce((s, h) => s + h.currentValue, 0);
  const totalGainPct = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

  const blendedReturn =
    totalCurrent > 0 ? profile.investments.reduce((s, h) => s + h.expectedReturnPct * (h.currentValue / totalCurrent), 0) : 0;
  const series = useMemo(() => compoundInterestSeries(totalCurrent, blendedReturn, years, 'annual', 0), [totalCurrent, blendedReturn, years]);

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Investment Holdings</h3>
          <Button variant="secondary" onClick={addHolding}>+ Add</Button>
        </div>
        {profile.investments.length === 0 ? (
          <p className="text-slate-400">No holdings added yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {profile.investments.map((h) => (
              <div key={h.id} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_140px_120px_100px]">
                <input value={h.fundName} onChange={(e) => updateHolding(h.id, { fundName: e.target.value })} placeholder="Fund / holding name" className="input" />
                <input type="number" value={h.investedAmount} onChange={(e) => updateHolding(h.id, { investedAmount: Number(e.target.value) })} placeholder="Invested" className="input" />
                <input type="number" value={h.currentValue} onChange={(e) => updateHolding(h.id, { currentValue: Number(e.target.value) })} placeholder="Current value" className="input" />
                <input type="number" value={h.expectedReturnPct} onChange={(e) => updateHolding(h.id, { expectedReturnPct: Number(e.target.value) })} placeholder="Exp. return %" className="input" />
                <button onClick={() => removeHolding(h.id)} className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100">Remove</button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <Row label="Total invested" value={formatCurrency(totalInvested)} />
          <Row label="Current value" value={formatCurrency(totalCurrent)} />
          <Row label="Gain / loss" value={`${totalGainPct >= 0 ? '+' : ''}${totalGainPct.toFixed(1)}%`} />
        </div>
      </Card>

      {profile.investments.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-1 font-bold text-slate-800">Projected Growth</h3>
          <p className="mb-4 text-sm text-slate-500">Blended assumed return: {blendedReturn.toFixed(1)}%/yr, weighted by current value.</p>
          <SliderInput label="Projection horizon" value={years} min={1} max={30} step={1} format={(v) => `${v} yrs`} onChange={setYears} />
          <div style={{ width: '100%', height: 260 }} className="mt-4">
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={(l) => `Year ${l}`} />
                <Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Projected value in {years} years: <span className="font-bold text-slate-800">{formatCurrency(series[series.length - 1]?.balance ?? 0)}</span>
          </p>
        </Card>
      )}
    </div>
  );
}

function AffordabilitySection({
  monthlySurplus,
  totalMonthlyIncome,
  totalMonthlyExpenses,
}: {
  monthlySurplus: number;
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
}) {
  const [targetLabel, setTargetLabel] = useState('New insurance premium');
  const [targetAmount, setTargetAmount] = useState(0);

  const newTotalExpenses = totalMonthlyExpenses + targetAmount;
  const newSurplus = totalMonthlyIncome - newTotalExpenses;
  const commitmentRatio = totalMonthlyIncome > 0 ? (newTotalExpenses / totalMonthlyIncome) * 100 : 0;
  const status = commitmentRatio <= 50 ? 'good' : commitmentRatio <= 70 ? 'warn' : 'bad';

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h3 className="mb-1 font-bold text-slate-800">Affordability Check</h3>
        <p className="mb-4 text-sm text-slate-500">Checks a new monthly commitment against this client's actual income and expenses from the Cashflow tab.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">What for</label>
            <input value={targetLabel} onChange={(e) => setTargetLabel(e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Monthly amount</label>
            <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(Number(e.target.value))} className="input" />
          </div>
        </div>
      </Card>

      <div className={`rounded-2xl p-6 ${status === 'good' ? 'bg-emerald-50' : status === 'warn' ? 'bg-amber-50' : 'bg-rose-50'}`}>
        <p className="text-sm font-semibold text-slate-600">{targetLabel || 'This commitment'} at {formatCurrency(targetAmount)}/mo</p>
        <p className={`text-2xl font-bold ${status === 'good' ? 'text-emerald-600' : status === 'warn' ? 'text-amber-600' : 'text-rose-600'}`}>
          {newSurplus >= 0 ? `Leaves ${formatCurrency(newSurplus)}/mo buffer` : `Shortfall of ${formatCurrency(Math.abs(newSurplus))}/mo`}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Total commitments would be {commitmentRatio.toFixed(0)}% of monthly income (current surplus without this: {formatCurrency(monthlySurplus)}/mo).
        </p>
      </div>
    </div>
  );
}

function ProjectionSection({
  profile,
  setProfile,
  currentAge,
  totalMonthlyIncome,
  totalMonthlyExpenses,
  cashAssets,
}: {
  profile: FinancialProfile;
  setProfile: (p: FinancialProfile) => void;
  currentAge: number | null;
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  cashAssets: number;
}) {
  const rows = useMemo(
    () =>
      currentAge === null
        ? []
        : projectCashflow({
            currentAge,
            startYear: new Date().getFullYear(),
            baseMonthlyIncome: totalMonthlyIncome,
            baseMonthlyExpenses: totalMonthlyExpenses,
            salaryGrowthPct: profile.salaryGrowthPct,
            expenseInflationPct: profile.expenseInflationPct,
            retirementAge: profile.retirementAge,
            lifeExpectancyAge: profile.lifeExpectancyAge,
            lifeEvents: [],
            startingSavings: cashAssets,
          }),
    [currentAge, totalMonthlyIncome, totalMonthlyExpenses, profile.salaryGrowthPct, profile.expenseInflationPct, profile.retirementAge, profile.lifeExpectancyAge, cashAssets],
  );

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h3 className="mb-4 font-bold text-slate-800">Projection Assumptions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Retirement age</label>
            <input type="number" value={profile.retirementAge} onChange={(e) => setProfile({ ...profile, retirementAge: Number(e.target.value) })} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Life expectancy age</label>
            <input type="number" value={profile.lifeExpectancyAge} onChange={(e) => setProfile({ ...profile, lifeExpectancyAge: Number(e.target.value) })} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Salary growth %/yr</label>
            <input type="number" step="0.1" value={profile.salaryGrowthPct} onChange={(e) => setProfile({ ...profile, salaryGrowthPct: Number(e.target.value) })} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Expense inflation %/yr</label>
            <input type="number" step="0.1" value={profile.expenseInflationPct} onChange={(e) => setProfile({ ...profile, expenseInflationPct: Number(e.target.value) })} className="input" />
          </div>
        </div>
      </Card>

      {currentAge === null ? (
        <Card className="p-6 text-slate-400">Add a date of birth in Basic Info to run a year-by-year projection.</Card>
      ) : (
        <>
          <Card className="p-6">
            <h3 className="mb-4 font-bold text-slate-800">Cumulative Savings Over Time</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <LineChart data={rows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="age" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={(l) => `Age ${l}`} />
                  <Line type="monotone" dataKey="cumulativeSavings" stroke="#6366f1" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 font-bold text-slate-800">Year-by-Year Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="py-2">Age</th>
                    <th className="py-2">Year</th>
                    <th className="py-2">Status</th>
                    <th className="py-2 text-right">Take-Home</th>
                    <th className="py-2 text-right">Expenses</th>
                    <th className="py-2 text-right">Surplus</th>
                    <th className="py-2 text-right">Cumulative Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.age} className="border-b border-slate-100">
                      <td className="py-2">{r.age}</td>
                      <td className="py-2">{r.year}</td>
                      <td className="py-2">{r.status}</td>
                      <td className="py-2 text-right">{formatCurrency(r.monthlyIncome)}</td>
                      <td className="py-2 text-right">{formatCurrency(r.monthlyExpenses)}</td>
                      <td className={`py-2 text-right ${r.monthlySurplus < 0 ? 'text-rose-600' : ''}`}>{formatCurrency(r.monthlySurplus)}</td>
                      <td className="py-2 text-right font-semibold">{formatCurrency(r.cumulativeSavings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function ScenarioSection({
  profile,
  setProfile,
  currentAge,
  totalMonthlyIncome,
  totalMonthlyExpenses,
  cashAssets,
  ciCoverageInForce,
}: {
  profile: FinancialProfile;
  setProfile: (p: FinancialProfile) => void;
  currentAge: number | null;
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  cashAssets: number;
  ciCoverageInForce: number;
}) {
  const addEvent = () =>
    setProfile({
      ...profile,
      lifeEvents: [
        ...profile.lifeEvents,
        { id: newId(), label: '', type: 'Income Change', startAge: (currentAge ?? 30) + 1, endAge: null, incomeDeltaMonthly: 0, expenseDeltaMonthly: 0 },
      ],
    });
  const updateEvent = (id: string, patch: Partial<LifeEvent>) =>
    setProfile({ ...profile, lifeEvents: profile.lifeEvents.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  const removeEvent = (id: string) => setProfile({ ...profile, lifeEvents: profile.lifeEvents.filter((e) => e.id !== id) });

  const baseParams = {
    startYear: new Date().getFullYear(),
    baseMonthlyIncome: totalMonthlyIncome,
    baseMonthlyExpenses: totalMonthlyExpenses,
    salaryGrowthPct: profile.salaryGrowthPct,
    expenseInflationPct: profile.expenseInflationPct,
    retirementAge: profile.retirementAge,
    lifeExpectancyAge: profile.lifeExpectancyAge,
    startingSavings: cashAssets,
  };

  const baseline = useMemo(
    () => (currentAge === null ? [] : projectCashflow({ ...baseParams, currentAge, lifeEvents: [] })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentAge, totalMonthlyIncome, totalMonthlyExpenses, profile.salaryGrowthPct, profile.expenseInflationPct, profile.retirementAge, profile.lifeExpectancyAge, cashAssets],
  );
  const withEvents = useMemo(
    () => (currentAge === null ? [] : projectCashflow({ ...baseParams, currentAge, lifeEvents: profile.lifeEvents })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentAge, totalMonthlyIncome, totalMonthlyExpenses, profile.salaryGrowthPct, profile.expenseInflationPct, profile.retirementAge, profile.lifeExpectancyAge, profile.lifeEvents, cashAssets],
  );

  const chartData = baseline.map((b, i) => ({ age: b.age, baseline: b.cumulativeSavings, scenario: withEvents[i]?.cumulativeSavings ?? null }));

  return (
    <div className="flex flex-col gap-6">
      <CriticalIllnessCard
        profile={profile}
        setProfile={setProfile}
        currentAge={currentAge}
        totalMonthlyIncome={totalMonthlyIncome}
        ciCoverageInForce={ciCoverageInForce}
      />

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Life Events</h3>
          <Button variant="secondary" onClick={addEvent}>+ Add Event</Button>
        </div>
        {profile.lifeEvents.length === 0 ? (
          <p className="text-slate-400">No life events added — try "what if retrenched for a year" or "what if second child".</p>
        ) : (
          <div className="flex flex-col gap-3">
            {profile.lifeEvents.map((ev) => (
              <div key={ev.id} className="rounded-xl bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <input value={ev.label} onChange={(e) => updateEvent(ev.id, { label: e.target.value })} placeholder="e.g. Career break for 2nd child" className="input" />
                  <button onClick={() => removeEvent(ev.id)} className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100">Remove</button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                  <select value={ev.type} onChange={(e) => updateEvent(ev.id, { type: e.target.value as LifeEvent['type'] })} className="input">
                    {LIFE_EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">From age</label>
                    <input type="number" value={ev.startAge} onChange={(e) => updateEvent(ev.id, { startAge: Number(e.target.value) })} className="input" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">To age (blank = ongoing)</label>
                    <input
                      type="number"
                      value={ev.endAge ?? ''}
                      onChange={(e) => updateEvent(ev.id, { endAge: e.target.value === '' ? null : Number(e.target.value) })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Income change/mo</label>
                    <input type="number" value={ev.incomeDeltaMonthly} onChange={(e) => updateEvent(ev.id, { incomeDeltaMonthly: Number(e.target.value) })} className="input" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Expense change/mo</label>
                    <input type="number" value={ev.expenseDeltaMonthly} onChange={(e) => updateEvent(ev.id, { expenseDeltaMonthly: Number(e.target.value) })} className="input" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {currentAge !== null && profile.lifeEvents.length > 0 && (
        <Card className="p-6">
          <h3 className="mb-4 font-bold text-slate-800">Baseline vs Scenario — Cumulative Savings</h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="age" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={(l) => `Age ${l}`} />
                <Legend />
                <Line type="monotone" dataKey="baseline" name="Baseline" stroke="#94a3b8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="scenario" name="With Scenarios" stroke="#dc2626" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            At life expectancy: baseline {formatCurrency(baseline[baseline.length - 1]?.cumulativeSavings ?? 0)} vs scenario{' '}
            {formatCurrency(withEvents[withEvents.length - 1]?.cumulativeSavings ?? 0)}.
          </p>
        </Card>
      )}
    </div>
  );
}

function CriticalIllnessCard({
  profile,
  setProfile,
  currentAge,
  totalMonthlyIncome,
  ciCoverageInForce,
}: {
  profile: FinancialProfile;
  setProfile: (p: FinancialProfile) => void;
  currentAge: number | null;
  totalMonthlyIncome: number;
  ciCoverageInForce: number;
}) {
  const [diagnosisAge, setDiagnosisAge] = useState((currentAge ?? 30) + 5);
  const [recoveryYears, setRecoveryYears] = useState(2);
  const [medicalBills, setMedicalBills] = useState(50000);

  const incomeLost = totalMonthlyIncome * 12 * recoveryYears;
  const totalNeed = incomeLost + medicalBills;
  const covered = Math.min(ciCoverageInForce, totalNeed);
  const shortfall = Math.max(0, totalNeed - ciCoverageInForce);
  const status = totalNeed === 0 ? 'good' : ciCoverageInForce >= totalNeed ? 'good' : ciCoverageInForce >= totalNeed * 0.5 ? 'warn' : 'bad';

  const alreadyApplied = profile.lifeEvents.some((e) => e.type === 'Critical Illness');

  const applyScenario = () => {
    const event: LifeEvent = {
      id: newId(),
      label: 'Critical illness diagnosis (e.g. cancer) — unable to work',
      type: 'Critical Illness',
      startAge: diagnosisAge,
      endAge: diagnosisAge + Math.max(0, recoveryYears - 1),
      incomeDeltaMonthly: -totalMonthlyIncome,
      expenseDeltaMonthly: 0,
    };
    setProfile({ ...profile, lifeEvents: [...profile.lifeEvents, event] });
  };

  return (
    <Card className="p-6">
      <h3 className="mb-1 font-bold text-slate-800">Critical Illness Scenario</h3>
      <p className="mb-4 text-sm text-slate-500">
        If this client were diagnosed with a critical illness (e.g. cancer, stroke, heart attack) and couldn't work during
        treatment — this is exactly what CI coverage exists to replace: lost income plus the bills.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Diagnosis age</label>
          <input type="number" value={diagnosisAge} onChange={(e) => setDiagnosisAge(Number(e.target.value))} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Years unable to work</label>
          <input type="number" value={recoveryYears} onChange={(e) => setRecoveryYears(Number(e.target.value))} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Estimated medical / treatment bills</label>
          <input type="number" value={medicalBills} onChange={(e) => setMedicalBills(Number(e.target.value))} className="input" />
        </div>
      </div>

      <div className="mt-4 flex flex-col divide-y divide-slate-100 text-sm">
        <Row label="Income lost while not working" value={formatCurrency(incomeLost)} sub={`${formatCurrency(totalMonthlyIncome)}/mo × ${recoveryYears} yr`} />
        <Row label="Medical / treatment bills" value={formatCurrency(medicalBills)} />
        <Row label="Total financial impact" value={formatCurrency(totalNeed)} />
        <Row label="Existing CI coverage (in force)" value={formatCurrency(ciCoverageInForce)} sub="Critical Illness + Early/Intermediate CI, from Portfolio" />
      </div>

      <div className={`mt-4 rounded-xl p-4 ${status === 'good' ? 'bg-emerald-50' : status === 'warn' ? 'bg-amber-50' : 'bg-rose-50'}`}>
        <p className="text-sm font-semibold text-slate-600">{shortfall > 0 ? 'Coverage Shortfall' : 'Fully Covered'}</p>
        <p className={`text-2xl font-bold ${status === 'good' ? 'text-emerald-600' : status === 'warn' ? 'text-amber-600' : 'text-rose-600'}`}>
          {shortfall > 0 ? formatCurrency(shortfall) : `${formatCurrency(covered)} of ${formatCurrency(totalNeed)} covered`}
        </p>
        {shortfall > 0 && (
          <p className="mt-1 text-sm text-slate-500">
            Existing CI coverage would cover {formatCurrency(covered)} of the {formatCurrency(totalNeed)} needed — a shortfall of{' '}
            {formatCurrency(shortfall)}.
          </p>
        )}
      </div>

      <Button variant="secondary" className="mt-4" onClick={applyScenario} disabled={alreadyApplied}>
        {alreadyApplied ? 'Added to projection below ✓' : 'Add to Scenario Projection ↓'}
      </Button>
    </Card>
  );
}
