import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listProspects, createProspect } from '../db/prospects';
import { censorName, censorPhone } from '../lib/privacy';
import { useAppMode } from '../state/AppModeContext';
import { formatDate, daysUntil } from '../lib/age';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { PROSPECT_STATUSES } from '../types';
import type { Prospect, ProspectStatus } from '../types';

const STATUS_TONE: Record<ProspectStatus, 'slate' | 'indigo' | 'amber' | 'red' | 'green'> = {
  New: 'slate',
  Contacted: 'indigo',
  'Meeting Booked': 'amber',
  'Proposal Sent': 'amber',
  'Not Interested': 'red',
  Converted: 'green',
};

export default function Prospects() {
  const navigate = useNavigate();
  const { privacyMode } = useAppMode();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ProspectStatus>('All');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    setLoading(true);
    setProspects(await listProspects());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prospects.filter((p) => {
      if (statusFilter !== 'All' && p.status !== statusFilter) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.source.toLowerCase().includes(q);
    });
  }, [prospects, search, statusFilter]);

  const activeCount = prospects.filter((p) => p.status !== 'Converted' && p.status !== 'Not Interested').length;
  const convertedCount = prospects.filter((p) => p.status === 'Converted').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Prospects</h1>
          <p className="text-slate-500">
            {activeCount} active · {convertedCount} converted to client{convertedCount === 1 ? '' : 's'}
          </p>
        </div>
        <Button onClick={() => setShowNew(true)}>+ New Prospect</Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or how you met…"
          className="input sm:flex-1"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'All' | ProspectStatus)} className="input sm:w-56">
          <option value="All">All statuses</option>
          {PROSPECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">
          No prospects yet. Log the next person you meet — pitch them today, convert them tomorrow.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const days = daysUntil(p.nextApproachDate);
            const overdue = p.status !== 'Converted' && p.status !== 'Not Interested' && days !== null && days < 0;
            return (
              <Card key={p.id} className="p-5" onClick={() => navigate(`/prospects/${p.id}`)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{privacyMode ? censorName(p.name) : p.name}</h3>
                    <p className="text-sm text-slate-500">{p.source || 'Source not set'}</p>
                    {p.phone && <p className="text-sm text-slate-400">{privacyMode ? censorPhone(p.phone) : p.phone}</p>}
                  </div>
                  <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
                </div>
                {p.nextApproach && (
                  <p className="mt-3 text-sm text-slate-500">
                    Next: {p.nextApproach}
                    {p.nextApproachDate && ` · ${formatDate(p.nextApproachDate)}`}
                  </p>
                )}
                {overdue && (
                  <div className="mt-2">
                    <Badge tone="red">Follow-up overdue</Badge>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <NewProspectModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(prospect) => {
          setShowNew(false);
          navigate(`/prospects/${prospect.id}`);
        }}
      />
    </div>
  );
}

function NewProspectModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (prospect: Prospect) => void;
}) {
  const [name, setName] = useState('');
  const [source, setSource] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const prospect = await createProspect({ name: name.trim(), source: source.trim() });
    setSaving(false);
    setName('');
    setSource('');
    onCreated(prospect);
  };

  return (
    <Modal open={open} onClose={onClose} title="New Prospect">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" autoFocus placeholder="Who did you just meet?" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">How did you meet?</label>
          <input
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="input"
            placeholder="e.g. Referral from client, roadshow, cold call…"
          />
        </div>
        <Button onClick={submit} disabled={!name.trim() || saving}>
          {saving ? 'Creating…' : 'Add Prospect'}
        </Button>
      </div>
    </Modal>
  );
}
