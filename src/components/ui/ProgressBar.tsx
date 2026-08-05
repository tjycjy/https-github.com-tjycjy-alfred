import type { GapStatus } from '../../lib/coverageGap';

const BAR_COLOR: Record<GapStatus, string> = {
  met: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-rose-500',
};

export function ProgressBar({ ratio, status }: { ratio: number; status: GapStatus }) {
  return (
    <div className="h-3 w-full rounded-full bg-slate-200 overflow-hidden">
      <div
        className={`h-full rounded-full ${BAR_COLOR[status]} transition-all duration-300`}
        style={{ width: `${Math.min(1, Math.max(0, ratio)) * 100}%` }}
      />
    </div>
  );
}
