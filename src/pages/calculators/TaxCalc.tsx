import { useMemo, useState } from 'react';
import { calcResidentIncomeTax } from '../../lib/calculators/sgTax';
import { formatCurrency } from '../../lib/coverageGap';
import { Card } from '../../components/ui/Card';
import { CalculatorLayout, Field, ResultStat } from './CalculatorLayout';

export default function TaxCalc() {
  const [income, setIncome] = useState(80000);
  const result = useMemo(() => calcResidentIncomeTax(income), [income]);

  return (
    <CalculatorLayout title="Income Tax Calculator" description="Singapore resident personal income tax, progressive brackets.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="flex flex-col gap-5 p-6">
          <Field label="Annual chargeable income" hint="After personal reliefs">
            <input type="number" value={income} onChange={(e) => setIncome(Number(e.target.value))} className="input" />
          </Field>
        </Card>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ResultStat label="Total tax payable" value={formatCurrency(result.totalTax)} />
            <ResultStat label="Effective tax rate" value={`${result.effectiveRatePct.toFixed(2)}%`} tone="amber" />
            <ResultStat label="Net after tax" value={formatCurrency(income - result.totalTax)} tone="emerald" />
          </div>
          <Card className="p-6">
            <h3 className="mb-3 font-bold text-slate-800">Bracket Breakdown</h3>
            <div className="flex flex-col divide-y divide-slate-100">
              {result.breakdown.map((b, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-slate-500">
                    {formatCurrency(b.from)} – {b.to ? formatCurrency(b.to) : 'above'} @ {b.ratePct}%
                  </span>
                  <span className="font-semibold text-slate-700">{formatCurrency(Math.round(b.taxInBracket))}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </CalculatorLayout>
  );
}
