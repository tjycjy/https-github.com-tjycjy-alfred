import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProspect, updateProspect, deleteProspect, convertProspectToClient } from '../db/prospects';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { DateInput } from '../components/ui/DateInput';
import { PROSPECT_STATUSES } from '../types';
import type { Prospect, ProspectStatus, Client } from '../types';

const STATUS_TONE: Record<ProspectStatus, 'slate' | 'indigo' | 'amber' | 'red' | 'green'> = {
  New: 'slate',
  Contacted: 'indigo',
  'Meeting Booked': 'amber',
  'Proposal Sent': 'amber',
  'Not Interested': 'red',
  Converted: 'green',
};

export default function ProspectDetail() {
  const { prospectId } = useParams();
  const navigate = useNavigate();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [converting, setConverting] = useState(false);
  const [newClient, setNewClient] = useState<Client | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutosave = useRef(false);

  useEffect(() => {
    if (!prospectId) return;
    skipNextAutosave.current = true;
    setLoading(true);
    getProspect(prospectId).then((p) => {
      setProspect(p ?? null);
      setLoading(false);
    });
  }, [prospectId]);

  useEffect(() => {
    if (!prospect) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await updateProspect(prospect);
      setSaving(false);
      setSavedAt(Date.now());
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [prospect]);

  if (loading) return <p className="text-slate-400">Loading…</p>;
  if (!prospect || !prospectId) {
    return (
      <div className="text-center text-slate-500">
        <p>Prospect not found.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/prospects')}>
          Back to Prospects
        </Button>
      </div>
    );
  }

  const set = <K extends keyof Prospect>(key: K, value: Prospect[K]) => setProspect({ ...prospect, [key]: value });

  const handleConvert = async () => {
    setConverting(true);
    const client = await convertProspectToClient(prospect);
    setConverting(false);
    setProspect({ ...prospect, status: 'Converted', convertedClientId: client.id });
    setNewClient(client);
  };

  const handleDelete = async () => {
    await deleteProspect(prospect.id);
    navigate('/prospects');
  };

  const isConverted = prospect.status === 'Converted';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate('/prospects')} className="mb-1 text-sm font-semibold text-indigo-600">
            ← Prospects
          </button>
          <h1 className="text-2xl font-bold text-slate-800">{prospect.name || 'New Prospect'}</h1>
          <p className="text-sm text-slate-400">{saving ? 'Saving…' : savedAt ? 'All changes saved ✓' : ''}</p>
        </div>
        <Badge tone={STATUS_TONE[prospect.status]}>{prospect.status}</Badge>
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-bold text-slate-800">Contact Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Full name</label>
            <input value={prospect.name} onChange={(e) => set('name', e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Phone</label>
            <input value={prospect.phone} onChange={(e) => set('phone', e.target.value)} className="input" placeholder="+65 9123 4567" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Email</label>
            <input value={prospect.email} onChange={(e) => set('email', e.target.value)} className="input" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">How did you meet?</label>
            <input value={prospect.source} onChange={(e) => set('source', e.target.value)} className="input" />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-bold text-slate-800">First Meeting Notes</h2>
        <textarea
          value={prospect.firstMeetingNotes}
          onChange={(e) => set('firstMeetingNotes', e.target.value)}
          rows={5}
          className="input"
          placeholder="What did you talk about? Their needs, concerns, family situation, budget…"
        />
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-bold text-slate-800">Status & Next Approach</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Status</label>
            <select
              value={prospect.status}
              onChange={(e) => set('status', e.target.value as ProspectStatus)}
              className="input"
              disabled={isConverted}
            >
              {PROSPECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Next approach date</label>
            <DateInput
              value={prospect.nextApproachDate ?? ''}
              onChange={(v) => set('nextApproachDate', v || null)}
              disabled={isConverted}
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-slate-600">Next approach plan</label>
          <textarea
            value={prospect.nextApproach}
            onChange={(e) => set('nextApproach', e.target.value)}
            rows={3}
            className="input"
            placeholder="e.g. Send FNA form, follow up on hospital plan quote, book a proper appointment…"
            disabled={isConverted}
          />
        </div>
      </Card>

      {isConverted ? (
        <Card className="flex items-center justify-between gap-4 bg-emerald-50 p-5">
          <div>
            <p className="font-bold text-emerald-700">🎉 Converted to client</p>
            <p className="text-sm text-emerald-600">This prospect is now a full client record.</p>
          </div>
          {prospect.convertedClientId && (
            <Button onClick={() => navigate(`/clients/${prospect.convertedClientId}/basic-info`)}>View Client</Button>
          )}
        </Card>
      ) : (
        <Card className="p-5">
          <h2 className="mb-2 font-bold text-slate-800">Ready to close?</h2>
          <p className="mb-4 text-sm text-slate-500">
            Converting creates a full client record with this contact info and your meeting notes carried over.
          </p>
          <Button onClick={handleConvert} disabled={converting} className="w-full">
            {converting ? 'Converting…' : '🎉 Convert to Client'}
          </Button>
        </Card>
      )}

      <div className="flex justify-end">
        <button onClick={() => setConfirmDelete(true)} className="text-sm font-medium text-rose-500 hover:underline">
          Delete prospect
        </button>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Delete Prospect?">
        <div className="flex flex-col gap-4">
          <p className="text-slate-600">
            This will permanently remove {prospect.name || 'this prospect'} and their notes. This can't be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!newClient} onClose={() => setNewClient(null)} title="🎉 Congratulations!">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="text-6xl">🎉</div>
          <p className="text-slate-500">
            {prospect.name} is now a client. Their first meeting notes have carried over — pick up where you left off in Fact-Find and
            Portfolio.
          </p>
          <div className="flex w-full gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setNewClient(null)}>
              Stay Here
            </Button>
            <Button className="flex-1" onClick={() => newClient && navigate(`/clients/${newClient.id}/basic-info`)}>
              Go to Client Profile
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
