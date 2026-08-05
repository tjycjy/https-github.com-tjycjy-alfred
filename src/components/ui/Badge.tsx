type Tone = 'green' | 'amber' | 'red' | 'slate' | 'indigo';

const TONE_CLASSES: Record<Tone, string> = {
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-rose-100 text-rose-700',
  slate: 'bg-slate-100 text-slate-600',
  indigo: 'bg-indigo-100 text-indigo-700',
};

export function Badge({ tone = 'slate', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}
