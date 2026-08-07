import { useEffect, useState } from 'react';
import { getPortfolioForClient, savePortfolio, newPortfolioPerson, emptyCoverage } from '../../db/portfolios';
import { computeGap, GAP_STATUS_COLOR, formatCurrency, combineCoverage } from '../../lib/coverageGap';
import { COVERAGE_CATEGORY_LABELS } from '../../types';
import { formatDate, calcAge } from '../../lib/age';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SliderInput } from '../../components/ui/SliderInput';
import { HospitalPlanEditor } from '../../components/portfolio/HospitalPlanEditor';
import { useClientTab } from './ClientTabContext';
import type { Portfolio, PortfolioPerson, CoverageCategory } from '../../types';

export default function PortfolioTab() {
  const { client } = useClientTab();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [lifeExpectancy, setLifeExpectancy] = useState(85);

  useEffect(() => {
    getPortfolioForClient(client.id).then((p) => {
      let people = p.people;
      if (people.length === 0) {
        const self = newPortfolioPerson(client.name, 'Self');
        const familyPeople = client.familyMembers.map((m) =>
          newPortfolioPerson(m.name || m.relationship, m.relationship as PortfolioPerson['relationship']),
        );
        people = [self, ...familyPeople];
      }
      const loaded = { ...p, people };
      setPortfolio(loaded);
      setSelectedPersonId(people[0]?.personId ?? null);
      setSavedAt(p.updatedAt);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id]);

  if (!portfolio) return <p className="text-slate-400">Loading…</p>;

  const selectedPerson = portfolio.people.find((p) => p.personId === selectedPersonId) ?? portfolio.people[0];

  const updatePersonCoverage = (personId: string, category: CoverageCategory, patch: { target?: number; inForce?: number; premium?: number; notes?: string }) => {
    setPortfolio({
      ...portfolio,
      people: portfolio.people.map((person) =>
        person.personId === personId
          ? {
              ...person,
              coverage: person.coverage.map((c) => (c.category === category ? { ...c, ...patch } : c)),
            }
          : person,
      ),
    });
  };

  const addPerson = (relationship: PortfolioPerson['relationship']) => {
    const person = newPortfolioPerson(relationship === 'Spouse' ? 'Spouse' : 'Child', relationship);
    setPortfolio({ ...portfolio, people: [...portfolio.people, person] });
    setSelectedPersonId(person.personId);
  };

  const removePerson = (personId: string) => {
    if (portfolio.people.length <= 1) return;
    const remaining = portfolio.people.filter((p) => p.personId !== personId);
    setPortfolio({ ...portfolio, people: remaining });
    setSelectedPersonId(remaining[0]?.personId ?? null);
  };

  const save = async () => {
    setSaving(true);
    await savePortfolio(portfolio);
    setSaving(false);
    setSavedAt(new Date().toISOString());
  };

  const combined = combineCoverage(portfolio.people.map((p) => p.coverage));
  const totalTarget = combined.reduce((s, c) => s + c.target, 0);
  const totalInForce = combined.reduce((s, c) => s + c.inForce, 0);
  const overall = computeGap({ target: totalTarget, inForce: totalInForce });
  const totalAnnualPremium = combined.reduce((s, c) => s + (c.premium ?? 0), 0);
  const clientAge = calcAge(client.dob);
  const yearsRemaining = clientAge !== null ? Math.max(lifeExpectancy - clientAge, 0) : null;
  const lifetimePremium = yearsRemaining !== null ? totalAnnualPremium * yearsRemaining : null;

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-wrap items-center justify-between gap-6 p-6">
        <div className="flex items-center gap-5">
          <ProgressRing ratio={overall.ratio} status={overall.status} size={92} label="covered" />
          <div>
            <h2 className="text-lg font-bold text-slate-800">Household Coverage Overview</h2>
            <p className="text-slate-500">
              {formatCurrency(totalInForce)} in force / {formatCurrency(totalTarget)} target
            </p>
            <p className="text-sm text-slate-400">Last updated {formatDate(savedAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Portfolio'}</Button>
        </div>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-6 p-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Total Premium Outlay</h2>
          <p className="text-2xl font-bold text-indigo-600">{formatCurrency(totalAnnualPremium)}<span className="ml-1 text-sm font-medium text-slate-400">/ year</span></p>
          <p className="text-sm text-slate-500">
            {lifetimePremium !== null
              ? `${formatCurrency(lifetimePremium)} projected to age ${lifeExpectancy} (${yearsRemaining} more years)`
              : `Set ${client.name}'s date of birth in Basic Info to project lifetime premium`}
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          Assumed life expectancy
          <input
            type="number"
            value={lifeExpectancy}
            onChange={(e) => setLifeExpectancy(Number(e.target.value))}
            className="input w-20"
          />
        </label>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        {portfolio.people.map((person) => (
          <button
            key={person.personId}
            onClick={() => setSelectedPersonId(person.personId)}
            className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
              selectedPerson?.personId === person.personId
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {person.label || person.relationship} · {person.relationship}
          </button>
        ))}
        <button
          onClick={() => addPerson('Spouse')}
          className="rounded-full border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
        >
          + Spouse
        </button>
        <button
          onClick={() => addPerson('Child')}
          className="rounded-full border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50"
        >
          + Child
        </button>
      </div>

      {selectedPerson && (
        <div className="flex flex-col gap-4">
          {selectedPerson.relationship !== 'Self' && (
            <div className="flex items-center justify-between rounded-xl bg-white p-4">
              <input
                value={selectedPerson.label}
                onChange={(e) =>
                  setPortfolio({
                    ...portfolio,
                    people: portfolio.people.map((p) =>
                      p.personId === selectedPerson.personId ? { ...p, label: e.target.value } : p,
                    ),
                  })
                }
                className="input max-w-xs"
                placeholder="Name"
              />
              <button
                onClick={() => removePerson(selectedPerson.personId)}
                className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100"
              >
                Remove
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(selectedPerson.coverage.length ? selectedPerson.coverage : emptyCoverage()).map((item) => {
              const gap = computeGap(item);
              const colors = GAP_STATUS_COLOR[gap.status];
              const sliderMax = Math.max(item.target * 1.5, item.inForce * 1.5, 100000);
              return (
                <Card key={item.category} className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">{COVERAGE_CATEGORY_LABELS[item.category]}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${colors.bg} ${colors.text}`}>
                      {gap.gap > 0 ? `${formatCurrency(gap.gap)} gap` : 'Target met'}
                    </span>
                  </div>
                  <ProgressBar ratio={gap.ratio} status={gap.status} />
                  <div className="mt-3">
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Annual Premium</label>
                    <input
                      type="number"
                      value={item.premium}
                      onChange={(e) =>
                        updatePersonCoverage(selectedPerson.personId, item.category, { premium: Number(e.target.value) })
                      }
                      className="input"
                      placeholder="0"
                    />
                  </div>
                  {item.category === 'hospital' ? (
                    <div className="mt-4">
                      <HospitalPlanEditor
                        target={item.target}
                        inForce={item.inForce}
                        notes={item.notes}
                        onChange={(patch) => updatePersonCoverage(selectedPerson.personId, item.category, patch)}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-500">Target</label>
                          <input
                            type="number"
                            value={item.target}
                            onChange={(e) =>
                              updatePersonCoverage(selectedPerson.personId, item.category, { target: Number(e.target.value) })
                            }
                            className="input"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-semibold text-slate-500">In Force</label>
                          <input
                            type="number"
                            value={item.inForce}
                            onChange={(e) =>
                              updatePersonCoverage(selectedPerson.personId, item.category, { inForce: Number(e.target.value) })
                            }
                            className="input"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <SliderInput
                          label="Adjust In Force live"
                          value={item.inForce}
                          min={0}
                          max={Math.ceil(sliderMax / 1000) * 1000 || 100000}
                          step={1000}
                          format={formatCurrency}
                          onChange={(value) =>
                            updatePersonCoverage(selectedPerson.personId, item.category, { inForce: value })
                          }
                        />
                      </div>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
