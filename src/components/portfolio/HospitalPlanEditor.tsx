import { useEffect, useState } from 'react';
import {
  SUPREME_HEALTH_ANNUAL_LIMIT,
  SUPREME_HEALTH_PLAN_LABELS,
  SUPREME_HEALTH_WARD_LABELS,
  CITIZEN_PLAN_TIERS,
  FOREIGNER_PLAN_TIERS,
  P_PRIME_TOP_UP_LIMIT,
  type SupremeHealthPlan,
  type Residency,
} from '../../data/hospitalRates';
import { formatCurrency } from '../../lib/coverageGap';

type Selection = 'none' | 'other' | SupremeHealthPlan;
export type Insurer = 'Great Eastern' | 'AIA' | 'Prudential' | 'Manulife' | 'Other';
const INSURERS: Insurer[] = ['Great Eastern', 'AIA', 'Prudential', 'Manulife', 'Other'];

interface HospitalNotes {
  target?: { insurer: Insurer; planName: string };
  inForce?: { insurer: Insurer; planName: string };
}

function parseNotes(notes: string): HospitalNotes {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === 'object') return parsed as HospitalNotes;
  } catch {
    // legacy free-text notes predate this feature — ignore
  }
  return {};
}

function reverseLookup(amount: number): { selection: Selection; topUp: boolean } {
  if (amount === 0) return { selection: 'none', topUp: false };
  if (amount === SUPREME_HEALTH_ANNUAL_LIMIT.P_PRIME + P_PRIME_TOP_UP_LIMIT) {
    return { selection: 'P_PRIME', topUp: true };
  }
  const match = (Object.keys(SUPREME_HEALTH_ANNUAL_LIMIT) as SupremeHealthPlan[]).find(
    (plan) => SUPREME_HEALTH_ANNUAL_LIMIT[plan] === amount,
  );
  return match ? { selection: match, topUp: false } : { selection: 'other', topUp: false };
}

function computeAmount(selection: Selection, topUp: boolean, manualAmount: number): number {
  if (selection === 'none') return 0;
  if (selection === 'other') return manualAmount;
  const base = SUPREME_HEALTH_ANNUAL_LIMIT[selection];
  return selection === 'P_PRIME' && topUp ? base + P_PRIME_TOP_UP_LIMIT : base;
}

function PlanPicker({
  label,
  residency,
  amount,
  onAmount,
  insurer,
  onInsurer,
  planName,
  onPlanName,
}: {
  label: string;
  residency: Residency;
  amount: number;
  onAmount: (value: number) => void;
  insurer: Insurer;
  onInsurer: (value: Insurer) => void;
  planName: string;
  onPlanName: (value: string) => void;
}) {
  const initial = reverseLookup(amount);
  const [selection, setSelection] = useState<Selection>(initial.selection);
  const [topUp, setTopUp] = useState(initial.topUp);
  const [manualAmount, setManualAmount] = useState(initial.selection === 'other' ? amount : 0);

  const tiers = residency === 'citizen' ? CITIZEN_PLAN_TIERS : FOREIGNER_PLAN_TIERS;

  useEffect(() => {
    if (insurer === 'Great Eastern') {
      onAmount(computeAmount(selection, topUp, manualAmount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, topUp, manualAmount, insurer]);

  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <label className="mb-1 block text-xs font-semibold text-slate-500">{label}</label>
      <select value={insurer} onChange={(e) => onInsurer(e.target.value as Insurer)} className="input mb-2">
        {INSURERS.map((i) => (
          <option key={i} value={i}>
            {i}
          </option>
        ))}
      </select>

      {insurer === 'Great Eastern' ? (
        <>
          <select value={selection} onChange={(e) => setSelection(e.target.value as Selection)} className="input">
            <option value="none">None</option>
            {tiers.map((tier) => (
              <option key={tier} value={tier}>
                {SUPREME_HEALTH_PLAN_LABELS[tier]}
              </option>
            ))}
            <option value="other">Manual amount</option>
          </select>

          {selection === 'P_PRIME' && (
            <label className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-600">
              <input type="checkbox" checked={topUp} onChange={(e) => setTopUp(e.target.checked)} />
              + {formatCurrency(P_PRIME_TOP_UP_LIMIT)} top-up (Partnering Medical Institution + Panel Provider)
            </label>
          )}

          {selection === 'other' ? (
            <input
              type="number"
              value={manualAmount}
              onChange={(e) => setManualAmount(Number(e.target.value))}
              className="input mt-2"
              placeholder="Annual claim limit"
            />
          ) : (
            selection !== 'none' && (
              <p className="mt-2 text-xs text-slate-500">{SUPREME_HEALTH_WARD_LABELS[selection]}</p>
            )
          )}

          <p className="mt-2 text-lg font-bold text-slate-800">{formatCurrency(computeAmount(selection, topUp, manualAmount))}</p>
        </>
      ) : (
        <>
          <input
            type="text"
            value={planName}
            onChange={(e) => onPlanName(e.target.value)}
            className="input"
            placeholder="Plan name (e.g. HealthShield Gold Max A)"
          />
          <input
            type="number"
            value={amount}
            onChange={(e) => onAmount(Number(e.target.value))}
            className="input mt-2"
            placeholder="Annual claim limit"
          />
          <p className="mt-2 text-lg font-bold text-slate-800">{formatCurrency(amount)}</p>
        </>
      )}
    </div>
  );
}

export function HospitalPlanEditor({
  target,
  inForce,
  notes,
  onChange,
}: {
  target: number;
  inForce: number;
  notes: string;
  onChange: (patch: { target?: number; inForce?: number; notes?: string }) => void;
}) {
  const [residency, setResidency] = useState<Residency>('citizen');
  const parsedNotes = parseNotes(notes);
  const [targetInsurer, setTargetInsurer] = useState<Insurer>(parsedNotes.target?.insurer ?? 'Great Eastern');
  const [targetPlanName, setTargetPlanName] = useState(parsedNotes.target?.planName ?? '');
  const [inForceInsurer, setInForceInsurer] = useState<Insurer>(parsedNotes.inForce?.insurer ?? 'Great Eastern');
  const [inForcePlanName, setInForcePlanName] = useState(parsedNotes.inForce?.planName ?? '');

  useEffect(() => {
    onChange({
      notes: JSON.stringify({
        target: { insurer: targetInsurer, planName: targetPlanName },
        inForce: { insurer: inForceInsurer, planName: inForcePlanName },
      }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetInsurer, targetPlanName, inForceInsurer, inForcePlanName]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">Residency</span>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {(['citizen', 'foreigner'] as Residency[]).map((r) => (
            <button
              key={r}
              onClick={() => setResidency(r)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                residency === r ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              {r === 'citizen' ? 'Citizen / PR' : 'Foreigner'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PlanPicker
          label="Target (desired coverage)"
          residency={residency}
          amount={target}
          onAmount={(v) => onChange({ target: v })}
          insurer={targetInsurer}
          onInsurer={setTargetInsurer}
          planName={targetPlanName}
          onPlanName={setTargetPlanName}
        />
        <PlanPicker
          label="In Force (current coverage)"
          residency={residency}
          amount={inForce}
          onAmount={(v) => onChange({ inForce: v })}
          insurer={inForceInsurer}
          onInsurer={setInForceInsurer}
          planName={inForcePlanName}
          onPlanName={setInForcePlanName}
        />
      </div>
    </div>
  );
}
