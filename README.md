# A.L.F.R.E.D.

**A**ssets, **L**iabilities, **F**inancial **R**eview & **E**valuation **D**irectory

An offline-first practice dashboard for Great Eastern Financial Adviser Representatives, built as an installable Progressive Web App (PWA) for iPad. All client data is stored locally on your device — nothing is ever sent to a server.

Live app: **https://alfred-ge.vercel.app**

---

## Installing on your iPad

1. Open **Safari** on the iPad (this only works in Safari, not Chrome or other browsers).
2. Go to **https://alfred-ge.vercel.app**
3. Tap the **Share** icon → **Add to Home Screen** → **Add**.
4. Open A.L.F.R.E.D. from the home screen icon from now on — it launches full-screen like a native app.

Once opened this way at least once, the app keeps working with **no internet connection** — everything is cached on your device.

On first launch you'll go through a short setup: your name, photo, credentials, and an app PIN / Face ID lock. Everything in setup is optional and editable later in Settings.

**Back up your data regularly**: Settings → Data Backup → Export All Data. Since everything lives only in the browser on your iPad, this JSON export is the only way to move data to another device or recover it if the app's local storage is ever cleared.

---

## What's in the app

| Area | What it does |
|---|---|
| **Home** | Your profile, a "Needs Attention" feed (overdue visits, upcoming birthdays, due tasks), commission pipeline snapshot, referral tracker |
| **Clients** | Client list with overdue-visit flags; each client has Basic Info, Meeting Log, Fact-Find, Portfolio, Household, and a Quarterly Report tab |
| **Client Mode** | A presentation-safe mode for meetings — hides every other client and all advisor-only pages, shows only the current client's Portfolio and the Whiteboard. Exiting requires your PIN/Face ID so you can't accidentally expose another client's data mid-meeting |
| **Meeting Log** | Type notes manually, or tap **Record Meeting** to capture audio with live transcription (consent screen required first — you must also verbally inform the client, per PDPA) |
| **Portfolio** | Coverage by category (Hospital, CI, Death, Accidental, LTC, Savings, Investment) per person in the household, colour-coded gap indicators. The Hospital Plan category is pre-loaded with real GE SupremeHealth premium/limit tables — pick Private (P PLUS/P PRIME) or Government/Restructured ward class (A PLUS/B PLUS/STANDARD) and it fills in the correct sum |
| **Fact-Find** | Income, dependants, liabilities, risk profile, and Retirement Goals (target monthly income from age X to age Y, with an inflation-adjustment toggle, auto-computing the required lump sum) |
| **Household** | Group related clients (e.g. spouses) to see combined family coverage |
| **Tasks** | To-dos aggregated across all clients, auto-created from a meeting's "Next Step" |
| **Calculators** | Compound interest, TVM, ROI, Singapore income tax, CPF, salary, retirement, goal-based savings, and a premium-financing calculator (back-solves the investment principal needed to fund ongoing premiums from dividend yield) |
| **Whiteboard** | Full-screen drawing canvas (Apple Pencil pressure-sensitive), plus a PDF annotation mode for marking up brochures live with clients |
| **News** | Manual "Refresh Today's Briefing" — paste in headlines you've gathered elsewhere (there's no live news feed built in, by design, since this app has no backend) |
| **Fund Tools** | Import fund factsheet PDFs (auto-extracts NAV/returns where possible, always human-reviewed before saving), and a 2–4 fund allocation growth simulator with live sliders |
| **Instagram Drafts** | Template-based caption + hashtag generator for insurance/investment content — draft only, never posts on your behalf |
| **Objections** | Searchable, editable crib sheet of common client objections and suggested responses (advisor-only, not client-facing) |
| **Quarterly Report** | Per-client (or household) portfolio summary + coverage gap status, exportable as a PDF via your browser's print dialog |
| **Settings** | Profile, app lock, appearance (light/dark/system), visit-cadence default, data export/import |

---

## Data & privacy

- **No backend.** This is a static app with no server component. Every client record (portfolios, meeting notes, fact-finds, tasks, recordings) lives only in the browser's IndexedDB on the device it was entered on.
- **Nothing syncs between devices automatically.** Use Settings → Export/Import to move data between an iPad and a backup, or between team members' devices.
- Voice recordings are transcribed locally (browser Speech Recognition) and the raw audio is **deleted by default** after transcription unless you explicitly opt to keep it.
- The optional "AI Meeting Summary" and News fields in Settings are for pointing at your own external service if you set one up — nothing is sent anywhere unless you configure an endpoint yourself.

⚠️ **CPF rates note**: the CPF contribution rates and Ordinary Wage ceiling used in the calculators are indicative (based on the published multi-year schedule) and should be verified against the current CPF Board table before relying on them with a client.

---

## For developers

**Stack**: React 19 + TypeScript + Vite + Tailwind CSS v4 + React Router + `idb` (IndexedDB) + Recharts + pdf.js + `vite-plugin-pwa`.

```bash
npm install
npm run dev      # local dev server at localhost:5173
npm run build    # production build (includes service worker) to dist/
npm run preview  # serve the production build locally
```

### Deploying

The app is deployed to Vercel under the project name `alfred`. To push a new version live:

```bash
npx vercel --prod --yes
```

This redeploys to the same stable URL. The build includes a service worker that precaches the entire app shell, so once a user's installed PWA reloads after a deploy, it keeps working fully offline.

### Project structure

- `src/pages/` — top-level routes; `src/pages/clients/` — per-client tabs (Basic Info, Meeting Log, Fact-Find, Portfolio, Household, Report)
- `src/components/` — shared UI (`ui/`), layout/nav (`layout/`), and feature-specific components (`lock/`, `onboarding/`, `meeting/`, `whiteboard/`, `portfolio/`)
- `src/db/` — one module per IndexedDB object store (clients, meetings, portfolios, tasks, settings, etc.)
- `src/lib/` — pure calculation/utility functions (finance formulas, CPF, SG tax, coverage gap logic, speech recognition wrapper)
- `src/data/` — GE hospital plan premium tables (parsed from CSV at build time)
- `src/state/` — React contexts (auth/lock, app mode, theme)
