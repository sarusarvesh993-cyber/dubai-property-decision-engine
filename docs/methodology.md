# Methodology

## 1. Sources

| Feed | Endpoint | Grain | Key fields |
|---|---|---|---|
| Transactions | `POST https://gateway.dubailand.gov.ae/open-data/transactions` | one row per registered procedure (sale, mortgage, gift ...) | INSTANCE_DATE, GROUP_EN, PROCEDURE_EN, AREA_EN, PROJECT_EN, PROP_SB_TYPE_EN, ROOMS_EN, ACTUAL_AREA (sqm), TRANS_VALUE, IS_OFFPLAN_EN |
| Rent contracts | `POST https://gateway.dubailand.gov.ae/open-data/rents` | one row per Ejari contract line | REGISTRATION_DATE, START/END_DATE, VERSION_EN (New/Renewed), AREA_EN, PROJECT_EN, PROP_SUB_TYPE_EN, ACTUAL_AREA, ANNUAL_AMOUNT, TOTAL_PROPERTIES |

Gateway facts verified on 2026-09-28: keyless; every declared `P_*` parameter must be present (empty string when unused); dates `MM/DD/YYYY`; pages of up to 5,000 rows; history published from January 2026.

## 2. Extraction

* Weekly windows, paged with `P_TAKE/P_SKIP`, 3 retries with back-off.
* Monthly partitions `data/raw/<feed>/YYYY-MM.parquet` (zstd). Re-pulls are merged with **full-record de-duplication** because identifiers are anonymised (`CONTRACT_NUMBER` null, `PROPERTY_ID` 0). Multi-row records survive when they differ (e.g. Lease-to-Own carries two values) and multi-unit leases carry `TOTAL_PROPERTIES > 1`.
* Daily mode re-pulls the last 10 days (late registrations); backfill covers 2026-01-01 -> today.

## 3. Cleaning rules

| Rule | Detail |
|---|---|
| Sale flag | procedure is one of Sale, Sell - Pre registration, Delayed Sell, Sale On Payment Plan. Mortgages, grants, development registrations and lease-to-own are **not** sales. |
| Size | `ACTUAL_AREA` (sqm), fallback `PROCEDURE_AREA`; sqft = sqm x 10.7639. |
| Rooms | normalised to Studio / 1-4 B/R / 5+ B/R / NA. |
| Size bands (sqm) | under 40, 40 to 60, 60 to 85, 85 to 120, 120 to 170, 170 to 250, 250 to 400, 400 and above. Used for rents because `ROOMS` is about 96% null in the Ejari feed. |
| Residential unit | `is_res_unit`: sub-type Flat or Villa and property type Unit or Building. Land plots carry the "Residential" usage label in the feed but their AED/sqft is not comparable with built units, so `is_land` rows are excluded from the pricing universe and from every residential median, yield and anomaly. |
| Plausibility | sales: built property (not land), 50k to 500m AED and 15 to 20,000 sqm; rents: residential, 8k to 5m AED a year, 15 to 5,000 sqm, 6 to 36-month term. |
| Bulk | transactions sharing a transaction number; leases with `TOTAL_PROPERTIES > 1`. |
| Outliers | modified z-score of log(price or rent per sqm) within community x sub-type (x off-plan for sales); absolute z above 3.5 flagged. |
| Benchmark-eligible | plausible, not an outlier and not bulk. |

## 4. Community name resolution (crosswalk)

The sales feed mostly uses popular community names, the Ejari feed uses official district names. `pipeline/crosswalk.py`:

1. normalises project names and finds projects present in both feeds;
2. for each district name, takes the dominant community name among shared projects (weighted by contracts) if >= 3 distinct projects agree and it holds >= 70 % of the district's linked contracts;
3. never remaps a name that the transactions feed itself uses for >= 30 sales (already canonical);
4. overlays a verified seed list (e.g. Marsa Dubai -> Dubai Marina, Al Thanyah Fifth -> Jumeirah Lakes Towers).

Output: `data/marts/community_crosswalk.csv` / `web/public/data/crosswalk.json`, shown on the Methodology page. Original names are kept in the `district` column.

## 5. Marts (DuckDB, `pipeline/sql/marts.sql`)

| Mart | Grain | Purpose |
|---|---|---|
| `mart_weekly_sales`, `mart_weekly_rents` | week | market pulse series |
| `mart_area_month` | community x month x off-plan | trend charts |
| `mart_area_summary` | community | last 12 weeks vs previous 12: volume, medians, change, rents, gross-yield estimate |
| `mart_price_bands` | L0 projectxtypexroomsxstatus | L1 communityxtypexroomsxstatus | L2 communityxtypexstatus | L3 communityxstatus | fair-price engine (p10/p25/p50/p75/p90 AED/sqft, last 6 months) |
| `mart_rent_benchmarks` | R1 communityxtypexsize bandxcontract type | R2 communityxtypexsize band | R3 communityxtype | rent check (p25/p50/p75 annual rent, last 12 months) |
| `mart_anomalies` | transaction | sales > 35 % away from the finest comparable cell median, last 60 days |
| `mart_top_projects` | project | launch/secondary activity ranking |

Cells with fewer than `MIN_CELL_N = 8` records are never published.

## 6. Decision rules

