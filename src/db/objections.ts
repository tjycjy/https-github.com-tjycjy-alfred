import { getDb } from './db';
import { newId, nowIso } from '../lib/id';
import type { ObjectionEntry } from '../types';

const DEFAULT_OBJECTIONS: Array<Pick<ObjectionEntry, 'objection' | 'response' | 'category'>> = [
  {
    category: 'Cost',
    objection: "It's too expensive.",
    response:
      "I hear you — let's look at it as a monthly amount rather than a lump sum. Often it works out to less than a few coffees a week. We can also adjust the sum assured or payment term to fit your budget without leaving the gap uncovered.",
  },
  {
    category: 'Cost',
    objection: 'I already have insurance through my employer.',
    response:
      "That's a great start, but employer coverage usually ends the moment you leave the company, and the sum assured is often only 1-2x your annual salary — well below what's needed. Let's check what portable coverage you'd still need on your own.",
  },
  {
    category: 'Timing',
    objection: "I'll think about it / let me get back to you.",
    response:
      "Totally understandable — this is a big decision. Can I check what specifically you'd like to think through? Often it's one or two concerns, and I'd rather address them now while it's fresh than have you lose momentum.",
  },
  {
    category: 'Timing',
    objection: "I'm too young to need this.",
    response:
      "Premiums are actually at their lowest right now precisely because you're young and healthy — locking in coverage now protects your insurability if health changes later, and costs far less than waiting even 5-10 years.",
  },
  {
    category: 'Trust',
    objection: 'My friend/relative also sells insurance.',
    response:
      "No problem at all — I'd actually encourage you to compare. I'm happy to have them review this proposal alongside me. What matters most is that you end up properly covered, whoever you go with.",
  },
  {
    category: 'Trust',
    objection: "I don't trust insurance companies — they never pay out.",
    response:
      "That's a common misconception. In Singapore, over 95% of claims are paid out (per LIA industry statistics) — most rejections happen due to non-disclosure at application, which is why I always go through your health declaration carefully with you upfront.",
  },
  {
    category: 'Investment comparison',
    objection: 'Investment returns are too low compared to stocks/crypto.',
    response:
      "Insurance-linked savings aren't meant to compete with equities — they're the guaranteed, protected portion of your plan. I'd actually suggest keeping your growth investments separate and using this to lock in guaranteed protection and capital.",
  },
  {
    category: 'Retirement',
    objection: 'CPF is enough for my retirement.',
    response:
      "CPF is a strong base, but the CPF LIFE payout replacement ratio is typically only 30-40% of your last-drawn income. Let's run the numbers on your specific CPF projection so we can see the actual gap.",
  },
  {
    category: 'Health',
    objection: "I'm healthy, I don't need critical illness coverage.",
    response:
      "That's exactly when it's cheapest to get covered. 1 in 4 Singaporeans is projected to develop cancer in their lifetime (Singapore Cancer Society), and CI coverage isn't just for illness — it replaces income during treatment when you can't work.",
  },
  {
    category: 'Family',
    objection: 'My spouse/family will take care of me if something happens.',
    response:
      "I'm glad you have that support — but let's make sure caring for you doesn't become a financial burden on them. A payout means they can focus on you, not on how to cover medical bills or lost income.",
  },
  {
    category: 'Existing coverage',
    objection: 'I already have enough insurance.',
    response:
      "Great — let's do a quick coverage gap review together so we both have the full picture. Sometimes what looked sufficient 5-10 years ago hasn't kept up with rising healthcare costs or a change in your income and dependants.",
  },
  {
    category: 'Complexity',
    objection: "This is too complicated, I don't understand it.",
    response:
      "Fair — let me simplify. Forget the jargon: this plan does three things — [X, Y, Z]. I'll walk through exactly what happens in a claim scenario so it's concrete, not abstract.",
  },
  {
    category: 'Process',
    objection: 'I need to check with my spouse/family first.',
    response:
      "Of course, this should be a joint decision. Would it help if I prepared a one-page summary you can share with them, or would you like to loop them in for a quick call so I can answer their questions directly?",
  },
  {
    category: 'Cost',
    objection: 'Can I get a discount?',
    response:
      "Premiums are set by the insurer based on age, health, and coverage — I don't have room to discount them. What I can do is help structure the plan (payment term, riders, sum assured) to get you the most value within your budget.",
  },
];

export async function listObjections(): Promise<ObjectionEntry[]> {
  const db = await getDb();
  const all = await db.getAll('objections');
  if (all.length === 0) {
    const seeded = await seedDefaults();
    return seeded;
  }
  return all.sort((a, b) => a.category.localeCompare(b.category) || a.objection.localeCompare(b.objection));
}

async function seedDefaults(): Promise<ObjectionEntry[]> {
  const db = await getDb();
  const now = nowIso();
  const entries: ObjectionEntry[] = DEFAULT_OBJECTIONS.map((o) => ({
    id: newId(),
    ...o,
    createdAt: now,
    updatedAt: now,
  }));
  const tx = db.transaction('objections', 'readwrite');
  for (const entry of entries) await tx.store.put(entry);
  await tx.done;
  return entries;
}

export async function addObjection(input: Pick<ObjectionEntry, 'objection' | 'response' | 'category'>): Promise<ObjectionEntry> {
  const db = await getDb();
  const entry: ObjectionEntry = { id: newId(), ...input, createdAt: nowIso(), updatedAt: nowIso() };
  await db.put('objections', entry);
  return entry;
}

export async function updateObjection(entry: ObjectionEntry): Promise<void> {
  const db = await getDb();
  await db.put('objections', { ...entry, updatedAt: nowIso() });
}

export async function deleteObjection(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('objections', id);
}
