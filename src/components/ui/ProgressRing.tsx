import type { GapStatus } from '../../lib/coverageGap';

const RING_COLOR: Record<GapStatus, string> = {
  met: '#10b981',
  amber: '#f59e0b',
  red: '#f43f5e',
};

export function ProgressRing({
  ratio,
  status,
  size = 96,
  label,
}: {
  ratio: number;
  status: GapStatus;
  size?: number;
  label?: string;
}) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, ratio)));

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e2e8f0" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={RING_COLOR[status]}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-slate-800">{Math.round(ratio * 100)}%</span>
        {label && <span className="text-[10px] text-slate-500">{label}</span>}
      </div>
    </div>
  );
}