* **Fair price verdict** by percentile of asking AED/sqft within the chosen cell: below 15 well below, 15 to 35 below, 35 to 65 in line, 65 to 85 above, over 85 well above. Confidence: high (project or bedroom-level cell with at least 20 sales), medium, low (community-level cell or fewer than 12 sales).
* **Rent increase** (Decree 43/2013): gap = 1 minus current rent divided by market median. 0% if the gap is up to 10%; 5% if 11 to 20%; 10% if 21 to 30%; 15% if 31 to 40%; 20% if over 40%. The official RERA index is authoritative; this tool is for preparation.
* **Heat signal**: 12-week change in median AED/sqft: cooling below -5%, softening -5% to -1.5%, stable within 1.5%, warming +1.5% to +5%, heating above +5% (needs at least 8 eligible sales in both windows).
* **Gross yield estimate** = median rent per sqft divided by median price per sqft in the same community and window (not net of service charges or vacancy).

### 6.1 Back-test of the fair-price engine (`pipeline/backtest.py`)

The engine is checked out of sample on every refresh, and the result is published on the methodology page and in `web/public/data/backtest.json`.

* Test set: benchmark-eligible residential sales registered in the most recent 28 days (7 days while fewer than 120 days of history are loaded).
* Training set: eligible sales registered before the test window, in the same trailing 6-month window and with the same minimum cell size (8) the site uses.
* Prediction: the median AED/sqft of the finest comparable cell that exists in the training set, with the site's fallback order (project, then community x type x bedrooms, then community x type, then community), always inside the same off-plan or ready group.
* Baseline: one citywide median AED/sqft per off-plan or ready group.
* Metrics: coverage, median and mean absolute percentage error, share of sales inside the published p25 to p75 and p10 to p90 bands (a calibrated band holds about 50% and 80%), median bias, and the same errors for the baseline. All metrics are also split by matching level and by off-plan or ready.

Reading the result: the median error is the typical gap between the engine's estimate and the price that was actually registered. A verdict is only as good as the cell behind it, which is why the sample size and level are always shown next to it. Outlier flags come from the full data set, so the test set excludes extreme registrations.

## 7. AI layer

`pipeline/llm_router.py` discovers currently available free models (OpenRouter's public catalogue plus keyed providers Groq / Gemini / Cerebras), scores them, and tries candidates in order with cool-downs for rate limits and 24-hour blacklists for retired models. `market_note.py` passes only pipeline-computed facts and instructs the model never to invent figures; if no model responds, a deterministic rules-based note is written. Keys are supplied as environment variables / repository secrets only.

### 7.1 Ask the data (search and questions)

The site's question box (`web/app/api/ask/route.ts`) follows the same principle: retrieval first, language model second, and never a number that was not computed by the pipeline.

1. `parseQuestion` (`web/lib/ask.ts`) extracts communities (exact names plus an alias table: JVC, JLT, JVT, Downtown, Marina, JBR, Creek Harbour, Dubai Hills, and the Ejari district names from the crosswalk), property type (flat, villa, office, hotel apartment), bedrooms, size in sqft or sqm, off-plan or ready, and money amounts (a price such as "1.5m" or a rent such as "90,000"). It also assigns intents: price, rent, yield, trend, rank, anomaly, compare, profile or overview.
2. `retrieve` collects only the cells that matter: the community summary rows, the matching price bands and rent benchmarks, and, when a price or rent and a size were given, the same fair-price or rent-check verdict the calculators produce (`web/lib/engine.ts`). Rankings use the community summary with stricter sample sizes than the community table: heating and cooling lists need 30 or more eligible sales in both 12-week windows, yield lists need 30 or more sales and 30 or more rent contracts and a gross yield between 2% and 12% (outside that range the figure is almost always a mix effect), and price lists need 30 or more sales. Unknown communities return "did you mean" suggestions, except for market-wide questions.
3. `composeAnswer` writes a deterministic answer from those facts with the sample sizes and fallback level stated.
4. If a free-tier key is configured, `web/lib/llm.ts` (a TypeScript port of `pipeline/llm_router.py`, with the same discovery, ordering, cool-downs and blacklists) asks the model to rewrite the rules answer in plain prose, under the instruction that every number must already appear in the facts block. If the model is unavailable, or its reply contains a number that is not in the facts, the rules answer is returned. The response states which path produced it, and the facts are shown under the answer.

Questions are not stored. Requests are limited to 30 per 10 minutes per client on each serverless instance.

### 7.2 Copilot evaluation set (`web/eval/ask_eval.json`)

Twenty-seven questions with the expected parse (community, type, bedrooms, size, amounts, intent), the expected retrieval (fair-price or rent-check verdict present) and, where the wording does not depend on the data, required phrases in the answer. `npm run eval:ask` runs them in CI without any model call, prints one line per case and fails below an 80% pass rate. The set is meant to grow: every misread question found in the logs or in user feedback becomes a new case.

## 8. Known limitations

* Registered data is not the same as asking prices; there is a timing lag between agreement and registration.
* Off-plan "sales" include pre-registrations at launch; communities dominated by launches reflect developer pricing.
* No bedrooms or unit identifiers in the Ejari feed; benchmarks by size band; repeat-sales indices are not possible from the public feed.
* History from January 2026 only (earlier data requires Dubai Pulse bulk files).
