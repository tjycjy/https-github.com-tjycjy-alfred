import { useEffect, useState } from 'react';
import { estimateLtcMedisaveSplit, CARESHIELD_SUPPLEMENT_MEDISAVE_CAP } from '../../lib/calculators/medisave';
import { formatCurrency } from '../../lib/coverageGap';

interface LtcNotes {
  basePremium?: number;
  supplementPremium?: number;
}

function parseNotes(notes: string): LtcNotes {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    if (parsed && typeof parsed === 'object') return parsed as LtcNotes;
  } catch {
    // legacy free-text notes predate this feature — ignore
  }
  return {};
}

export function LtcPremiumEditor({
  premium,
  notes,
  onChange,
}: {
  premium: number;
  notes: string;
  onChange: (patch: { premium?: number; notes?: string }) => void;
}) {
  const parsed = parseNotes(notes);
  const [basePremium, setBasePremium] = useState(parsed.basePremium ?? premium);
  const [supplementPremium, setSupplementPremium] = useState(parsed.supplementPremium ?? 0);

  useEffect(() => {
    onChange({
      premium: basePremium + supplementPremium,
      notes: JSON.stringify({ basePremium, supplementPremium }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basePremium, supplementPremium]);

  const split = estimateLtcMedisaveSplit(basePremium, supplementPremium);

  return (
    <div className="mt-4 flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">CareShield Life base premium</label>
          <input
            type="number"
            value={basePremium}
            onChange={(e) => setBasePremium(Number(e.target.value))}
            className="input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500">Supplement (increased coverage)</label>
          <input
            type="number"
            value={supplementPremium}
            onChange={(e) => setSupplementPremium(Number(e.target.value))}
            className="input"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-emerald-50 p-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">MediSave-payable</p>
          <p className="text-lg font-bold text-emerald-700">{formatCurrency(split.medisavePayable)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cash outlay</p>
          <p className="text-lg font-bold text-slate-700">{formatCurrency(split.cashPortion)}</p>
        </div>
      </div>
      <p className="text-[11px] text-slate-400">
        Base premium is fully MediSave-payable. The supplement — bought to increase coverage above the government
        scheme — is MediSave-payable up to {formatCurrency(CARESHIELD_SUPPLEMENT_MEDISAVE_CAP)}/year; the rest is cash.
      </p>
    </div>
  );
}
