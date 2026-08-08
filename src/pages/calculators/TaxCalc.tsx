import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { calcResidentIncomeTax } from '../../lib/calculators/sgTax';
import { formatCurrency } from '../../lib/coverageGap';
import { Card } from '../../components/ui/Card';
import { CalculatorLayout, Field, ResultStat } from './CalculatorLayout';

export default function TaxCalc() {
  const [income, setIncome] = useState(80000);
  const result = useMemo(() => calcResidentIncomeTax(income), [income]);
  const chartData = useMemo(
    () => result.breakdown.map((b) => ({ label: `${b.ratePct}%`, tax: Math.round(b.taxInBracket) })),
    [result],
  );

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
            <h3 className="mb-3 font-bold text-slate-800">Tax by Bracket</h3>
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="tax" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
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
