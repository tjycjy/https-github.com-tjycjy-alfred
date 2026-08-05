import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

export function CalculatorLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <button onClick={() => navigate('/calculators')} className="mb-1 text-sm font-medium text-indigo-600">
          ← All Calculators
        </button>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <p className="text-slate-500">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-600">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function ResultStat({ label, value, tone = 'indigo' }: { label: string; value: string; tone?: 'indigo' | 'emerald' | 'amber' }) {
  const toneClass = { indigo: 'text-indigo-600', emerald: 'text-emerald-600', amber: 'text-amber-600' }[tone];
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`text-2xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
