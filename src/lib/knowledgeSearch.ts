import type { KnowledgeDoc } from '../types';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'what', 'when', 'where', 'which', 'who', 'whom', 'why', 'how',
  'does', 'do', 'did', 'can', 'could', 'would', 'should', 'will', 'shall',
  'for', 'of', 'on', 'in', 'to', 'and', 'or', 'but', 'with', 'from',
  'this', 'that', 'these', 'those', 'it', 'its', 'me', 'my', 'i', 'you', 'your',
]);

function tokenize(s: string): string[] {
  return s.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

export interface DocMatch {
  doc: KnowledgeDoc;
  snippets: string[];
  score: number;
}

export function searchKnowledge(docs: KnowledgeDoc[], query: string, maxResults = 5): DocMatch[] {
  const terms = Array.from(new Set(tokenize(query))).filter((t) => t.length > 2 && !STOPWORDS.has(t));
  if (terms.length === 0) return [];

  const results: DocMatch[] = [];
  for (const doc of docs) {
    const lowerText = doc.text.toLowerCase();
    let score = 0;
    const matchStarts: number[] = [];
    for (const term of terms) {
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
    results.push({ doc, snippets, score });
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, maxResults);
}
