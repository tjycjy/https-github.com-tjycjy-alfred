import { useMemo, useState } from 'react';
import { retirementNestEgg, requiredMonthlyContribution } from '../../lib/calculators/finance';
import { formatCurrency } from '../../lib/coverageGap';
import { Card } from '../../components/ui/Card';
import { SliderInput } from '../../components/ui/SliderInput';
import { CalculatorLayout, Field, ResultStat } from './CalculatorLayout';

export default function RetirementCalc() {
  const [currentAge, setCurrentAge] = useState(35);
  const [retirementAge, setRetirementAge] = useState(65);
  const [desiredIncome, setDesiredIncome] = useState(4000);
  const [yearsInRetirement, setYearsInRetirement] = useState(25);
  const [returnDuringRetirement, setReturnDuringRetirement] = useState(3);
  const [returnBeforeRetirement, setReturnBeforeRetirement] = useState(5);
  const [inflation, setInflation] = useState(2.5);
  const [currentSavings, setCurrentSavings] = useState(20000);

  const yearsToRetirement = Math.max(0, retirementAge - currentAge);

  const nestEgg = useMemo(
    () => retirementNestEgg(desiredIncome, yearsInRetirement, returnDuringRetirement, inflation, yearsToRetirement),
    [desiredIncome, yearsInRetirement, returnDuringRetirement, inflation, yearsToRetirement],
  );

  const monthlyNeeded = useMemo(
    () => requiredMonthlyContribution(nestEgg, yearsToRetirement, returnBeforeRetirement, currentSavings),
    [nestEgg, yearsToRetirement, returnBeforeRetirement, currentSavings],
  );

  return (
    <CalculatorLayout title="Retirement Calculator" description="Target monthly retirement income → required nest egg and savings plan.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <Card className="flex flex-col gap-5 p-6">
          <SliderInput label="Current age" value={currentAge} min={18} max={70} step={1} onChange={setCurrentAge} />
          <SliderInput label="Retirement age" value={retirementAge} min={currentAge + 1} max={80} step={1} onChange={setRetirementAge} />
          <SliderInput label="Desired monthly income (today's dollars)" value={desiredIncome} min={500} max={15000} step={100} format={formatCurrency} onChange={setDesiredIncome} />
          <SliderInput label="Years in retirement" value={yearsInRetirement} min={5} max={40} step={1} onChange={setYearsInRetirement} />
          <SliderInput label="Inflation" value={inflation} min={0} max={6} step={0.1} format={(v) => `${v.toFixed(1)}%`} onChange={setInflation} />
          <SliderInput label="Return during retirement" value={returnDuringRetirement} min={0} max={8} step={0.1} format={(v) => `${v.toFixed(1)}%`} onChange={setReturnDuringRetirement} />
          <SliderInput label="Return before retirement" value={returnBeforeRetirement} min={0} max={12} step={0.1} format={(v) => `${v.toFixed(1)}%`} onChange={setReturnBeforeRetirement} />
          <Field label="Current retirement savings">
            <input type="number" value={currentSavings} onChange={(e) => setCurrentSavings(Number(e.target.value))} className="input" />
          </Field>
        </Card>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ResultStat label="Required nest egg" value={formatCurrency(Math.round(nestEgg))} />
            <ResultStat label="Years to retirement" value={`${yearsToRetirement}`} tone="amber" />
            <ResultStat label="Required monthly savings" value={formatCurrency(Math.round(monthlyNeeded))} tone="emerald" />
          </div>
          <Card className="p-6 text-slate-500">
            <p>
              To provide {formatCurrency(desiredIncome)}/month for {yearsInRetirement} years from age {retirementAge}, this plan needs{' '}
              <span className="font-bold text-slate-800">{formatCurrency(Math.round(nestEgg))}</span> at retirement — reachable by saving{' '}
              <span className="font-bold text-slate-800">{formatCurrency(Math.round(monthlyNeeded))}/month</span> starting today.
            </p>
          </Card>
        </div>
      </div>
    </CalculatorLayout>
  );
}
