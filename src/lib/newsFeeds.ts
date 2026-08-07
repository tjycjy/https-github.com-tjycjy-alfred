export interface FeedHeadline {
  title: string;
  link: string;
  image: string;
  description: string;
}

const REGULATORY_KEYWORDS = [
  'insur', 'mas ', 'cpf', 'bank', 'financ', 'invest', 'fund', 'premium',
  'regulat', 'tax', 'retirement', 'wealth', 'policy', 'insolven', 'compliance',
];

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').trim();
}

async function fetchRss(url: string, limit: number): Promise<FeedHeadline[]> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`${url} responded ${res.status}`);
  const text = await res.text();
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error(`${url} returned unparseable XML`);
  return Array.from(doc.querySelectorAll('item'))
    .map((item) => {
      const media = item.getElementsByTagNameNS('*', 'content')[0] ?? item.getElementsByTagNameNS('*', 'thumbnail')[0];
      return {
        title: item.querySelector('title')?.textContent?.trim() ?? '',
        link: item.querySelector('link')?.textContent?.trim() ?? '',
        image: media?.getAttribute('url') ?? '',
        description: stripHtml(item.querySelector('description')?.textContent ?? ''),
      };
    })
    .filter((h) => h.title)
    .slice(0, limit);
}

export interface AutoBriefingResult {
  globalNews: FeedHeadline[];
  sgNews: FeedHeadline[];
  otherNews: FeedHeadline[];
  errors: string[];
}

export async function fetchAutoBriefing(): Promise<AutoBriefingResult> {
  const errors: string[] = [];

  const [globalNews, sgNews, cnaFeed] = await Promise.all([
    fetchRss('https://finance.yahoo.com/rss/topstories', 10).catch((e) => {
      errors.push('Global Markets (Yahoo Finance) failed to load — try again or paste manually.');
      console.error(e);
      return [] as FeedHeadline[];
    }),
    fetchRss('https://www.businesstimes.com.sg/rss/companies-markets', 10).catch((e) => {
      errors.push('Singapore Markets (Business Times) failed to load — try again or paste manually.');
      console.error(e);
      return [] as FeedHeadline[];
    }),
    fetchRss('https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml', 40).catch((e) => {
      errors.push('Regulatory & Industry (CNA) failed to load — try again or paste manually.');
      console.error(e);
      return [] as FeedHeadline[];
    }),
  ]);

  const filtered = cnaFeed.filter((h) => REGULATORY_KEYWORDS.some((k) => h.title.toLowerCase().includes(k)));
  const otherNews = (filtered.length >= 4 ? filtered : cnaFeed).slice(0, 10);

  return { globalNews, sgNews, otherNews, errors };
}
