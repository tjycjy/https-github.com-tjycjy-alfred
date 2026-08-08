import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line } from 'recharts';
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

  const compareData = [
    { label: 'Initial', value: initial },
    { label: 'Final', value: final },
  ];

  const growthPath = useMemo(() => {
    const points = [];
    for (let y = 0; y <= years; y++) {
      points.push({ year: y, value: Math.round(initial * Math.pow(1 + annualized / 100, y)) });
    }
    return points;
  }, [initial, annualized, years]);

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
          <Card className="p-6">
            <h3 className="mb-3 font-bold text-slate-800">Initial vs Final</h3>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={compareData} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 13 }} width={60} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    <Cell fill="#cbd5e1" />
                    <Cell fill="#6366f1" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="mb-3 font-bold text-slate-800">Implied Growth Path (at CAGR)</h3>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={growthPath}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} label={{ value: 'Year', position: 'insideBottom', offset: -4 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} labelFormatter={(l) => `Year ${l}`} />
                  <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </CalculatorLayout>
  );
}
