# Dubai Property Decision Engine

Live site: https://dubai-property-decision-engine.vercel.app

A decision tool for the Dubai residential market, built on official Dubai Land Department open data (registered sales, mortgages and Ejari rent contracts). It refreshes itself every morning and answers practical questions that buyers, tenants, brokers and lenders actually have:

| Question | Page | How it is answered |
|---|---|---|
| Is this asking price fair? | Fair price | The asking AED/sqft is placed inside the p10 to p90 range of comparable registered sales. The engine uses the most specific group with enough evidence: same project, then same community + type + bedrooms, then community + type, then community. |
| Can my landlord raise the rent, and by how much? | Rent check | Current rent is compared with the median of comparable Ejari contracts, then the Decree 43/2013 slabs are applied: 0% if the rent is up to 10% below market, 5% (11 to 20% below), 10% (21 to 30%), 15% (31 to 40%), 20% (more than 40%). |
| Which communities are heating up or cooling down? | Communities | Median AED/sqft over the last 12 weeks against the previous 12, with sample sizes, off-plan share, rent medians and a gross-yield estimate. |
| Which registered sales look mispriced? | Anomalies | Eligible sales more than 35% away from the median of their comparable group. |
| What happened this week? | Market pulse | KPIs, weekly series and a short market note. The note is written by a language model that is only allowed to use numbers computed by the pipeline. |

The project is written as a data analyst would ship it in a company: a tested Python pipeline, SQL models with explicit grain and filters, a data-quality gate on every run, published methodology, and a small static front end. Nothing here requires paid services.

## How it works

1. `pipeline/extract.py` pulls transactions and rent contracts from the DLD gateway in weekly windows and stores them as monthly parquet partitions (`data/raw/`). Re-pulls are merged with full-record de-duplication because identifiers in the public feed are anonymised.
2. `pipeline/clean.py` standardises types and units, normalises bedrooms, builds size bands, flags bulk deals, implausible records and statistical outliers, and marks which rows may be used for benchmarks.
3. `pipeline/crosswalk.py` reconciles community names between the two feeds. Sales use popular names ("Jumeirah Village Circle"), Ejari uses district names ("Al Barsha South Fourth"). The mapping is derived from projects that appear in both feeds, on top of a verified seed list, and is published for audit. This raised the share of sales with a rent benchmark from 43% to 76%.
4. `pipeline/sql/marts.sql` (DuckDB) builds the analytical tables: weekly series, community summary, price bands, rent benchmarks, anomalies, top projects.
5. `pipeline/quality.py` runs 13 checks (freshness, duplicates, completeness, eligibility rates, outlier rate, coverage, volume sanity) and writes `docs/data_quality.md`.
6. `pipeline/market_note.py` writes the weekly note. A router (`pipeline/llm_router.py`) discovers which free-tier models are currently available (Groq, Gemini, Cerebras, OpenRouter), tries them in order and falls back to a rules-based writer, so the product works with or without API keys.
7. `pipeline/export_web.py` writes compact JSON files to `web/public/data/`. The Next.js site is fully static and the calculators run in the browser on those files. The same files double as an open JSON API (for example `/data/price_bands.json`).

GitHub Actions runs the pipeline daily at 06:00 Gulf time and commits the refreshed data; Vercel redeploys the site on every commit.

## Repository layout

```
pipeline/   Python 3.12: config, dld_client, extract, clean, crosswalk, sql/marts.sql, build_marts,
            quality, llm_router, market_note, export_web, run
web/        Next.js 15 + TypeScript + Recharts (app/ pages, components/, lib/engine.ts decision rules,
            public/data/*.json artefacts)
data/       raw partitions, clean tables, marts (committed, refreshed daily)
docs/       methodology, data dictionary, data-quality report
tests/      pytest unit tests for the deterministic parts (no network)
.github/    daily_refresh.yml (cron + manual backfill), ci.yml (tests + web build)
```

## Run it locally

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r pipeline/requirements.txt
python pipeline/run.py --mode smoke   # last 14 days, about 5 minutes
cd web && npm install && npm run dev  # http://localhost:3000
```

Pipeline modes: `smoke` (last 14 days), `daily` (re-pull the last 10 days), `backfill` (everything since 2026-01-01, roughly two hours), `rebuild` (no download, recompute from the stored partitions).

Optional environment variables for the market note: `GROQ_API_KEY`, `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY` (free tiers). Copy `.env.example` to `.env` for local use; in GitHub they are repository secrets.

## Deploying your own copy

1. Push the repository to GitHub. The "Daily data refresh" workflow runs on schedule; run it once manually with `mode = backfill` to load history.
2. Import the repository in Vercel with Root Directory set to `web` and Framework Preset set to Next.js.
3. Optionally add `GROQ_API_KEY` as a repository secret so the note is written by a model instead of the rules fallback.

## Method and caveats

Full details are in `docs/methodology.md` and `docs/data_dictionary.md`. The main caveats: the data is registered transactions, not listings; off-plan sales include pre-registrations at launch prices; the public Ejari feed has no bedroom counts, so rent benchmarks use size bands; medians depend on the mix of what sold, so always read them together with the sample size shown. The analytics are indicative and are not a valuation or legal advice. For rent increases the official RERA calculator is the binding reference.

## Data notes worth knowing

* The public gateway publishes transactions from January 2026 onward. Older history would need the Dubai Pulse bulk files.
* Rent contracts are anonymised: no contract or property identifiers, and `ROOMS` is about 96% null.
* Every declared `P_*` parameter must be present in the request body, otherwise the gateway returns an HTML 500 page.

## Roadmap

* v0.2: a question-answering endpoint over the marts using the same free-model router; per-community pages with shareable links.
* v0.3: Power BI model on the parquet marts; pre-2026 history from Dubai Pulse; developer and project launch tracker.

## Licence

Code: MIT. Data: Dubai Land Department open data, subject to the Dubai Data terms of use.
