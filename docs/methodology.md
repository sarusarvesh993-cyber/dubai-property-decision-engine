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
| Sale flag | `procedure ∈ {Sale, Sell - Pre registration, Delayed Sell, Sale On Payment Plan}` - mortgages, grants, development registrations and lease-to-own are **not** sales. |
| Size | `ACTUAL_AREA` (sqm), fallback `PROCEDURE_AREA`; sqft = sqm x 10.7639. |
| Rooms | normalised to Studio / 1-4 B/R / 5+ B/R / NA. |
| Size bands (sqm) | <40, 40-60, 60-85, 85-120, 120-170, 170-250, 250-400, 400+ - used for rents because `ROOMS` is ~96 % null in the Ejari feed. |
| Plausibility | sales: 50k <= price <= 500m AED and 15 <= sqm <= 20,000; rents: residential, 8k <= annual <= 5m AED, 15 <= sqm <= 5,000, 6-36-month term. |
| Bulk | transactions sharing a transaction number; leases with `TOTAL_PROPERTIES > 1`. |
| Outliers | modified z-score of log(price or rent per sqm) within community x sub-type (x off-plan for sales); \|z\| > 3.5 flagged. |
| Benchmark-eligible | plausible ∧ not outlier ∧ not bulk. |

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

* **Fair price verdict** by percentile of asking AED/sqft within the chosen cell: < 15 well below | 15-35 below | 35-65 in line | 65-85 above | > 85 well above. Confidence: high (project/bedroom-level cell with n >= 20), medium, low (community-level or n < 12).
* **Rent increase** (Decree 43/2013): gap = 1 - current rent / market median. 0 % if gap <= 10 %; 5 % if 11-20 %; 10 % if 21-30 %; 15 % if 31-40 %; 20 % if > 40 %. The official RERA index is authoritative; this tool is for preparation.
* **Heat signal**: 12-week change in median AED/sqft: cooling below -5 %, softening -5 % to -1.5 %, stable within 1.5 %, warming +1.5 % to +5 %, heating above +5 % (needs >= 8 eligible sales in both windows).
* **Gross yield estimate** = median rent per sqft ÷ median price per sqft in the same community and window (not net of service charges or vacancy).

## 7. AI layer

`pipeline/llm_router.py` discovers currently available free models (OpenRouter's public catalogue plus keyed providers Groq / Gemini / Cerebras), scores them, and tries candidates in order with cool-downs for rate limits and 24-hour blacklists for retired models. `market_note.py` passes only pipeline-computed facts and instructs the model never to invent figures; if no model responds, a deterministic rules-based note is written. Keys are supplied as environment variables / repository secrets only.

## 8. Known limitations

* Registered data ≠ asking prices; timing lag between agreement and registration.
* Off-plan "sales" include pre-registrations at launch; communities dominated by launches reflect developer pricing.
* No bedrooms or unit identifiers in the Ejari feed; benchmarks by size band; repeat-sales indices are not possible from the public feed.
* History from January 2026 only (earlier data requires Dubai Pulse bulk files).
