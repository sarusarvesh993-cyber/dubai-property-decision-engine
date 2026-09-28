# Dubai Property Decision Engine

Live site: https://dubai-property-decision-engine.vercel.app

A decision tool for the Dubai residential market, built on official Dubai Land Department open data (registered sales, mortgages and Ejari rent contracts). It refreshes itself every morning and answers practical questions that buyers, tenants, brokers and lenders actually have:

| Question | Page | How it is answered |
|---|---|---|
| Is this asking price fair? | Fair price | The asking AED/sqft is placed inside the p10 to p90 range of comparable registered sales. The engine uses the most specific group with enough evidence: same project, then same community + type + bedrooms, then community + type, then community. Its out-of-sample error is back-tested on every refresh and published. A one-page negotiation brief can be copied from the result. |
| Can my landlord raise the rent, and by how much? | Rent check | Current rent is compared with the median of comparable Ejari contracts, then the Decree 43/2013 slabs are applied: 0% if the rent is up to 10% below market, 5% (11 to 20% below), 10% (21 to 30%), 15% (31 to 40%), 20% (more than 40%). |
| Which communities are heating up or cooling down? | Communities | Median AED/sqft over the last 12 weeks against the previous 12, with sample sizes, off-plan share, rent medians and a gross-yield estimate. |
| Which registered sales look mispriced? | Anomalies | Eligible sales more than 35% away from the median of their comparable group. |
| What happened this week? | Market pulse | KPIs, weekly series and a short market note. The note is written by a language model that is only allowed to use numbers computed by the pipeline. |
| Any of the above, in plain language | Ask the data | A search box on the home page and the Ask page. The question is parsed for community, property type, bedrooms, size and amounts, the matching benchmarks are retrieved, and the answer is written from those facts only, with the facts shown under the answer. |

The project is written as a data analyst would ship it in a company: a tested Python pipeline, SQL models with explicit grain and filters, a data-quality gate on every run, published methodology, and a small static front end. Nothing here requires paid services.

## How it works

1. `pipeline/extract.py` pulls transactions and rent contracts from the DLD gateway in weekly windows and stores them as monthly parquet partitions (`data/raw/`). Re-pulls are merged with full-record de-duplication because identifiers in the public feed are anonymised.
2. `pipeline/clean.py` standardises types and units, normalises bedrooms, builds size bands, flags bulk deals, implausible records and statistical outliers, and marks which rows may be used for benchmarks.
3. `pipeline/crosswalk.py` reconciles community names between the two feeds. Sales use popular names ("Jumeirah Village Circle"), Ejari uses district names ("Al Barsha South Fourth"). The mapping is derived from projects that appear in both feeds, on top of a verified seed list, and is published for audit. This raised the share of sales with a rent benchmark from 43% to 76%.
4. `pipeline/sql/marts.sql` (DuckDB) builds the analytical tables: weekly series, community summary, price bands, rent benchmarks, anomalies, top projects.
5. `pipeline/backtest.py` re-prices the last four weeks of registered sales using only earlier data and publishes coverage, median error, band calibration and a naive-baseline comparison (`backtest.json`).
6. `pipeline/quality.py` runs 14 checks (freshness, duplicates outside multi-unit deals, completeness, eligibility rates, outlier rate, no land plots in the pricing universe, coverage, volume sanity) and writes `docs/data_quality.md`.
7. `pipeline/market_note.py` writes the weekly note. A router (`pipeline/llm_router.py`) discovers which free-tier models are currently available (Groq, Gemini, Cerebras, OpenRouter), tries them in order and falls back to a rules-based writer, so the product works with or without API keys.
8. `pipeline/export_web.py` writes compact JSON files to `web/public/data/`. The Next.js site is static and the calculators run in the browser on those files. The same files double as an open JSON API (for example `/data/price_bands.json`).
9. `web/app/api/ask/route.ts` is the only server function. It powers the "Ask the data" box: `web/lib/ask.ts` parses the question (community aliases such as JVC, JLT or Downtown are understood), retrieves the relevant cells from the published JSON, and writes a rules-based answer; `web/lib/llm.ts` is a TypeScript port of the same free-model router and, when a key is configured, rewrites that answer in better prose without adding numbers. Every response carries the facts it was built from, so a reader can check it.

