import { useEffect, useState } from 'react';
import { getBriefing, saveBriefing } from '../db/news';
import { fetchAutoBriefing, type FeedHeadline } from '../lib/newsFeeds';
import { formatDateTime } from '../lib/age';
import { Button } from '../components/ui/Button';
import type { NewsBriefing } from '../types';

const LINK_DELIM = ' ||| ';

function formatTimestamp(iso: string | null): string {
  if (!iso) return 'Never refreshed';
  return formatDateTime(iso);
}

function toHeadlines(text: string): FeedHeadline[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^[-•*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(LINK_DELIM);
      return idx === -1 ? { title: line, link: '' } : { title: line.slice(0, idx), link: line.slice(idx + LINK_DELIM.length) };
    });
}

function serializeHeadlines(headlines: FeedHeadline[]): string {
  return headlines.map((h) => (h.link ? `${h.title}${LINK_DELIM}${h.link}` : h.title)).join('\n');
}

function headlinesToPlainText(headlines: FeedHeadline[]): string {
  return headlines.map((h) => h.title).join('\n');
}

export default function News() {
  const [briefing, setBriefing] = useState<NewsBriefing | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ globalNews: '', sgNews: '', otherNews: '' });
  const [saving, setSaving] = useState(false);
  const [autoFetching, setAutoFetching] = useState(false);
  const [fetchErrors, setFetchErrors] = useState<string[]>([]);

  useEffect(() => {
    getBriefing().then(setBriefing);
  }, []);

  const startEdit = () => {
    if (!briefing) return;
    setDraft({
      globalNews: headlinesToPlainText(toHeadlines(briefing.globalNews)),
      sgNews: headlinesToPlainText(toHeadlines(briefing.sgNews)),
      otherNews: headlinesToPlainText(toHeadlines(briefing.otherNews)),
    });
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

  const autoRefresh = async () => {
    setAutoFetching(true);
    setFetchErrors([]);
    try {
      const result = await fetchAutoBriefing();
      const updated: NewsBriefing = {
        id: 'briefing',
        globalNews: serializeHeadlines(result.globalNews),
        sgNews: serializeHeadlines(result.sgNews),
        otherNews: serializeHeadlines(result.otherNews),
        lastRefreshedAt: new Date().toISOString(),
      };
      await saveBriefing(updated);
      setBriefing(updated);
      setFetchErrors(result.errors);
    } catch {
      setFetchErrors(['Could not reach any news source — check your connection and try again.']);
    } finally {
      setAutoFetching(false);
    }
  };

  if (!briefing) return <p className="text-slate-400">Loading…</p>;

  const globalHeadlines = toHeadlines(briefing.globalNews);
  const sgHeadlines = toHeadlines(briefing.sgNews);
  const otherHeadlines = toHeadlines(briefing.otherNews);
  const totalHeadlines = globalHeadlines.length + sgHeadlines.length + otherHeadlines.length;

  return (
    <div className="-mx-4 -mt-6 flex flex-col sm:-mx-6">
      {/* Masthead */}
      <div className="bg-slate-900 px-4 py-5 text-white sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Market Briefing</p>
            <h1 className="text-2xl font-bold tracking-tight">Today's Briefing</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-slate-400">
                {briefing.lastRefreshedAt ? `As of ${formatTimestamp(briefing.lastRefreshedAt)}` : 'Never refreshed'}
              </p>
              {totalHeadlines > 0 && <p className="text-xs text-slate-400">{totalHeadlines} headlines</p>}
            </div>
            {!editing && (
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={startEdit} className="!bg-slate-700 !text-white hover:!bg-slate-600">
                  ✏️ Edit
                </Button>
                <Button onClick={autoRefresh} disabled={autoFetching} className="!bg-amber-500 text-slate-900 hover:!bg-amber-400">
                  {autoFetching ? 'Fetching…' : '🔄 Auto-Refresh'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        {fetchErrors.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            {fetchErrors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        )}

        {editing ? (
          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Auto-Refresh pulls real headlines from Yahoo Finance, The Business Times, and CNA — no typing needed.
              Use this manual editor only if you want to override with your own picks — one headline per line.
            </p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">🌍 Global Market News</label>
              <textarea value={draft.globalNews} onChange={(e) => setDraft({ ...draft, globalNews: e.target.value })} rows={6} className="input resize-none" placeholder={'One headline per line…'} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">🇸🇬 Singapore Market News</label>
              <textarea value={draft.sgNews} onChange={(e) => setDraft({ ...draft, sgNews: e.target.value })} rows={6} className="input resize-none" placeholder={'One headline per line…'} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">📋 Other News (insurance / regulatory / MAS)</label>
              <textarea value={draft.otherNews} onChange={(e) => setDraft({ ...draft, otherNews: e.target.value })} rows={6} className="input resize-none" placeholder={'One headline per line…'} />
            </div>
            <div className="flex gap-3">
              <Button onClick={save} disabled={saving}>{saving ? 'Publishing…' : 'Publish Briefing'}</Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : !briefing.lastRefreshedAt ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-700">No briefing published yet</p>
            <p className="mt-1">
              Tap "Auto-Refresh" to pull real headlines from Yahoo Finance, The Business Times, and CNA — or "Edit" to
              paste your own.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <NewsColumn accent="border-blue-500" icon="🌍" title="Global Markets" headlines={globalHeadlines} lead />
            <NewsColumn accent="border-rose-500" icon="🇸🇬" title="Singapore Markets" headlines={sgHeadlines} />
            <NewsColumn accent="border-amber-500" icon="📋" title="Regulatory & Industry" headlines={otherHeadlines} />
          </div>
        )}
      </div>
    </div>
  );
}

function NewsColumn({
  accent,
  icon,
  title,
  headlines,
  lead,
}: {
  accent: string;
  icon: string;
  title: string;
  headlines: FeedHeadline[];
  lead?: boolean;
}) {
  return (
    <div className={`rounded-2xl border-t-4 ${accent} bg-white p-5 shadow-sm`}>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
        <span>{icon}</span> {title}
      </h2>
      {headlines.length === 0 ? (
        <p className="text-sm text-slate-400">No headlines added.</p>
      ) : (
        <div className="flex flex-col">
          {headlines.map((headline, i) => {
            const textClass = lead && i === 0 ? 'text-lg font-bold leading-snug text-slate-900' : 'font-semibold leading-snug text-slate-800';
            return (
              <div key={i} className={`py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                {headline.link ? (
                  <a href={headline.link} target="_blank" rel="noreferrer" className={`${textClass} hover:text-indigo-600 hover:underline`}>
                    {headline.title}
                  </a>
                ) : (
                  <p className={textClass}>{headline.title}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
