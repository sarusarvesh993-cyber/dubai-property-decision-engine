# Dubai Property Decision Engine

**Daily-refreshed decision analytics on official Dubai Land Department open data** — fair-price checks, Ejari rent benchmarks with the Decree 43/2013 renewal-increase slabs, a community heat map, and a price-anomaly monitor. Built as a production-style data-analyst project: Python pipeline → DuckDB SQL marts → static Next.js site on Vercel, refreshed every morning by GitHub Actions, with an AI market note written by a self-adapting free-model router.

> Live site: _add your Vercel URL here_ · Data: DLD open-data gateway (registered transactions + Ejari contracts) · History from January 2026

## What it answers

| Question | Page | Rule |
|---|---|---|
| Is this asking price fair? | **Fair price** | Asking AED/sqft placed within the p10–p90 band of comparable registered sales (most specific of project → community+type+beds → community+type → community). |
| Can my landlord raise my rent? By how much? | **Rent check** | Rent vs median of comparable Ejari contracts, then Decree 43/2013 slabs: 0 % (≤10 % below market) / 5 % / 10 % / 15 % / 20 % (>40 % below). |
| Which communities are heating or cooling? | **Communities** | Median AED/sqft, last 12 weeks vs previous 12, with sample sizes, off-plan share, rent medians and gross-yield estimates. |
| Which registered sales look mispriced? | **Anomalies** | Eligible sales deviating >35 % from the median of their comparable cell. |
| What happened this week? | **Market pulse** | KPIs, weekly series and an LLM-written note that may only use pipeline-computed numbers. |

## Architecture

```
DLD gateway (POST JSON, keyless)            GitHub Actions (cron 06:00 GST)
  transactions ─┐                             ┌──────────────────────────────┐
  rents ────────┼─> pipeline/extract.py ──>   │ data/raw/<feed>/YYYY-MM.parquet │
                │   pipeline/clean.py   ──>   │ data/clean/*.parquet (+crosswalk)│
                │   pipeline/sql/marts.sql    │ data/marts/*.parquet (DuckDB)   │
                │   pipeline/quality.py ──>   │ docs/data_quality.md            │
                │   pipeline/market_note.py   │ (free-model router or rules)    │
                └── pipeline/export_web.py ─> │ web/public/data/*.json  ────────┼─> commit → Vercel rebuild
                                              └──────────────────────────────┘
web/  Next.js 15 + TypeScript + Recharts, fully static; calculators run in the browser on the JSON artefacts.
```

Key design points

* **Idempotent extraction** — weekly windows, 5,000-row pages, monthly partitions merged with full-record de-duplication (identifiers in the public feed are anonymised). Daily mode re-pulls a 10-day window to capture late registrations.
* **Community name resolution** — the sales feed uses popular names ("Jumeirah Village Circle"), Ejari uses district names ("Al Barsha South Fourth"). `pipeline/crosswalk.py` derives the mapping from projects present in both feeds (plus a verified seed list) and publishes it, lifting rent coverage of sales from ~43 % to ~76 %.
* **Explainable benchmarks** — every published cell carries `n`, window dates and its specificity level; cells below `MIN_CELL_N = 8` are never shown.
* **LLM that cannot hallucinate numbers** — the note generator receives pre-computed facts only; the router discovers currently-free models at run time (Groq, Gemini, Cerebras, OpenRouter), ranks them, retries the next on failure, and falls back to a rules-based writer. No keys → still works.
* **Quality gate on every run** — 13 checks (freshness, duplicates, completeness, eligibility rates, outlier rate, coverage, volume sanity) written to `docs/data_quality.md` and the GitHub job summary.

## Repository layout

```
pipeline/        Python 3.12 pipeline (config, dld_client, extract, clean, crosswalk, sql/marts.sql, build_marts,
                 quality, llm_router, market_note, export_web, run)
web/             Next.js app (app/ pages, components/, lib/engine.ts decision rules, public/data/*.json artefacts)
data/            raw partitions, clean tables, marts (committed; refreshed daily by Actions)
docs/            methodology, data dictionary, data-quality report
tests/           pytest unit tests (deterministic parts, no network)
.github/         daily_refresh.yml (cron + manual backfill), ci.yml (tests + web build)
```

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r pipeline/requirements.txt
python pipeline/run.py --mode smoke                     # last 14 days (~5 min), then clean → marts → note → JSON
cd web && npm install && npm run dev                    # http://localhost:3000
```

Modes: `smoke` (14 days) · `daily` (re-pull last 10 days) · `backfill` (since 2026-01-01, ~1.5–2 h) · `rebuild` (no download).

Optional LLM keys (free tiers) as environment variables or GitHub/Vercel secrets: `GROQ_API_KEY`, `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY`. Copy `.env.example` to `.env` for local use.

## Deploy

1. Push to GitHub (the setup script does this). The **Daily data refresh** workflow runs at 06:00 GST and commits new data.
2. Import the repo in Vercel with **Root Directory = `web`** (framework auto-detected: Next.js). Every data commit triggers a rebuild, so the site is always current.
3. Run the workflow manually once with `mode = backfill` to load history from January 2026.

## Method & caveats

See `docs/methodology.md` and `docs/data_dictionary.md`. Headline caveats: registered data only (not listings); off-plan sales include launch-price pre-registrations; Ejari feed has no bedrooms (size bands are used); medians are mix-dependent — always read them with the sample size shown. Indicative analytics, not a valuation or legal advice; the official RERA calculator is authoritative for rent increases.

## Roadmap

* v0.2 — AI copilot (`/api/ask`) answering questions over the marts with the same free-model router; per-community pages with shareable URLs.
* v0.3 — Power BI model on the parquet marts; Dubai Pulse bulk history pre-2026; developer/project launch tracker.

## Licence

Code: MIT. Data: Dubai Land Department open data, subject to the Dubai Data terms of use.
