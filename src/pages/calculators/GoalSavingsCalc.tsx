import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { requiredMonthlyContribution, compoundInterestSeries } from '../../lib/calculators/finance';
import { formatCurrency } from '../../lib/coverageGap';
import { Card } from '../../components/ui/Card';
import { SliderInput } from '../../components/ui/SliderInput';
import { CalculatorLayout, Field, ResultStat } from './CalculatorLayout';

export default function GoalSavingsCalc() {
  const [targetSum, setTargetSum] = useState(100000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(4);
  const [currentSavings, setCurrentSavings] = useState(0);

  const monthly = useMemo(
    () => requiredMonthlyContribution(targetSum, years, rate, currentSavings),
    [targetSum, years, rate, currentSavings],
  );

  const series = useMemo(
    () => compoundInterestSeries(currentSavings, rate, years, 'monthly', monthly),
    [currentSavings, rate, years, monthly],
  );

  return (
    <CalculatorLayout title="Goal-Based Savings Calculator" description="How much to save monthly to hit a target sum by a deadline.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="flex flex-col gap-5 p-6">
          <Field label="Target sum">
            <input type="number" value={targetSum} onChange={(e) => setTargetSum(Number(e.target.value))} className="input" />
          </Field>
          <SliderInput label="Timeframe (years)" value={years} min={1} max={40} step={1} onChange={setYears} />
          <SliderInput label="Expected annual return" value={rate} min={0} max={12} step={0.1} format={(v) => `${v.toFixed(1)}%`} onChange={setRate} />
          <Field label="Current savings toward this goal">
            <input type="number" value={currentSavings} onChange={(e) => setCurrentSavings(Number(e.target.value))} className="input" />
          </Field>
        </Card>

        <div className="flex flex-col gap-4">
          <ResultStat label="Required monthly contribution" value={formatCurrency(Math.round(monthly))} tone="emerald" />
          <Card className="p-6">
            <p className="mb-4 text-slate-500">
              Save <span className="font-bold text-slate-800">{formatCurrency(Math.round(monthly))}/month</span> for {years} years at{' '}
              {rate.toFixed(1)}% p.a. to reach <span className="font-bold text-slate-800">{formatCurrency(targetSum)}</span>.
            </p>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} label={{ value: 'Year', position: 'insideBottom', offset: -4 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={(l) => `Year ${l}`} />
                  <ReferenceLine y={targetSum} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'Target', fill: '#f43f5e', fontSize: 12 }} />
                  <Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={3} dot={false} name="Balance" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </CalculatorLayout>
  );
}
