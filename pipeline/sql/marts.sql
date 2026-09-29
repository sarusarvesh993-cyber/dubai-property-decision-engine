-- DuckDB analytical models. Placeholders {CLEAN}, {MIN_N}, {SALES_MONTHS}, {RENT_MONTHS} are filled by build_marts.py.
-- Grain and filters are explicit in every model so numbers are reproducible and explainable.
-- "Residential" medians use is_res_unit (flats and villas, no land plots); price bands keep every built sub-type.

CREATE OR REPLACE VIEW tx AS SELECT * FROM read_parquet('{CLEAN}/transactions.parquet');
CREATE OR REPLACE VIEW rt AS SELECT * FROM read_parquet('{CLEAN}/rents.parquet');

CREATE OR REPLACE MACRO max_tx_date() AS (SELECT max(date) FROM tx);
CREATE OR REPLACE MACRO max_rt_date() AS (SELECT max(registration_date) FROM rt);

-- ---------------------------------------------------------------- weekly series
CREATE OR REPLACE TABLE mart_weekly_sales AS
SELECT week,
       COUNT(*) FILTER (WHERE is_sale = 1)                                   AS sales,
       SUM(price_aed) FILTER (WHERE is_sale = 1)                             AS sales_value_aed,
       COUNT(*) FILTER (WHERE is_mortgage = 1)                               AS mortgages,
       AVG(is_offplan) FILTER (WHERE is_sale = 1)                            AS offplan_share,
       COUNT(*) FILTER (WHERE benchmark_eligible = 1 AND is_res_unit = 1) AS n_res_bench,
       MEDIAN(price_per_sqft) FILTER (WHERE benchmark_eligible = 1 AND is_res_unit = 1) AS median_ppsqft_res,
       MEDIAN(price_aed) FILTER (WHERE benchmark_eligible = 1 AND is_res_unit = 1)      AS median_price_res
FROM tx GROUP BY week ORDER BY week;

CREATE OR REPLACE TABLE mart_weekly_rents AS
SELECT week,
       COUNT(*)                                                              AS contracts,
       AVG(is_renewal)                                                       AS renewal_share,
       COUNT(*) FILTER (WHERE benchmark_eligible = 1)                        AS n_res_bench,
       MEDIAN(annual_rent_aed) FILTER (WHERE benchmark_eligible = 1)         AS median_rent_res,
       MEDIAN(rent_per_sqft) FILTER (WHERE benchmark_eligible = 1)           AS median_rent_psqft_res
FROM rt GROUP BY week ORDER BY week;

-- ---------------------------------------------------------------- area x month
CREATE OR REPLACE TABLE mart_area_month AS
SELECT area, month, is_offplan,
       COUNT(*) FILTER (WHERE is_sale = 1)                                   AS sales,
       SUM(price_aed) FILTER (WHERE is_sale = 1)                             AS sales_value_aed,
       COUNT(*) FILTER (WHERE benchmark_eligible = 1 AND is_res_unit = 1) AS n_bench,
       MEDIAN(price_per_sqft) FILTER (WHERE benchmark_eligible = 1 AND is_res_unit = 1) AS median_ppsqft,
       QUANTILE_CONT(price_per_sqft, 0.25) FILTER (WHERE benchmark_eligible = 1 AND is_res_unit = 1) AS p25_ppsqft,
       QUANTILE_CONT(price_per_sqft, 0.75) FILTER (WHERE benchmark_eligible = 1 AND is_res_unit = 1) AS p75_ppsqft
FROM tx GROUP BY area, month, is_offplan;

-- ---------------------------------------------------------------- area summary: last 12 weeks vs previous 12 weeks
CREATE OR REPLACE TABLE mart_area_summary AS
WITH cur AS (
  SELECT area,
         COUNT(*) FILTER (WHERE is_sale = 1) AS sales_12w,
         SUM(price_aed) FILTER (WHERE is_sale = 1) AS value_12w,
         AVG(is_offplan) FILTER (WHERE is_sale = 1) AS offplan_share_12w,
         COUNT(*) FILTER (WHERE is_mortgage = 1) AS mortgages_12w,
         COUNT(*) FILTER (WHERE benchmark_eligible = 1 AND is_res_unit = 1) AS n_bench_12w,
         MEDIAN(price_per_sqft) FILTER (WHERE benchmark_eligible = 1 AND is_res_unit = 1) AS median_ppsqft_12w,
         MEDIAN(price_aed) FILTER (WHERE benchmark_eligible = 1 AND is_res_unit = 1) AS median_price_12w
  FROM tx WHERE date > max_tx_date() - INTERVAL 84 DAY GROUP BY area),
