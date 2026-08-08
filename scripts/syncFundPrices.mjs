// Syncs GreatLink fund prices from Great Eastern's own public fund-prices page API
// (the same JSON endpoint their public website's price-lookup widget calls — no
// login, no API key, first-party published data). Writes static JSON the app
// bundles and reads same-origin at runtime, avoiding CORS entirely.
//
// Usage:
//   node scripts/syncFundPrices.mjs            # daily sync: refresh current month for every fund
//   node scripts/syncFundPrices.mjs --backfill=5  # also backfill N years of history (one-off)

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'data', 'funds');
const BASE_URL = 'https://www.greateasternlife.com/bin/corp-site/fund-prices.json';
const REFERER = 'https://www.greateasternlife.com/sg/en/personal-insurance/our-products/wealth-accumulation/great-invest-advantage/greatlink-funds-prices.html';

const ASSET_CLASS_MAP = {
  'greatlink singapore equities': 'Equity Asia',
  'greatlink asean growth': 'Equity Asia',
  'greatlink european sustainable equity': 'Equity Europe',
  'greatlink global real estate securities': 'Real Estate International',
  'greatlink international health care': 'Healthcare International',
  'greatlink lion india': 'Equity Asia',
  'greatlink singapore physical gold': 'Gold Asia',
  'greatlink cash': 'Money Market',
  'greatlink short duration bond': 'Bond International',
  'greatlink global equity alpha': 'Equity US',
  'greatlink global equity': 'Equity US',
  'greatlink income bond': 'Bond International',
  'greatlink income focus': 'Bond International',
  'greatlink global bond': 'Bond International',
  'greatlink global supreme': 'Portfolio International',
  'greatlink lion japan growth': 'Equity Asia',
  'greatlink multi-sector income': 'Bond Asia',
  'greatlink diversified growth portfolio': 'Portfolio International',
  'greatlink global perspective': 'Equity International',
  'greatlink us income and growth': 'Portfolio US',
  'greatlink sustainable global thematic': 'Equity International',
  'greatlink multi-theme equity': 'Equity International',
  'greatlink global disruptive innovation': 'Equity US',
  'greatlink lion asian balanced': 'Portfolio International',
  'greatlink asia dividend advantage': 'Equity Asia',
  'greatlink lion vietnam': 'Equity Asia',
  'greatlink global technology': 'Information Technology International',
  'greatlink asia high dividend equity': 'Equity Asia',
  'greatlink asia pacific equity': 'Equity Asia',
  'greatlink global emerging markets equity': 'Equity Emerging Market',
  'greatlink china growth': 'Equity Asia',
  'greatlink far east ex japan equities': 'Equity Asia',
  'greatlink lifestyle balanced portfolio': 'Portfolio International',
};

function normalizeKey(name) {
  return name
    .toLowerCase()
    .replace(/\bfund\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function classify(name) {
  const key = normalizeKey(name);
  for (const [prefix, cls] of Object.entries(ASSET_CLASS_MAP)) {
    if (key.startsWith(prefix)) return cls;
  }
  return 'Other';
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\bfund\b/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fetchJson(params) {
  const url = `${BASE_URL}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url, { headers: { Referer: REFERER } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchDailySnapshot() {
  const data = await fetchJson({ name: 'gDaily', mode: 'daily' });
  if (data.statusCode !== '0') throw new Error('Unexpected daily snapshot response: ' + JSON.stringify(data).slice(0, 200));
  return (data.funds || []).filter((f) => f.fundType === 'UNIT LINKED TYPE');
}

async function fetchHistoricalMonth(fundCode, monthYear) {
  const data = await fetchJson({
    name: 'gHistorical',
    mode: 'historical',
    fundcode: `'${fundCode}'`,
    funddate: monthYear, // 'MM/YYYY'
    datepattern: 'mm/yyyy',
    pageno: 1,
    pagesize: 31,
  });
  if (data.statusCode !== '0') return [];
  return data.funds || [];
}

function monthsBack(n) {
  const months = [];
  const now = new Date();
  for (let i = 0; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`);
  }
  return months;
}

async function loadExisting(slug) {
  try {
    const text = await readFile(path.join(OUT_DIR, `${slug}.json`), 'utf-8');
    return JSON.parse(text);
  } catch {
    return [];
  }
}

function mergeHistory(existing, incoming) {
  const byDate = new Map(existing.map((p) => [p.date, p.nav]));
  for (const p of incoming) byDate.set(p.date, p.nav);
  return Array.from(byDate.entries())
    .map(([date, nav]) => ({ date, nav }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function main() {
  const backfillArg = process.argv.find((a) => a.startsWith('--backfill'));
  const backfillYears = backfillArg ? Number(backfillArg.split('=')[1] || '3') : 0;

  await mkdir(OUT_DIR, { recursive: true });

  console.log('Fetching daily snapshot…');
  const daily = await fetchDailySnapshot();
  console.log(`Found ${daily.length} unit-linked funds.`);

  const index = [];
  const monthsToSync = backfillYears > 0 ? monthsBack(backfillYears * 12) : monthsBack(1);

  for (const fund of daily) {
    const slug = slugify(fund.fundName);
    const assetClass = classify(fund.fundName);
    let existing = await loadExisting(slug);

    for (const monthYear of monthsToSync) {
      try {
        const monthData = await fetchHistoricalMonth(fund.fundCode, monthYear);
        const points = monthData
          .filter((p) => p.fundBidPrice && !Number.isNaN(Number(p.fundBidPrice)))
          .map((p) => ({ date: p.fundValueDate, nav: Number(p.fundBidPrice) }));
        existing = mergeHistory(existing, points);
      } catch (err) {
        console.warn(`  ! ${fund.fundName} (${monthYear}): ${err.message}`);
      }
    }

    // Always make sure today's snapshot point is in there even if historical lookup missed it.
    if (fund.fundValueDate && fund.fundBidPrice) {
      existing = mergeHistory(existing, [{ date: fund.fundValueDate, nav: Number(fund.fundBidPrice) }]);
    }

    await writeFile(path.join(OUT_DIR, `${slug}.json`), JSON.stringify(existing));
    index.push({
      slug,
      name: fund.fundName.replace(/\s+Fund$/, ''),
      fundCode: fund.fundCode,
      assetClass,
      insurer: 'Great Eastern',
      latestDate: existing[existing.length - 1]?.date ?? null,
      latestNav: existing[existing.length - 1]?.nav ?? null,
      points: existing.length,
    });
    console.log(`  ✓ ${fund.fundName} — ${existing.length} price points`);
  }

  index.sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(path.join(OUT_DIR, 'index.json'), JSON.stringify({ updatedAt: new Date().toISOString(), funds: index }));
  console.log(`Wrote index.json with ${index.length} funds.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
