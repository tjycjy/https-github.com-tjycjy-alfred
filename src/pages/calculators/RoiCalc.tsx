import { useMemo, useState } from 'react';
import { cagr, totalRoiPct } from '../../lib/calculators/finance';
import { formatCurrency } from '../../lib/coverageGap';
import { Card } from '../../components/ui/Card';
import { SliderInput } from '../../components/ui/SliderInput';
import { CalculatorLayout, Field, ResultStat } from './CalculatorLayout';

export default function RoiCalc() {
  const [initial, setInitial] = useState(10000);
  const [final, setFinal] = useState(16000);
  const [years, setYears] = useState(5);

  const roi = useMemo(() => totalRoiPct(initial, final), [initial, final]);
  const annualized = useMemo(() => cagr(initial, final, years), [initial, final, years]);

  return (
    <CalculatorLayout title="ROI Calculator" description="Total and annualized return on an investment.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="flex flex-col gap-5 p-6">
          <Field label="Initial investment">
            <input type="number" value={initial} onChange={(e) => setInitial(Number(e.target.value))} className="input" />
          </Field>
          <Field label="Final value">
            <input type="number" value={final} onChange={(e) => setFinal(Number(e.target.value))} className="input" />
          </Field>
          <SliderInput label="Holding period (years)" value={years} min={1} max={40} step={1} onChange={setYears} />
        </Card>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ResultStat label="Total ROI" value={`${roi.toFixed(1)}%`} />
            <ResultStat label="Annualized return (CAGR)" value={`${annualized.toFixed(2)}%`} tone="emerald" />
            <ResultStat label="Gain" value={formatCurrency(final - initial)} tone="amber" />
          </div>
        </div>
      </div>
    </CalculatorLayout>
  );
}