prev AS (
  SELECT area,
         COUNT(*) FILTER (WHERE is_sale = 1) AS sales_prev_12w,
         COUNT(*) FILTER (WHERE benchmark_eligible = 1 AND is_res_unit = 1) AS n_bench_prev_12w,
         MEDIAN(price_per_sqft) FILTER (WHERE benchmark_eligible = 1 AND is_res_unit = 1) AS median_ppsqft_prev_12w
  FROM tx WHERE date <= max_tx_date() - INTERVAL 84 DAY AND date > max_tx_date() - INTERVAL 168 DAY GROUP BY area),
rents AS (
  SELECT area,
         COUNT(*) AS rent_contracts_12w,
         AVG(is_renewal) AS renewal_share_12w,
         COUNT(*) FILTER (WHERE benchmark_eligible = 1) AS n_rent_bench_12w,
         MEDIAN(annual_rent_aed) FILTER (WHERE benchmark_eligible = 1) AS median_rent_12w,
         MEDIAN(rent_per_sqft) FILTER (WHERE benchmark_eligible = 1) AS median_rent_psqft_12w
  FROM rt WHERE registration_date > max_rt_date() - INTERVAL 84 DAY GROUP BY area),
-- Gross yield is computed like for like: the community's dominant sale type (flats or villas) against rents of the same type.
-- Mixing villa rents with flat prices (or the reverse) produced yields that no investor would recognise.
sale_type AS (
  SELECT area, sub_type, COUNT(*) AS n_yield_sales, MEDIAN(price_per_sqft) AS median_ppsqft_yield
  FROM tx WHERE date > max_tx_date() - INTERVAL 84 DAY AND benchmark_eligible = 1 AND is_res_unit = 1
  GROUP BY area, sub_type),
rent_type AS (
  SELECT area, rent_kind AS sub_type, COUNT(*) AS n_yield_rents, MEDIAN(rent_per_sqft) AS median_rent_psqft_yield
  FROM (SELECT area, rent_per_sqft,
               CASE WHEN trim(sub_type) IN ('Flat', 'Studio') THEN 'Flat'
                    WHEN trim(sub_type) IN ('Villa', 'Complex Villas') THEN 'Villa' END AS rent_kind
        FROM rt WHERE registration_date > max_rt_date() - INTERVAL 84 DAY AND benchmark_eligible = 1)
  WHERE rent_kind IS NOT NULL
  GROUP BY area, rent_kind),
yield_pick AS (
  SELECT s.area, s.sub_type AS yield_sub_type, s.n_yield_sales, r.n_yield_rents, s.median_ppsqft_yield, r.median_rent_psqft_yield,
         ROW_NUMBER() OVER (PARTITION BY s.area ORDER BY s.n_yield_sales DESC, s.sub_type) AS rk
  FROM sale_type s JOIN rent_type r USING (area, sub_type))
SELECT c.area, c.sales_12w, c.value_12w, c.offplan_share_12w, c.mortgages_12w, c.n_bench_12w,
       c.median_ppsqft_12w, c.median_price_12w,
       p.sales_prev_12w, p.n_bench_prev_12w, p.median_ppsqft_prev_12w,
       CASE WHEN c.n_bench_12w >= {MIN_N} AND p.n_bench_prev_12w >= {MIN_N}
            THEN c.median_ppsqft_12w / p.median_ppsqft_prev_12w - 1 END AS ppsqft_change_12w,
       r.rent_contracts_12w, r.renewal_share_12w, r.n_rent_bench_12w, r.median_rent_12w, r.median_rent_psqft_12w,
       y.yield_sub_type, y.n_yield_sales, y.n_yield_rents, y.median_ppsqft_yield, y.median_rent_psqft_yield,
       CASE WHEN y.n_yield_sales >= {MIN_N} AND y.n_yield_rents >= {MIN_N}
            THEN y.median_rent_psqft_yield / y.median_ppsqft_yield END AS gross_yield_est
