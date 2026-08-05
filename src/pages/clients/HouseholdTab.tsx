import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listClients } from '../../db/clients';
import { createHousehold, updateHouseholdMembers } from '../../db/households';
import { getPortfolioForClient } from '../../db/portfolios';
import { computeGap, formatCurrency, combineCoverage, GAP_STATUS_COLOR } from '../../lib/coverageGap';
import { COVERAGE_CATEGORY_LABELS, COVERAGE_CATEGORIES } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { useClientTab } from './ClientTabContext';
import type { Client, Portfolio, CoverageCategory } from '../../types';

export default function HouseholdTab() {
  const { client, household } = useClientTab();
  const navigate = useNavigate();
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [members, setMembers] = useState<Client[]>([]);
  const [portfolios, setPortfolios] = useState<Record<string, Portfolio>>({});
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(household?.memberClientIds ?? [client.id]);

  useEffect(() => {
    listClients().then(setAllClients);
  }, []);

  useEffect(() => {
    if (!household) {
      setMembers([]);
      return;
    }
    const memberList = allClients.filter((c) => household.memberClientIds.includes(c.id));
    setMembers(memberList.length ? memberList : allClients.filter((c) => c.id === client.id));
    Promise.all(memberList.map((m) => getPortfolioForClient(m.id))).then((results) => {
      const map: Record<string, Portfolio> = {};
      results.forEach((p, i) => (map[memberList[i].id] = p));
      setPortfolios(map);
    });
  }, [household, allClients, client.id]);

  if (!household) {
    return (
      <Card className="p-8">
        <h2 className="mb-2 text-lg font-bold text-slate-800">No Household Yet</h2>
        <p className="mb-4 text-slate-500">
          Group {client.name} with related clients (e.g. spouse) to see combined coverage side-by-side.
        </p>
        {!selecting ? (
          <Button onClick={() => setSelecting(true)}>Create Household</Button>
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm font-medium text-slate-600">Select clients to include:</p>
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 p-2">
              {allClients.map((c) => (
                <label key={c.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    disabled={c.id === client.id}
                    onChange={(e) =>
                      setSelectedIds((ids) => (e.target.checked ? [...ids, c.id] : ids.filter((id) => id !== c.id)))
                    }
                  />
                  {c.name}
                </label>
              ))}
            </div>
            <Button
              onClick={async () => {
                const name = `${client.name.split(' ')[0]} Household`;
                await createHousehold(name, selectedIds);
                window.location.reload();
              }}
            >
              Create with {selectedIds.length} member{selectedIds.length === 1 ? '' : 's'}
            </Button>
          </div>
        )}
      </Card>
    );
  }

  const allCoverage = members.map((m) => portfolios[m.id]?.people.flatMap((p) => p.coverage) ?? []);
  const combined = combineCoverage(allCoverage);

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">{household.name}</h2>
          <Button variant="secondary" onClick={() => setSelecting((s) => !s)}>
            {selecting ? 'Done' : 'Edit Members'}
          </Button>
        </div>
        {selecting && (
          <div className="mb-4 flex flex-col gap-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 p-2">
            {allClients.map((c) => (
              <label key={c.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(c.id)}
                  onChange={async (e) => {
                    const next = e.target.checked ? [...selectedIds, c.id] : selectedIds.filter((id) => id !== c.id);
                    setSelectedIds(next);
                    await updateHouseholdMembers(household.id, next);
                    window.location.reload();
                  }}
                />
                {c.name}
              </label>
            ))}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/clients/${m.id}/portfolio`)}
              className={`rounded-xl border p-4 text-left transition hover:border-indigo-300 ${
                m.id === client.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white'
              }`}
            >
              <p className="font-semibold text-slate-800">{m.name}</p>
              <p className="text-sm text-slate-500">{m.occupation || '—'}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Combined Household Coverage</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {COVERAGE_CATEGORIES.map((category: CoverageCategory) => {
            const item = combined.find((c) => c.category === category) ?? { category, target: 0, inForce: 0, notes: '' };
            const gap = computeGap(item);
            const colors = GAP_STATUS_COLOR[gap.status];
            return (
              <div key={category} className="flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-4 text-center">
                <ProgressRing ratio={gap.ratio} status={gap.status} size={72} />
                <p className="text-sm font-semibold text-slate-700">{COVERAGE_CATEGORY_LABELS[category]}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${colors.bg} ${colors.text}`}>
                  {gap.gap > 0 ? `${formatCurrency(gap.gap)} gap` : 'Met'}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
