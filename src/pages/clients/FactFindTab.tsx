import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFactFindForClient, saveFactFind } from '../../db/factfind';
import { getFinancialProfile } from '../../db/financialProfiles';
import { newId } from '../../lib/id';
import { calcAge } from '../../lib/age';
import { retirementNestEgg, requiredMonthlyContribution } from '../../lib/calculators/finance';
import { formatCurrency } from '../../lib/coverageGap';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SliderInput } from '../../components/ui/SliderInput';
import { useClientTab } from './ClientTabContext';
import type { FactFind, LiabilityItem, SavingsGoal } from '../../types';

const RISK_PROFILES = ['Conservative', 'Moderate', 'Balanced', 'Growth', 'Aggressive'];
const GOAL_PRESETS = ['Car', "Children's Education", 'Marriage / Wedding', 'House Down Payment', 'Travel', 'Other'];

export default function FactFindTab() {
  const { client } = useClientTab();
  const [factFind, setFactFind] = useState<FactFind | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    getFactFindForClient(client.id).then(setFactFind);
    getFinancialProfile(client.id).then((p) => setMonthlyIncome(p.incomeItems.reduce((s, i) => s + i.amount, 0)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  if (!factFind) return <p className="text-slate-400">Loading…</p>;

  const save = async () => {
    setSaving(true);
    await saveFactFind(factFind);
    setSaving(false);
    setSavedAt(Date.now());
  };

  const addLiability = () => {
    const item: LiabilityItem = { id: newId(), type: '', amount: 0 };
    setFactFind({ ...factFind, liabilities: [...factFind.liabilities, item] });
  };

  const updateLiability = (id: string, patch: Partial<LiabilityItem>) => {
    setFactFind({
      ...factFind,
      liabilities: factFind.liabilities.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });
  };

  const removeLiability = (id: string) => {
    setFactFind({ ...factFind, liabilities: factFind.liabilities.filter((l) => l.id !== id) });
  };

  const totalLiabilities = factFind.liabilities.reduce((sum, l) => sum + (l.amount || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Fact-Find (FNA)</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Monthly income (SGD)</label>
            <div className="input flex items-center justify-between bg-slate-50 text-slate-700">
              <span>{monthlyIncome !== null ? formatCurrency(monthlyIncome) : '—'}</span>
              <Link to="../financial-health?section=cashflow" className="text-xs font-semibold text-indigo-600">
                Edit in Financial Health →
              </Link>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Number of dependants</label>
            <input
              type="number"
              value={factFind.dependants ?? ''}
              onChange={(e) => setFactFind({ ...factFind, dependants: e.target.value === '' ? null : Number(e.target.value) })}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-600">Risk profile</label>
            <select
              value={factFind.riskProfile}
              onChange={(e) => setFactFind({ ...factFind, riskProfile: e.target.value })}
              className="input"
            >
              <option value="">Not assessed</option>
              {RISK_PROFILES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-600">Financial goals</label>
            <textarea
              value={factFind.goals}
              onChange={(e) => setFactFind({ ...factFind, goals: e.target.value })}
              rows={3}
              className="input resize-none"
            />
          </div>
        </div>
      </Card>

      <RetirementGoalsCard factFind={factFind} setFactFind={setFactFind} />

      <SavingsGoalsCard factFind={factFind} setFactFind={setFactFind} />

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Liabilities</h2>
          <Button variant="secondary" onClick={addLiability}>+ Add</Button>
        </div>
        {factFind.liabilities.length === 0 ? (
          <p className="text-slate-400">No liabilities recorded (mortgage, loans, etc).</p>
        ) : (
          <div className="flex flex-col gap-3">
            {factFind.liabilities.map((l) => (
              <div key={l.id} className="grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
                <input
                  value={l.type}
                  onChange={(e) => updateLiability(l.id, { type: e.target.value })}
                  placeholder="e.g. Mortgage"
                  className="input"
                />
                <input
                  type="number"
                  value={l.amount}
                  onChange={(e) => updateLiability(l.id, { amount: Number(e.target.value) })}
                  placeholder="Amount (SGD)"
                  className="input"
                />
                <button
                  onClick={() => removeLiability(l.id)}
                  className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100"
                >
                  Remove
                </button>
              </div>
            ))}
            <p className="text-right text-sm font-semibold text-slate-600">
              Total liabilities: {totalLiabilities.toLocaleString('en-SG', { style: 'currency', currency: 'SGD', maximumFractionDigits: 0 })}
            </p>
          </div>
        )}
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Fact-Find'}</Button>
        {savedAt && <span className="text-sm text-emerald-600">Saved ✓ — feeds Coverage Gap on Portfolio</span>}
      </div>
    </div>
  );
}

function RetirementGoalsCard({
  factFind,
  setFactFind,
}: {
  factFind: FactFind;
  setFactFind: (f: FactFind) => void;
}) {
  const { client } = useClientTab();
  const goal = factFind.retirementGoal;
  const currentAge = calcAge(client.dob);

  const updateGoal = (patch: Partial<typeof goal>) => {
    setFactFind({ ...factFind, retirementGoal: { ...goal, ...patch } });
  };

  const yearsInRetirement = Math.max(0, (goal.endAge ?? 0) - (goal.startAge ?? 0));
  const yearsToRetirement = currentAge !== null ? Math.max(0, (goal.startAge ?? 0) - currentAge) : 0;

  const requiredNestEgg = useMemo(() => {
    if (!goal.desiredMonthlyIncome || yearsInRetirement <= 0) return 0;
    return retirementNestEgg(
      goal.desiredMonthlyIncome,
      yearsInRetirement,
      goal.returnDuringRetirementPct,
      goal.adjustForInflation ? goal.inflationPct : 0,
      yearsToRetirement,
    );
  }, [goal, yearsInRetirement, yearsToRetirement]);

  return (
    <Card className="p-6">
      <h2 className="mb-1 text-lg font-bold text-slate-800">Retirement Goals</h2>
      <p className="mb-4 text-sm text-slate-500">
        What the client wants to retire on — e.g. {formatCurrency(10000)}/month from age {goal.startAge ?? 65} to age{' '}
        {goal.endAge ?? 85}.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Desired monthly income (today's dollars)</label>
          <input
            type="number"
            value={goal.desiredMonthlyIncome ?? ''}
            onChange={(e) => updateGoal({ desiredMonthlyIncome: e.target.value === '' ? null : Number(e.target.value) })}
            className="input"
            placeholder="e.g. 10000"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">From age</label>
            <input
              type="number"
              value={goal.startAge ?? ''}
              onChange={(e) => updateGoal({ startAge: e.target.value === '' ? null : Number(e.target.value) })}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">To age</label>
            <input
              type="number"
              value={goal.endAge ?? ''}
              onChange={(e) => updateGoal({ endAge: e.target.value === '' ? null : Number(e.target.value) })}
              className="input"
            />
          </div>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600">
        <input
          type="checkbox"
          checked={goal.adjustForInflation}
          onChange={(e) => updateGoal({ adjustForInflation: e.target.checked })}
        />
        Adjust for inflation between now and retirement
      </label>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {goal.adjustForInflation && (
          <SliderInput
            label="Assumed inflation"
            value={goal.inflationPct}
            min={0}
            max={6}
            step={0.1}
            format={(v) => `${v.toFixed(1)}%`}
            onChange={(v) => updateGoal({ inflationPct: v })}
          />
        )}
        <SliderInput
          label="Assumed return during retirement"
          value={goal.returnDuringRetirementPct}
          min={0}
          max={8}
          step={0.1}
          format={(v) => `${v.toFixed(1)}%`}
          onChange={(v) => updateGoal({ returnDuringRetirementPct: v })}
        />
      </div>

      <div className="mt-5 rounded-xl bg-indigo-50 p-4">
        <p className="text-sm font-medium text-indigo-600">Required lump sum at retirement</p>
        <p className="text-2xl font-bold text-indigo-700">{formatCurrency(Math.round(requiredNestEgg))}</p>
        {currentAge !== null && (
          <p className="mt-1 text-xs text-indigo-500">
            Based on {client.name}'s current age of {currentAge}, retiring in {yearsToRetirement} year
            {yearsToRetirement === 1 ? '' : 's'}, over {yearsInRetirement} year{yearsInRetirement === 1 ? '' : 's'} of
            retirement.
          </p>
        )}
        {currentAge === null && (
          <p className="mt-1 text-xs text-indigo-500">Add a date of birth in Basic Info for a more precise projection.</p>
        )}
      </div>
    </Card>
  );
}

function SavingsGoalsCard({
  factFind,
  setFactFind,
}: {
  factFind: FactFind;
  setFactFind: (f: FactFind) => void;
}) {
  const goals = factFind.savingsGoals;

  const addGoal = () => {
    const goal: SavingsGoal = {
      id: newId(),
      purpose: GOAL_PRESETS[0],
      targetAmount: 50000,
      targetYears: 5,
      currentSavings: 0,
      adjustForInflation: false,
      inflationPct: 2.5,
      expectedReturnPct: 4,
    };
    setFactFind({ ...factFind, savingsGoals: [...goals, goal] });
  };

  const updateGoal = (id: string, patch: Partial<SavingsGoal>) => {
    setFactFind({ ...factFind, savingsGoals: goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  };

  const removeGoal = (id: string) => {
    setFactFind({ ...factFind, savingsGoals: goals.filter((g) => g.id !== id) });
  };

  return (
    <Card className="p-6">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Savings Goals</h2>
        <Button variant="secondary" onClick={addGoal}>+ Add Goal</Button>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Anything the client is saving toward besides retirement — a car, kids' education, a wedding, and so on.
      </p>
      {goals.length === 0 ? (
        <p className="text-slate-400">No savings goals added yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {goals.map((goal) => (
            <SavingsGoalRow key={goal.id} goal={goal} onChange={(patch) => updateGoal(goal.id, patch)} onRemove={() => removeGoal(goal.id)} />
          ))}
        </div>
      )}
    </Card>
  );
}

function SavingsGoalRow({
  goal,
  onChange,
  onRemove,
}: {
  goal: SavingsGoal;
  onChange: (patch: Partial<SavingsGoal>) => void;
  onRemove: () => void;
}) {
  const effectiveTarget = goal.adjustForInflation
    ? goal.targetAmount * Math.pow(1 + goal.inflationPct / 100, goal.targetYears)
    : goal.targetAmount;

  const monthly = useMemo(
    () => requiredMonthlyContribution(effectiveTarget, goal.targetYears, goal.expectedReturnPct, goal.currentSavings),
    [effectiveTarget, goal.targetYears, goal.expectedReturnPct, goal.currentSavings],
  );

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <select value={goal.purpose} onChange={(e) => onChange({ purpose: e.target.value })} className="input max-w-xs">
          {GOAL_PRESETS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button onClick={onRemove} className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100">
          Remove
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Target amount (today's $)</label>
          <input type="number" value={goal.targetAmount} onChange={(e) => onChange({ targetAmount: Number(e.target.value) })} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Timeframe (years)</label>
          <input type="number" value={goal.targetYears} onChange={(e) => onChange({ targetYears: Number(e.target.value) })} className="input" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Current savings toward this</label>
          <input type="number" value={goal.currentSavings} onChange={(e) => onChange({ currentSavings: Number(e.target.value) })} className="input" />
        </div>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-600">
        <input type="checkbox" checked={goal.adjustForInflation} onChange={(e) => onChange({ adjustForInflation: e.target.checked })} />
        Adjust for inflation
      </label>

      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {goal.adjustForInflation && (
          <SliderInput
            label="Assumed inflation"
            value={goal.inflationPct}
            min={0}
            max={6}
            step={0.1}
            format={(v) => `${v.toFixed(1)}%`}
            onChange={(v) => onChange({ inflationPct: v })}
          />
        )}
        <SliderInput
          label="Assumed return"
          value={goal.expectedReturnPct}
          min={0}
          max={10}
          step={0.1}
          format={(v) => `${v.toFixed(1)}%`}
          onChange={(v) => onChange({ expectedReturnPct: v })}
        />
      </div>

      <div className="mt-3 rounded-lg bg-white p-3">
        <p className="text-sm text-slate-500">
          Required monthly savings: <span className="font-bold text-slate-800">{formatCurrency(Math.round(monthly))}</span>
          {goal.adjustForInflation && (
            <span className="text-slate-400"> (target inflated to {formatCurrency(Math.round(effectiveTarget))})</span>
          )}
        </p>
      </div>
    </div>
  );
}