FROM cur c LEFT JOIN prev p USING (area) LEFT JOIN rents r USING (area)
LEFT JOIN yield_pick y ON y.area = c.area AND y.rk = 1
ORDER BY c.sales_12w DESC;

-- ---------------------------------------------------------------- price bands (fair-price engine), last {SALES_MONTHS} months
CREATE OR REPLACE TABLE mart_price_bands AS
WITH base AS (
  SELECT * FROM tx
  WHERE benchmark_eligible = 1 AND date > max_tx_date() - INTERVAL ({SALES_MONTHS} * 30) DAY)
SELECT 'L0' AS level, area, project, sub_type, rooms, is_offplan, COUNT(*) AS n,
       QUANTILE_CONT(price_per_sqft, 0.10) AS p10, QUANTILE_CONT(price_per_sqft, 0.25) AS p25,
       MEDIAN(price_per_sqft) AS median, QUANTILE_CONT(price_per_sqft, 0.75) AS p75, QUANTILE_CONT(price_per_sqft, 0.90) AS p90,
       MEDIAN(size_sqft) AS median_size_sqft, MEDIAN(price_aed) AS median_price, MIN(date)::DATE AS first_date, MAX(date)::DATE AS last_date
FROM base WHERE project IS NOT NULL GROUP BY area, project, sub_type, rooms, is_offplan HAVING COUNT(*) >= {MIN_N}
UNION ALL
SELECT 'L1', area, NULL, sub_type, rooms, is_offplan, COUNT(*),
       QUANTILE_CONT(price_per_sqft, 0.10), QUANTILE_CONT(price_per_sqft, 0.25), MEDIAN(price_per_sqft),
       QUANTILE_CONT(price_per_sqft, 0.75), QUANTILE_CONT(price_per_sqft, 0.90),
       MEDIAN(size_sqft), MEDIAN(price_aed), MIN(date)::DATE, MAX(date)::DATE
FROM base GROUP BY area, sub_type, rooms, is_offplan HAVING COUNT(*) >= {MIN_N}
UNION ALL
SELECT 'L2', area, NULL, sub_type, NULL, is_offplan, COUNT(*),
       QUANTILE_CONT(price_per_sqft, 0.10), QUANTILE_CONT(price_per_sqft, 0.25), MEDIAN(price_per_sqft),
       QUANTILE_CONT(price_per_sqft, 0.75), QUANTILE_CONT(price_per_sqft, 0.90),
       MEDIAN(size_sqft), MEDIAN(price_aed), MIN(date)::DATE, MAX(date)::DATE
FROM base GROUP BY area, sub_type, is_offplan HAVING COUNT(*) >= {MIN_N}
UNION ALL
SELECT 'L3', area, NULL, NULL, NULL, is_offplan, COUNT(*),
       QUANTILE_CONT(price_per_sqft, 0.10), QUANTILE_CONT(price_per_sqft, 0.25), MEDIAN(price_per_sqft),
       QUANTILE_CONT(price_per_sqft, 0.75), QUANTILE_CONT(price_per_sqft, 0.90),
       MEDIAN(size_sqft), MEDIAN(price_aed), MIN(date)::DATE, MAX(date)::DATE
FROM base GROUP BY area, is_offplan HAVING COUNT(*) >= {MIN_N};

-- ---------------------------------------------------------------- rent benchmarks, last {RENT_MONTHS} months (residential, eligible)
CREATE OR REPLACE TABLE mart_rent_benchmarks AS
WITH base AS (
  SELECT * FROM rt
  WHERE benchmark_eligible = 1 AND registration_date > max_rt_date() - INTERVAL ({RENT_MONTHS} * 30) DAY)
SELECT 'R1' AS level, area, sub_type, size_band, is_renewal, COUNT(*) AS n,
       QUANTILE_CONT(annual_rent_aed, 0.25) AS p25, MEDIAN(annual_rent_aed) AS median, QUANTILE_CONT(annual_rent_aed, 0.75) AS p75,
       MEDIAN(rent_per_sqft) AS median_rent_psqft, MEDIAN(size_sqft) AS median_size_sqft,
       MIN(registration_date)::DATE AS first_date, MAX(registration_date)::DATE AS last_date
