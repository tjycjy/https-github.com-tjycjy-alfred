import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { calcCpfContribution, CPF_RATES_NOTE, DEFAULT_OW_CEILING } from '../../lib/calculators/cpf';
import { formatCurrency } from '../../lib/coverageGap';
import { Card } from '../../components/ui/Card';
import { SliderInput } from '../../components/ui/SliderInput';
import { CalculatorLayout, Field, ResultStat } from './CalculatorLayout';

const SPLIT_COLORS = ['#10b981', '#f59e0b'];

export default function SalaryCalc() {
  const [gross, setGross] = useState(6000);
  const [age, setAge] = useState(35);

  const cpf = useMemo(() => calcCpfContribution(gross, age, DEFAULT_OW_CEILING), [gross, age]);
  const netMonthly = gross - cpf.employeeContribution;
  const pieData = [
    { name: 'Net take-home', value: netMonthly },
    { name: 'Employee CPF', value: cpf.employeeContribution },
  ];

  return (
    <CalculatorLayout title="Salary Calculator" description="Gross-to-net monthly salary after CPF deduction.">
      <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{CPF_RATES_NOTE}</div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="flex flex-col gap-5 p-6">
          <Field label="Gross monthly salary">
            <input type="number" value={gross} onChange={(e) => setGross(Number(e.target.value))} className="input" />
          </Field>
          <SliderInput label="Age" value={age} min={16} max={80} step={1} onChange={setAge} />
        </Card>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ResultStat label="Net monthly (take-home)" value={formatCurrency(netMonthly)} tone="emerald" />
            <ResultStat label="Employee CPF" value={formatCurrency(cpf.employeeContribution)} tone="amber" />
            <ResultStat label="Employer CPF" value={formatCurrency(cpf.employerContribution)} />
          </div>
          <Card className="p-6">
            <h3 className="mb-3 font-bold text-slate-800">Gross Salary Split</h3>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={SPLIT_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="mb-3 font-bold text-slate-800">Annual View</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm text-slate-500">Gross annual</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(gross * 12)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Net annual</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(netMonthly * 12)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Employee CPF (annual)</p>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(cpf.employeeContribution * 12)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total CPF (annual)</p>
                <p className="text-lg font-bold text-indigo-600">{formatCurrency(cpf.totalContribution * 12)}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </CalculatorLayout>
  );
}
