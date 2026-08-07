import { useEffect, useRef, useState } from 'react';
import { listKnowledgeDocs, addKnowledgeDoc, deleteKnowledgeDoc } from '../db/knowledgeDocs';
import { extractPdfFullText } from '../lib/knowledgePdf';
import { searchKnowledge, type DocMatch } from '../lib/knowledgeSearch';
import { synthesizeAnswer } from '../lib/knowledgeAssistant';
import { getSettings } from '../db/settings';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import type { KnowledgeDoc } from '../types';

const CATEGORIES = [
  'General Insurance',
  'Wealth Accumulation',
  'Health Protection',
  'Retirement',
  'Prestige Series',
  'Life Protection',
  'Personal Accident',
  'Riders',
  'Other',
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Knowledge() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [question, setQuestion] = useState('');
  const [matches, setMatches] = useState<DocMatch[] | null>(null);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const load = async () => {
    setLoading(true);
    setDocs(await listKnowledgeDocs());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleFiles = async (files: FileList) => {
    setImporting(true);
    const list = Array.from(files);
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      setImportProgress(`Reading ${file.name} (${i + 1}/${list.length})…`);
      try {
        const text = await extractPdfFullText(file, (page, total) => {
          setImportProgress(`Reading ${file.name} (${i + 1}/${list.length}) — page ${page}/${total}`);
        });
        await addKnowledgeDoc({ name: file.name.replace(/\.pdf$/i, ''), category, text, file });
      } catch {
        setImportProgress(`Could not read ${file.name} — skipped (scanned/image-only PDFs aren't supported).`);
      }
    }
    setImportProgress('');
    setImporting(false);
    await load();
  };

  const ask = async () => {
    if (!question.trim()) return;
    setSearched(true);
    setAiAnswer(null);
    const results = searchKnowledge(docs, question, 5);
    setMatches(results);
    if (results.length === 0) return;
    setAiLoading(true);
    try {
      const settings = await getSettings();
      const context = results
        .map((r) => `Source: ${r.doc.name} (${r.doc.category})\n${r.snippets.join('\n')}`)
        .join('\n\n');
      const answer = await synthesizeAnswer(question, context, {
        url: settings.knowledgeEndpointUrl,
        apiKey: settings.knowledgeApiKey,
      });
      setAiAnswer(answer);
    } finally {
      setAiLoading(false);
    }
  };

  const grouped = CATEGORIES.map((c) => ({ category: c, docs: docs.filter((d) => d.category === c) })).filter(
    (g) => g.docs.length > 0,
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Ask A.L.F.R.E.D.</h1>
        <p className="text-slate-500">Search across your imported Product Information Packs — fully on-device, no upload.</p>
      </div>

      <Card className="p-6">
        <h2 className="mb-1 text-lg font-bold text-slate-800">Ask a question</h2>
        <p className="mb-4 text-sm text-slate-500">
          e.g. "What is the policy charges for GWA?" — searches document text directly. If you've configured an AI
          endpoint in Settings, a synthesized answer will also appear.
        </p>
        <div className="flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask()}
            placeholder="Ask about any imported product…"
            className="input flex-1"
          />
          <Button onClick={ask} disabled={!question.trim() || docs.length === 0}>Ask</Button>
        </div>

        {docs.length === 0 && <p className="mt-3 text-sm text-amber-600">Import some PDFs below first.</p>}

        {searched && (
          <div className="mt-5 flex flex-col gap-4">
            {aiLoading && <p className="text-sm text-slate-400">Checking configured AI endpoint…</p>}
            {aiAnswer && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-500">AI Synthesized Answer</p>
                <p className="whitespace-pre-wrap text-slate-700">{aiAnswer}</p>
              </div>
            )}

            {matches && matches.length === 0 && (
              <p className="text-sm text-slate-400">No matches found in your imported documents for that question.</p>
            )}

            {matches && matches.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {aiAnswer ? 'Source excerpts' : 'Matching excerpts (local search)'}
                </p>
                {matches.map((m) => (
                  <div key={m.doc.id} className="rounded-xl bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{m.doc.name}</span>
                      <Badge tone="slate">{m.doc.category}</Badge>
                    </div>
                    <div className="flex flex-col gap-2">
                      {m.snippets.map((s, i) => (
                        <p key={i} className="text-sm text-slate-600">{s}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-1 text-lg font-bold text-slate-800">Import Product PDFs</h2>
        <p className="mb-4 text-sm text-slate-500">
          Files stay on this device only — nothing is uploaded anywhere. Pick a category, then choose one or more PDFs
          (e.g. all your Health Protection PIPs at once).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-56">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && e.target.files.length > 0 && handleFiles(e.target.files)}
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importing…' : '📄 Choose PDF(s)'}
          </Button>
        </div>
        {importProgress && <p className="mt-3 text-sm text-slate-500">{importProgress}</p>}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">Knowledge Library ({docs.length})</h2>
        {loading ? (
          <p className="text-slate-400">Loading…</p>
        ) : docs.length === 0 ? (
          <p className="text-slate-400">No documents imported yet.</p>
        ) : (
          <div className="flex flex-col gap-5">
            {grouped.map((g) => (
              <div key={g.category}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.category}</p>
                <div className="flex flex-col divide-y divide-slate-100">
                  {g.docs.map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-2.5">
                      <div>
                        <p className="font-medium text-slate-700">{d.name}</p>
                        <p className="text-xs text-slate-400">{formatBytes(d.file.size)}</p>
                      </div>
                      <button onClick={async () => { await deleteKnowledgeDoc(d.id); await load(); }} className="text-slate-300 hover:text-rose-500">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
