import { useEffect, useMemo, useState } from 'react';
import { listObjections, addObjection, updateObjection, deleteObjection } from '../db/objections';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import type { ObjectionEntry } from '../types';

export default function ObjectionHandling() {
  const [objections, setObjections] = useState<ObjectionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ObjectionEntry | null>(null);

  const load = async () => {
    setLoading(true);
    setObjections(await listObjections());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return objections;
    return objections.filter(
      (o) => o.objection.toLowerCase().includes(q) || o.response.toLowerCase().includes(q) || o.category.toLowerCase().includes(q),
    );
  }, [objections, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Objection-Handling Crib Sheet</h1>
          <p className="text-slate-500">Advisor reference only — not shown to clients.</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ Add Objection</Button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search objections or responses…"
        className="input"
      />

      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-slate-400">No matches.</Card>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((o) => (
            <Card key={o.id} className="p-4">
              <button
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
              >
                <div className="flex items-center gap-3">
                  <Badge tone="indigo">{o.category}</Badge>
                  <span className="font-semibold text-slate-800">{o.objection}</span>
                </div>
                <span className="text-slate-400">{expandedId === o.id ? '▲' : '▼'}</span>
              </button>
              {expandedId === o.id && (
                <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3">
                  <p className="whitespace-pre-wrap text-slate-600">{o.response}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setEditing(o); setShowForm(true); }}
                      className="text-sm font-semibold text-indigo-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => { await deleteObjection(o.id); await load(); }}
                      className="text-sm font-semibold text-rose-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <ObjectionFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        editing={editing}
        onSaved={async () => { setShowForm(false); await load(); }}
      />
    </div>
  );
}

function ObjectionFormModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: ObjectionEntry | null;
  onSaved: () => void;
}) {
  const [objection, setObjection] = useState(editing?.objection ?? '');
  const [response, setResponse] = useState(editing?.response ?? '');
  const [category, setCategory] = useState(editing?.category ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setObjection(editing?.objection ?? '');
    setResponse(editing?.response ?? '');
    setCategory(editing?.category ?? '');
  }, [editing, open]);

  const save = async () => {
    if (!objection.trim() || !response.trim()) return;
    setSaving(true);
    if (editing) {
      await updateObjection({ ...editing, objection: objection.trim(), response: response.trim(), category: category.trim() || 'General' });
    } else {
      await addObjection({ objection: objection.trim(), response: response.trim(), category: category.trim() || 'General' });
    }
    setSaving(false);
    onSaved();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Objection' : 'Add Objection'}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Category</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className="input" placeholder="e.g. Cost, Trust, Timing" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Objection</label>
          <input value={objection} onChange={(e) => setObjection(e.target.value)} className="input" placeholder="What the client says…" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Suggested response</label>
          <textarea value={response} onChange={(e) => setResponse(e.target.value)} rows={5} className="input resize-none" />
        </div>
        <Button onClick={save} disabled={!objection.trim() || !response.trim() || saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  );
}
