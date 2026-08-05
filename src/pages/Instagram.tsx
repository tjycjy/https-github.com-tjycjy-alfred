import { useEffect, useState } from 'react';
import { getBriefing } from '../db/news';
import { INSTAGRAM_TOPICS } from '../lib/instagramTemplates';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { NewsBriefing } from '../types';

export default function Instagram() {
  const [topicId, setTopicId] = useState(INSTAGRAM_TOPICS[0].id);
  const [detail, setDetail] = useState('');
  const [templateIndex, setTemplateIndex] = useState(0);
  const [briefing, setBriefing] = useState<NewsBriefing | null>(null);
  const [copiedField, setCopiedField] = useState<'caption' | 'hashtags' | null>(null);

  useEffect(() => {
    getBriefing().then(setBriefing);
  }, []);

  const topic = INSTAGRAM_TOPICS.find((t) => t.id === topicId) ?? INSTAGRAM_TOPICS[0];
  const templates = topic.templates(detail.trim());
  const caption = templates[templateIndex % templates.length];
  const hashtags = topic.hashtags.join(' ');

  const copy = async (text: string, field: 'caption' | 'hashtags') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // clipboard API unavailable — user can still select and copy manually
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Instagram Draft Assistant</h1>
        <p className="text-slate-500">Generates a draft caption + hashtags to copy-paste — this never posts on your behalf.</p>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-600">Topic</label>
          <div className="flex flex-wrap gap-2">
            {INSTAGRAM_TOPICS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTopicId(t.id);
                  setTemplateIndex(0);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  topicId === t.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600">Detail (optional)</label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            className="input resize-none"
            placeholder="Add specifics — a stat, a client story, a news headline…"
          />
          {briefing?.lastRefreshedAt && (briefing.globalNews || briefing.sgNews || briefing.otherNews) && (
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-xs font-medium text-slate-400">Pull from News:</span>
              {briefing.globalNews && (
                <button onClick={() => setDetail(briefing.globalNews)} className="text-xs font-semibold text-indigo-600 hover:underline">Global</button>
              )}
              {briefing.sgNews && (
                <button onClick={() => setDetail(briefing.sgNews)} className="text-xs font-semibold text-indigo-600 hover:underline">Singapore</button>
              )}
              {briefing.otherNews && (
                <button onClick={() => setDetail(briefing.otherNews)} className="text-xs font-semibold text-indigo-600 hover:underline">Other</button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button onClick={() => setTemplateIndex((i) => (i + 1) % templates.length)} variant="secondary">
            🔀 Try Another Version
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Suggested Caption</h2>
          <button onClick={() => copy(caption, 'caption')} className="text-sm font-semibold text-indigo-600 hover:underline">
            {copiedField === 'caption' ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
        <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-slate-700">{caption}</p>
      </Card>

      <Card className="p-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">Suggested Hashtags</h2>
          <button onClick={() => copy(hashtags, 'hashtags')} className="text-sm font-semibold text-indigo-600 hover:underline">
            {copiedField === 'hashtags' ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
        <p className="rounded-xl bg-slate-50 p-4 text-indigo-600">{hashtags}</p>
      </Card>
    </div>
  );
}
