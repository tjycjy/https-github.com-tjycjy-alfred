import { useEffect, useState } from 'react';
import { getBriefing, saveBriefing } from '../db/news';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { NewsBriefing } from '../types';

function formatTimestamp(iso: string | null): string {
  if (!iso) return 'Never refreshed';
  return `As of ${new Date(iso).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short' })}`;
}

export default function News() {
  const [briefing, setBriefing] = useState<NewsBriefing | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ globalNews: '', sgNews: '', otherNews: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBriefing().then(setBriefing);
  }, []);

  const startEdit = () => {
    if (!briefing) return;
    setDraft({ globalNews: briefing.globalNews, sgNews: briefing.sgNews, otherNews: briefing.otherNews });
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    const updated: NewsBriefing = {
      id: 'briefing',
      globalNews: draft.globalNews.trim(),
      sgNews: draft.sgNews.trim(),
      otherNews: draft.otherNews.trim(),
      lastRefreshedAt: new Date().toISOString(),
    };
    await saveBriefing(updated);
    setBriefing(updated);
    setSaving(false);
    setEditing(false);
  };

  if (!briefing) return <p className="text-slate-400">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">News</h1>
          <p className="text-slate-500">{formatTimestamp(briefing.lastRefreshedAt)}</p>
        </div>
        {!editing && <Button onClick={startEdit}>🔄 Refresh Today's Briefing</Button>}
      </div>

      {!briefing.lastRefreshedAt && !editing && (
        <Card className="p-6 text-slate-500">
          <p>
            No briefing yet. This app has no built-in news feed — tap "Refresh Today's Briefing" and paste in
            today's headlines (e.g. from a Claude conversation, an email digest, or your own reading) to save a
            timestamped snapshot here.
          </p>
        </Card>
      )}

      {editing ? (
        <Card className="flex flex-col gap-5 p-6">
          <p className="text-sm text-slate-500">
            Paste or type today's briefing into the three sections below, then save. This becomes the new "as of"
            snapshot shown on this page.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">🌍 Top 5 Global Market News</label>
            <textarea value={draft.globalNews} onChange={(e) => setDraft({ ...draft, globalNews: e.target.value })} rows={6} className="input resize-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">🇸🇬 Top 5 Singapore Market News</label>
            <textarea value={draft.sgNews} onChange={(e) => setDraft({ ...draft, sgNews: e.target.value })} rows={6} className="input resize-none" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">📋 Other News (insurance / regulatory / MAS)</label>
            <textarea value={draft.otherNews} onChange={(e) => setDraft({ ...draft, otherNews: e.target.value })} rows={6} className="input resize-none" />
          </div>
          <div className="flex gap-3">
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Briefing'}</Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </Card>
      ) : (
        briefing.lastRefreshedAt && (
          <div className="flex flex-col gap-4">
            <BriefingSection icon="🌍" title="Top 5 Global Market News" content={briefing.globalNews} />
            <BriefingSection icon="🇸🇬" title="Top 5 Singapore Market News" content={briefing.sgNews} />
            <BriefingSection icon="📋" title="Other News That May Concern You" content={briefing.otherNews} />
          </div>
        )
      )}
    </div>
  );
}

function BriefingSection({ icon, title, content }: { icon: string; title: string; content: string }) {
  return (
    <Card className="p-6">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-bold text-slate-800">
        <span>{icon}</span> {title}
      </h2>
      {content ? (
        <p className="whitespace-pre-wrap text-slate-600">{content}</p>
      ) : (
        <p className="text-slate-400">Nothing added yet.</p>
      )}
    </Card>
  );
}