GitHub Actions runs the pipeline daily at 06:00 Gulf time and commits the refreshed data; Vercel redeploys the site on every commit.

## Repository layout

```
pipeline/   Python 3.12: config, dld_client, extract, clean, crosswalk, sql/marts.sql, build_marts,
            backtest, quality, llm_router, market_note, export_web, run
web/        Next.js 15 + TypeScript + Recharts (app/ pages, components/, lib/engine.ts decision rules,
            lib/ask.ts question parsing and retrieval, lib/llm.ts free-model router, lib/guard.ts number
            guard, app/api/ask route, eval/ask_eval.json + scripts/eval_ask.ts, public/data/*.json artefacts)
data/       raw partitions, clean tables, marts (committed, refreshed daily)
docs/       methodology, data dictionary, data-quality report, case study, interview notes
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

Quality gates that run in CI on every push: `pytest -q tests` (pipeline rules and the back-test on synthetic data), `npm run eval:ask` (27-question evaluation set for the Ask box, 80% pass rate required, currently 100%), `npm run typecheck` and `npm run build`. The daily refresh additionally runs the 14 data-quality checks and the fair-price back-test on the real data.

Pipeline modes: `smoke` (last 14 days), `daily` (re-pull the last 10 days), `backfill` (everything since 2026-01-01, roughly two hours), `rebuild` (no download, recompute from the stored partitions).

Optional environment variables for the market note and the Ask box: `GROQ_API_KEY`, `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY` (free tiers). Copy `.env.example` to `.env` for local use. In GitHub they are repository secrets (used by the daily pipeline); in Vercel they are project environment variables (used by `/api/ask`). Without any key both features still work, using the rules-based writer, and the site labels the answer source accordingly.

## Deploying your own copy

1. Push the repository to GitHub. The "Daily data refresh" workflow runs on schedule; run it once manually with `mode = backfill` to load history.
2. Import the repository in Vercel with Root Directory set to `web` and Framework Preset set to Next.js.
3. Optionally add `GROQ_API_KEY` (or any of the other free-tier keys) in two places: as a GitHub repository secret, so the weekly note is written by a model, and as a Vercel environment variable (Project, Settings, Environment Variables, then redeploy), so the Ask box answers are written by a model. Without keys both fall back to the rules-based writer.

## Method and caveats

Full details are in `docs/methodology.md` and `docs/data_dictionary.md`. The main caveats: the data is registered transactions, not listings; residential medians cover flats and villas only (land plots share the "Residential" label in the feed but are excluded from every price benchmark); off-plan sales include pre-registrations at launch prices; the public Ejari feed has no bedroom counts, so rent benchmarks use size bands; medians depend on the mix of what sold, so always read them together with the sample size shown. The analytics are indicative and are not a valuation or legal advice. For rent increases the official RERA calculator is the binding reference.

## Data notes worth knowing

* The public gateway publishes transactions from January 2026 onward. Older history would need the Dubai Pulse bulk files.
* Rent contracts are anonymised: no contract or property identifiers, and `ROOMS` is about 96% null.
* Every declared `P_*` parameter must be present in the request body, otherwise the gateway returns an HTML 500 page.

## Roadmap

* Done in v0.2: Ask the data (question box with retrieval, rules answer, model rewrite and number guard), fair-price back-test, copilot evaluation set, negotiation brief.
* Next: per-community pages with shareable links; Power BI model on the parquet marts; pre-2026 history from Dubai Pulse; developer and project launch tracker; map view once community coordinates are sourced.

## Licence

Code: MIT. Data: Dubai Land Department open data, subject to the Dubai Data terms of use.