FROM base GROUP BY area, sub_type, size_band, is_renewal HAVING COUNT(*) >= {MIN_N}
UNION ALL
SELECT 'R2', area, sub_type, size_band, NULL, COUNT(*),
       QUANTILE_CONT(annual_rent_aed, 0.25), MEDIAN(annual_rent_aed), QUANTILE_CONT(annual_rent_aed, 0.75),
       MEDIAN(rent_per_sqft), MEDIAN(size_sqft), MIN(registration_date)::DATE, MAX(registration_date)::DATE
FROM base GROUP BY area, sub_type, size_band HAVING COUNT(*) >= {MIN_N}
UNION ALL
SELECT 'R3', area, sub_type, NULL, NULL, COUNT(*),
       QUANTILE_CONT(annual_rent_aed, 0.25), MEDIAN(annual_rent_aed), QUANTILE_CONT(annual_rent_aed, 0.75),
       MEDIAN(rent_per_sqft), MEDIAN(size_sqft), MIN(registration_date)::DATE, MAX(registration_date)::DATE
FROM base GROUP BY area, sub_type HAVING COUNT(*) >= {MIN_N};

-- ---------------------------------------------------------------- anomalies: last 60 days vs finest available benchmark cell
CREATE OR REPLACE TABLE mart_anomalies AS
WITH scored AS (
  SELECT t.transaction_id, t.date::DATE AS date, t.area, t.project, t.sub_type, t.rooms, t.is_offplan,
         t.size_sqft, t.price_aed, t.price_per_sqft,
         COALESCE(b1.median, b2.median) AS cell_median_ppsqft, COALESCE(b1.n, b2.n) AS cell_n,
         CASE WHEN b1.median IS NOT NULL THEN 'area x type x rooms' ELSE 'area x type' END AS cell_level
  FROM tx t
  LEFT JOIN mart_price_bands b1 ON b1.level = 'L1' AND b1.area = t.area AND b1.sub_type = t.sub_type
        AND b1.rooms = t.rooms AND b1.is_offplan = t.is_offplan
  LEFT JOIN mart_price_bands b2 ON b2.level = 'L2' AND b2.area = t.area AND b2.sub_type = t.sub_type AND b2.is_offplan = t.is_offplan
  WHERE t.benchmark_eligible = 1 AND t.is_res_unit = 1 AND t.date > max_tx_date() - INTERVAL 60 DAY)
SELECT *, price_per_sqft / cell_median_ppsqft - 1 AS deviation_pct,
       CASE WHEN price_per_sqft > cell_median_ppsqft THEN 'above' ELSE 'below' END AS direction
FROM scored
WHERE cell_median_ppsqft IS NOT NULL AND ABS(price_per_sqft / cell_median_ppsqft - 1) > 0.35
ORDER BY ABS(price_per_sqft / cell_median_ppsqft - 1) DESC;

-- ---------------------------------------------------------------- top projects, last 12 weeks
CREATE OR REPLACE TABLE mart_top_projects AS
SELECT project, area, COUNT(*) FILTER (WHERE is_sale = 1) AS sales, SUM(price_aed) FILTER (WHERE is_sale = 1) AS value_aed,
       AVG(is_offplan) FILTER (WHERE is_sale = 1) AS offplan_share,
       COUNT(*) FILTER (WHERE benchmark_eligible = 1) AS n_bench,
       MEDIAN(price_per_sqft) FILTER (WHERE benchmark_eligible = 1) AS median_ppsqft
FROM tx WHERE project IS NOT NULL AND date > max_tx_date() - INTERVAL 84 DAY
GROUP BY project, area HAVING COUNT(*) FILTER (WHERE is_sale = 1) >= 5 ORDER BY sales DESC;

-- ---------------------------------------------------------------- dimensions
CREATE OR REPLACE TABLE dim_area AS
SELECT area,
       (SELECT COUNT(*) FROM tx x WHERE x.area = a.area AND x.is_sale = 1) AS total_sales,
       (SELECT COUNT(*) FROM rt r WHERE r.area = a.area) AS total_rent_contracts
FROM (SELECT DISTINCT area FROM tx UNION SELECT DISTINCT area FROM rt) a
WHERE area IS NOT NULL ORDER BY total_sales DESC;
