import { useEffect, useState } from 'react';
import { listGoals, addGoal, updateGoal, deleteGoal } from '../db/goals';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { formatCurrency } from '../lib/coverageGap';
import type { PracticeGoal } from '../types';

const YEAR = new Date().getFullYear().toString();

const IDA_PRESETS = [
  { label: 'IDA Bronze Dragon (FYC)', target: 85000 },
  { label: 'IDA Silver Dragon (FYC)', target: 255000 },
  { label: 'IDA Gold Dragon (FYC)', target: 510000 },
  { label: 'IDA Platinum Dragon (FYC)', target: 765000 },
];

const MDRT_TIER_PRESETS = [
  { tier: 'MDRT', fyc: 75000, fyp: 227400, income: 131300 },
  { tier: 'COT', fyc: 227400, fyp: 682200, income: 393900 },
  { tier: 'TOT', fyc: 454800, fyp: 1364400, income: 787800 },
];

export default function Goals() {
  const [goals, setGoals] = useState<PracticeGoal[]>([]);
  const [form, setForm] = useState({ label: '', target: '', period: new Date().toISOString().slice(0, 7) });

  const load = async () => setGoals(await listGoals());

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!form.label.trim() || !form.target) return;
    await addGoal({ label: form.label.trim(), target: Number(form.target), current: 0, period: form.period });
    setForm({ label: '', target: '', period: new Date().toISOString().slice(0, 7) });
    await load();
  };

  const hasPreset = (label: string) => goals.some((g) => g.label === label && g.period === YEAR);

  const addIdaPreset = async (label: string, target: number) => {
    if (hasPreset(label)) return;
    await addGoal({ label, target, current: 0, period: YEAR });
    await load();
  };

  const addTierPreset = async (tier: string, fyc: number, fyp: number, income: number) => {
    const rows: [string, number][] = [
      [`${tier} — FYC`, fyc],
      [`${tier} — FYP`, fyp],
      [`${tier} — Income`, income],
    ];
    for (const [label, target] of rows) {
      if (hasPreset(label)) continue;
      await addGoal({ label, target, current: 0, period: YEAR });
    }
    await load();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Goals</h1>
        <p className="text-slate-500">Personal targets — new business, meetings, AUM growth</p>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_140px_140px_120px]">
          <input placeholder="e.g. New meetings this month" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="input" />
          <input type="number" placeholder="Target" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} className="input" />
          <input type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} className="input" />
          <Button onClick={create}>Add Goal</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-bold text-slate-800">Industry Award Presets ({YEAR})</h2>
        <p className="mb-4 text-sm text-slate-500">Tap to add a preset target for this year. FYC = first year commission, FYP = first year premium.</p>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">IDA</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {IDA_PRESETS.map((p) => {
            const done = hasPreset(p.label);
            return (
              <button
                key={p.label}
                onClick={() => addIdaPreset(p.label, p.target)}
                disabled={done}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  done
                    ? 'cursor-default border-slate-100 bg-slate-50 text-slate-300'
                    : 'border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200'
                }`}
              >
                <span className="block font-semibold">{p.label}</span>
                <span className="block text-xs">{formatCurrency(p.target)}{done ? ' · added' : ''}</span>
              </button>
            );
          })}
        </div>

        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">MDRT / COT / TOT</p>
        <div className="flex flex-wrap gap-2">
          {MDRT_TIER_PRESETS.map((p) => {
            const done = hasPreset(`${p.tier} — FYC`) && hasPreset(`${p.tier} — FYP`) && hasPreset(`${p.tier} — Income`);
            return (
              <button
                key={p.tier}
                onClick={() => addTierPreset(p.tier, p.fyc, p.fyp, p.income)}
                disabled={done}
                className={`rounded-lg border px-3 py-2 text-left text-sm ${
                  done
                    ? 'cursor-default border-slate-100 bg-slate-50 text-slate-300'
                    : 'border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200'
                }`}
              >
                <span className="block font-semibold">{p.tier}</span>
                <span className="block text-xs">
                  FYC {formatCurrency(p.fyc)} · FYP {formatCurrency(p.fyp)} · Income {formatCurrency(p.income)}
                  {done ? ' · added' : ''}
                </span>
              </button>
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
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">{goal.current} / {goal.target}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => { await updateGoal({ ...goal, current: Math.max(0, goal.current - 1) }); await load(); }}
                      className="h-8 w-8 rounded-full bg-slate-100 font-bold text-slate-600 hover:bg-slate-200"
                    >
                      −
                    </button>
                    <button
                      onClick={async () => { await updateGoal({ ...goal, current: goal.current + 1 }); await load(); }}
                      className="h-8 w-8 rounded-full bg-indigo-100 font-bold text-indigo-600 hover:bg-indigo-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
