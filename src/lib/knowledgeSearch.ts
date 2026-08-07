import type { KnowledgeDoc } from '../types';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'what', 'when', 'where', 'which', 'who', 'whom', 'why', 'how',
  'does', 'do', 'did', 'can', 'could', 'would', 'should', 'will', 'shall',
  'for', 'of', 'on', 'in', 'to', 'and', 'or', 'but', 'with', 'from',
  'this', 'that', 'these', 'those', 'it', 'its', 'me', 'my', 'i', 'you', 'your',
]);

// Common GE product-name acronyms, so a question like "what is GWA" also matches documents
// whose text/filename spells the name out in full. This only widens what we search for — it
// never injects text into an answer, so an imprecise guess here is harmless, not misleading.
const ACRONYM_EXPANSIONS: Record<string, string[]> = {
  gwa: ['wealth', 'advantage'],
  gfa: ['flexi', 'advantage'],
  gia: ['invest', 'advantage'],
  gla: ['life', 'advantage'],
  gts: ['term', 'special'],
  gsp: ['sp'],
  gwm: ['wealth', 'multiplier'],
  glp: ['lifetime', 'payout'],
  shp: ['supremehealth'],
  tc: ['totalcare'],
  tc2: ['totalcare'],
};

function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function expandTerms(terms: string[]): string[] {
  const expanded = new Set(terms);
  for (const term of terms) {
    for (const word of ACRONYM_EXPANSIONS[term] ?? []) expanded.add(word);
    // naive plural/singular folding
    if (term.endsWith('s') && term.length > 3) expanded.add(term.slice(0, -1));
  }
  return Array.from(expanded);
}

export interface DocMatch {
  doc: KnowledgeDoc;
  snippets: string[];
  score: number;
}

export function searchKnowledge(docs: KnowledgeDoc[], query: string, maxResults = 5): DocMatch[] {
  const rawTerms = Array.from(new Set(tokenize(query))).filter((t) => t.length > 2 && !STOPWORDS.has(t));
  if (rawTerms.length === 0) return [];
  const terms = expandTerms(rawTerms);

  const results: DocMatch[] = [];
  for (const doc of docs) {
    const lowerText = doc.text.toLowerCase();
    const lowerName = doc.name.toLowerCase();
    let score = 0;
    const matchStarts: number[] = [];

    for (const term of terms) {
      if (lowerName.includes(term)) score += 5;

      let idx = lowerText.indexOf(term);
      let count = 0;
      while (idx !== -1 && count < 8) {
        score += 1;
        matchStarts.push(idx);
        idx = lowerText.indexOf(term, idx + term.length);
        count++;
      }
    }
    if (score === 0) continue;

    matchStarts.sort((a, b) => a - b);
    const snippets: string[] = [];
    let lastEnd = -1000;
    for (const start of matchStarts) {
      if (start - lastEnd < 250) continue;
      const windowStart = Math.max(0, start - 120);
      const windowEnd = Math.min(doc.text.length, start + 220);
      const snippet = doc.text.slice(windowStart, windowEnd).replace(/\s+/g, ' ').trim();
      snippets.push(`${windowStart > 0 ? '…' : ''}${snippet}${windowEnd < doc.text.length ? '…' : ''}`);
      lastEnd = windowEnd;
      if (snippets.length >= 3) break;
    }
    // Filename-only matches (e.g. acronym only in the name, not the body) still deserve a
    // result even with zero body snippets, so the advisor can see which document to open.
    if (snippets.length === 0 && lowerName.split(/\W+/).some((w) => terms.includes(w))) {
      snippets.push('(matched by document name — open the document to read it)');
    }
    results.push({ doc, snippets, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults);
}
