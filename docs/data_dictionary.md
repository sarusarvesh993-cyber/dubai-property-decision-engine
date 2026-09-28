# Data dictionary

## `data/clean/transactions.parquet`

| Column | Type | Description |
|---|---|---|
| transaction_id | string | DLD transaction number (may repeat for multi-row procedures) |
| date | timestamp | registration date (`INSTANCE_DATE`) |
| month / week | string | `YYYY-MM`, ISO week start (Monday) `YYYY-MM-DD` |
| group | string | Sales / Mortgage / Gifts |
| procedure | string | DLD procedure name |
| usage | string | Residential / Commercial / ... |
| area | string | resolved community name (after crosswalk) |
| district | string | original `AREA_EN` from the feed |
| project, master_project | string | project names as registered |
| prop_type / sub_type | string | Unit / Villa / Land ... and Flat / Villa / Office / Shop ... |
| rooms | string | Studio, 1 B/R ... 5+ B/R, NA |
| size_band | string | size band in sqm |
| is_offplan, is_freehold, is_sale, is_mortgage | int | flags |
| price_aed | float | `TRANS_VALUE` |
| size_sqm, size_sqft | float | `ACTUAL_AREA` (fallback `PROCEDURE_AREA`) |
| price_per_sqm, price_per_sqft | float | derived |
| parking, parcel_id, nearest_metro, nearest_mall, nearest_landmark | string | as registered |
| is_bulk | int | shares transaction number with other rows |
| is_land | int | property type is Land (plots); excluded from the pricing universe |
| is_res_unit | int | Flat or Villa that is a Unit or Building; the universe for residential medians, yields and anomalies |
| is_plausible | int | passes price/size plausibility bounds (built-property sales only) |
| is_outlier | int | robust z-score flag within community x sub-type x status |
| benchmark_eligible | int | plausible, not an outlier and not bulk |
| _pulled_at | timestamp | extraction time (UTC) |

## `data/clean/rents.parquet`

| Column | Type | Description |
|---|---|---|
| registration_date, start_date, end_date | timestamp | Ejari dates |
| month / week | string | derived from registration date |
| version, is_renewal | string, int | New / Renewed |
| usage, area, district, project, master_project, prop_type, sub_type | string | as above (area resolved via crosswalk) |
| rooms | float | mostly null in the public feed |
| size_band | string | size band in sqm |
| is_freehold | int | flag |
| n_properties | int | `TOTAL_PROPERTIES` - units covered by the contract |
| annual_rent_aed, contract_amount_aed | float | `ANNUAL_AMOUNT`, `CONTRACT_AMOUNT` |
| size_sqm, size_sqft, rent_per_sqm, rent_per_sqft | float | derived |
| term_months | float | contract term |
| is_bulk | int | `n_properties > 1` |
| is_plausible, is_outlier, benchmark_eligible | int | see methodology |

## Web artefacts (`web/public/data/`)

| File | Content |
|---|---|
| summary.json | as-of dates, row counts, 4-week KPIs and prior period, weekly series |
| areas.json | community summary rows (+ signal) and community x month trend rows |
| price_bands.json | fair-price benchmark cells (levels L0-L3) |
| rent_benchmarks.json | rent benchmark cells (levels R1-R3) |
| anomalies.json | top 100 flagged sales |
| projects.json | top projects by sales, last 12 weeks |
| crosswalk.json | district to community mappings with evidence |
| market_note.json | weekly note text, source model, facts used |
| quality.json | data-quality checks and profile |
| backtest.json | out-of-sample accuracy of the fair-price engine: test window, coverage, median and mean error, band calibration, baseline, splits by level and by off-plan or ready |
| meta.json | build metadata and file sizes |
