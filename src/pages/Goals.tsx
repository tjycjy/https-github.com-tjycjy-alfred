import { useEffect, useState } from 'react';
import { listGoals, addGoal, updateGoal, deleteGoal } from '../db/goals';
import { listCommissions } from '../db/commission';
import { ytdFyc } from '../lib/commission';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { formatCurrency } from '../lib/coverageGap';
import type { PracticeGoal } from '../types';

const YEAR = new Date().getFullYear().toString();

const AWARD_TIERS = [
  { label: 'MDRT', threshold: 75000 },
  { label: 'IDA Bronze Dragon', threshold: 85000 },
  { label: 'IDA Silver Dragon', threshold: 255000 },
  { label: 'COT', threshold: 227400 },
  { label: 'IDA Gold Dragon', threshold: 510000 },
  { label: 'TOT', threshold: 454800 },
  { label: 'IDA Platinum Dragon', threshold: 765000 },
].sort((a, b) => a.threshold - b.threshold);

export default function Goals() {
  const [goals, setGoals] = useState<PracticeGoal[]>([]);
  const [form, setForm] = useState({ label: '', target: '', period: new Date().toISOString().slice(0, 7) });
  const [awardFyc, setAwardFycState] = useState(0);

  const load = async () => {
    setGoals(await listGoals());
    setAwardFycState(ytdFyc(await listCommissions()));
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.label.trim() || !form.target) return;
    await addGoal({ label: form.label.trim(), target: Number(form.target), current: 0, period: form.period });
    setForm({ label: '', target: '', period: new Date().toISOString().slice(0, 7) });
    await load();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Goals</h1>
        <p className="text-slate-500">Personal targets — new business, meetings, closed accounts, and more</p>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_140px_120px]">
          <input
            placeholder="e.g. Meet 30 people this month, Close 100 Accident Plans this year"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="input"
          />
          <input type="number" placeholder="Target" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className="input" />
          <input type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className="input" />
          <Button onClick={create}>Add Goal</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-bold text-slate-800">Award Progress ({YEAR})</h2>
        <p className="mb-4 text-sm text-slate-500">
          MDRT, COT, TOT and IDA all run off the same year-to-date FYC, calculated automatically from your{' '}
          <span className="font-semibold text-slate-600">Commission Log</span> — no need to enter it twice. FYC =
          first year commission (year-1 commission earned on premium logged this year).
        </p>
        <div className="mb-5 max-w-xs">
          <label className="mb-1 block text-xs font-semibold text-slate-500">Current FYC (S$)</label>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(awardFyc)}</p>
        </div>
        <div className="flex flex-col gap-3">
          {AWARD_TIERS.map((t) => {
            const ratio = t.threshold > 0 ? Math.min(1, awardFyc / t.threshold) : 0;
            const status = ratio >= 1 ? 'met' : ratio >= 0.5 ? 'amber' : 'red';
            return (
              <div key={t.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{t.label}</span>
                  <span className="text-slate-400">
                    {formatCurrency(Math.min(awardFyc, t.threshold))} / {formatCurrency(t.threshold)}
                  </span>
                </div>
                <ProgressBar ratio={ratio} status={status} />
              </div>
            );
          })}
        </div>
      </Card>

      {goals.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">No goals set yet.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {goals.map((goal) => {
            const ratio = goal.target > 0 ? Math.min(1, goal.current / goal.target) : 0;
            const status = ratio >= 1 ? 'met' : ratio >= 0.5 ? 'amber' : 'red';
            return (
              <Card key={goal.id} className="p-5">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-800">{goal.label}</h3>
                    <p className="text-sm text-slate-400">{goal.period}</p>
                  </div>
                  <button onClick={async () => { await deleteGoal(goal.id); await load(); }} className="text-slate-300 hover:text-rose-500">✕</button>
                </div>
                <ProgressBar ratio={ratio} status={status} />
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="number"
                    value={goal.current}
                    onChange={async (e) => { await updateGoal({ ...goal, current: Number(e.target.value) }); await load(); }}
                    className="input w-24"
                  />
                  <span className="text-sm text-slate-400">/ {goal.target}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
