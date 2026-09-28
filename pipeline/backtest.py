"""Out-of-sample back-test of the fair-price engine.

Question answered: "If the engine had been used on the sales that registered in the last few weeks,
using only the data available before them, how far off would its estimate have been?"

Method
  * Test set: benchmark-eligible residential sales registered in the most recent TEST window
    (28 days when at least 120 days of history exist, otherwise 7 days).
  * Training set: eligible sales registered before the test window, in the same trailing window the
    site uses for price bands (BENCHMARK_MONTHS_SALES), with the same minimum cell size (MIN_CELL_N).
  * Prediction: the median AED/sqft of the finest comparable cell that exists in the training set,
    with exactly the fallback order the site uses: L0 project, L1 area x type x bedrooms,
    L2 area x type, L3 area, always inside the same off-plan / ready group.
  * Baseline: one citywide median AED/sqft (residential, same group) - what a naive tool would do.
  * Metrics: coverage (share of test sales with a comparable cell), median and mean absolute percentage
    error, share of actual prices inside the published p25 to p75 and p10 to p90 bands, and median bias.

Output: data/marts/backtest.json (also exported to web/public/data/backtest.json).
Caveat: outlier flags were computed on the full data set, so the test set excludes outliers that a
live user could still meet. Numbers therefore describe the error on ordinary registered sales.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import duckdb
import pandas as pd

from config import BENCHMARK_MONTHS_SALES, CLEAN, MARTS, MIN_CELL_N

log = logging.getLogger("backtest")

SQL = """
WITH bounds AS (SELECT max(date) AS max_d, min(date) AS min_d FROM tx),
params AS (SELECT max_d - INTERVAL ({test_days}) DAY AS cutoff, max_d, min_d FROM bounds),
train AS (
  SELECT t.* FROM tx t, params p
  WHERE t.benchmark_eligible = 1 AND t.date <= p.cutoff AND t.date > p.cutoff - INTERVAL ({months} * 30) DAY),
test AS (
  SELECT t.* FROM tx t, params p
  WHERE t.benchmark_eligible = 1 AND t.usage = 'Residential' AND t.date > p.cutoff),
b0 AS (SELECT area, project, sub_type, rooms, is_offplan, COUNT(*) AS n, MEDIAN(price_per_sqft) AS med,
              QUANTILE_CONT(price_per_sqft, 0.10) AS p10, QUANTILE_CONT(price_per_sqft, 0.25) AS p25,
              QUANTILE_CONT(price_per_sqft, 0.75) AS p75, QUANTILE_CONT(price_per_sqft, 0.90) AS p90
       FROM train WHERE project IS NOT NULL GROUP BY 1,2,3,4,5 HAVING COUNT(*) >= {min_n}),
b1 AS (SELECT area, sub_type, rooms, is_offplan, COUNT(*) AS n, MEDIAN(price_per_sqft) AS med,
              QUANTILE_CONT(price_per_sqft, 0.10) AS p10, QUANTILE_CONT(price_per_sqft, 0.25) AS p25,
              QUANTILE_CONT(price_per_sqft, 0.75) AS p75, QUANTILE_CONT(price_per_sqft, 0.90) AS p90
       FROM train GROUP BY 1,2,3,4 HAVING COUNT(*) >= {min_n}),
b2 AS (SELECT area, sub_type, is_offplan, COUNT(*) AS n, MEDIAN(price_per_sqft) AS med,
              QUANTILE_CONT(price_per_sqft, 0.10) AS p10, QUANTILE_CONT(price_per_sqft, 0.25) AS p25,
              QUANTILE_CONT(price_per_sqft, 0.75) AS p75, QUANTILE_CONT(price_per_sqft, 0.90) AS p90
       FROM train GROUP BY 1,2,3 HAVING COUNT(*) >= {min_n}),
b3 AS (SELECT area, is_offplan, COUNT(*) AS n, MEDIAN(price_per_sqft) AS med,
              QUANTILE_CONT(price_per_sqft, 0.10) AS p10, QUANTILE_CONT(price_per_sqft, 0.25) AS p25,
              QUANTILE_CONT(price_per_sqft, 0.75) AS p75, QUANTILE_CONT(price_per_sqft, 0.90) AS p90
       FROM train GROUP BY 1,2 HAVING COUNT(*) >= {min_n}),
city AS (SELECT is_offplan, MEDIAN(price_per_sqft) AS med FROM train WHERE usage = 'Residential' GROUP BY 1)
SELECT t.transaction_id, t.date, t.area, t.project, t.sub_type, t.rooms, t.is_offplan, t.price_per_sqft AS actual,
       CASE WHEN b0.med IS NOT NULL THEN 'L0 project'
            WHEN b1.med IS NOT NULL THEN 'L1 area x type x bedrooms'
            WHEN b2.med IS NOT NULL THEN 'L2 area x type'
            WHEN b3.med IS NOT NULL THEN 'L3 area' END AS level,
       COALESCE(b0.med, b1.med, b2.med, b3.med) AS pred,
       COALESCE(b0.p10, b1.p10, b2.p10, b3.p10) AS p10,
       COALESCE(b0.p25, b1.p25, b2.p25, b3.p25) AS p25,
       COALESCE(b0.p75, b1.p75, b2.p75, b3.p75) AS p75,
       COALESCE(b0.p90, b1.p90, b2.p90, b3.p90) AS p90,
       COALESCE(b0.n, b1.n, b2.n, b3.n) AS cell_n,
       c.med AS baseline
FROM test t
LEFT JOIN b0 ON b0.area = t.area AND b0.project = t.project AND b0.sub_type = t.sub_type AND b0.rooms = t.rooms AND b0.is_offplan = t.is_offplan
LEFT JOIN b1 ON b1.area = t.area AND b1.sub_type = t.sub_type AND b1.rooms = t.rooms AND b1.is_offplan = t.is_offplan
LEFT JOIN b2 ON b2.area = t.area AND b2.sub_type = t.sub_type AND b2.is_offplan = t.is_offplan
LEFT JOIN b3 ON b3.area = t.area AND b3.is_offplan = t.is_offplan
LEFT JOIN city c ON c.is_offplan = t.is_offplan
"""


def _metrics(df: pd.DataFrame) -> dict:
    """Error metrics for one segment of scored test sales."""
    n = int(len(df))
    cov = df[df["pred"].notna()]
    out = {"n_test": n, "n_covered": int(len(cov)), "coverage": round(len(cov) / n, 4) if n else None}
    if len(cov):
        ape = (cov["actual"] / cov["pred"] - 1).abs()
        out.update({
            "mdape": round(float(ape.median()), 4),
            "mape": round(float(ape.mean()), 4),
            "within_p25_p75": round(float(((cov["actual"] >= cov["p25"]) & (cov["actual"] <= cov["p75"])).mean()), 4),
            "within_p10_p90": round(float(((cov["actual"] >= cov["p10"]) & (cov["actual"] <= cov["p90"])).mean()), 4),
            "median_bias": round(float((cov["pred"] / cov["actual"] - 1).median()), 4),
            "share_within_10pct": round(float((ape <= 0.10).mean()), 4),
            "share_within_20pct": round(float((ape <= 0.20).mean()), 4),
        })
        base = cov[cov["baseline"].notna()]
        if len(base):
            bape = (base["actual"] / base["baseline"] - 1).abs()
            out["baseline_mdape"] = round(float(bape.median()), 4)
            out["baseline_mape"] = round(float(bape.mean()), 4)
    return out


def compute(tx: pd.DataFrame, months: int = BENCHMARK_MONTHS_SALES, min_n: int = MIN_CELL_N, test_days: int | None = None) -> dict:
    """Score the test window against training-only benchmarks and return the metrics dictionary."""
    con = duckdb.connect()
    con.register("tx", tx)
    min_d, max_d = con.execute("SELECT min(date), max(date) FROM tx").fetchone()
    if min_d is None:
        return {"status": "no data"}
    span_days = (pd.Timestamp(max_d) - pd.Timestamp(min_d)).days
    if test_days is None:
        test_days = 28 if span_days >= 120 else 7
    scored = con.execute(SQL.format(test_days=test_days, months=months, min_n=min_n)).fetchdf()
    con.close()
    cutoff = pd.Timestamp(max_d) - pd.Timedelta(days=test_days)
    result = {
        "computed_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "test_window": {"from": str((cutoff + pd.Timedelta(days=1)).date()), "to": str(pd.Timestamp(max_d).date()), "days": test_days},
        "train_window_months": months, "min_cell_n": min_n,
        "history_days_available": int(span_days),
        "overall": _metrics(scored),
        "by_level": {str(k): _metrics(g) for k, g in scored[scored["level"].notna()].groupby("level")},
        "by_sub_type": {str(k): _metrics(g) for k, g in scored.groupby("sub_type") if len(g) >= min_n},
        "by_offplan": {("off-plan" if k == 1 else "ready"): _metrics(g) for k, g in scored.groupby("is_offplan")},
        "notes": [
            "Prediction = median AED/sqft of the finest comparable cell built from sales registered before the test window.",
            "Baseline = one citywide median AED/sqft per off-plan/ready group from the same training window.",
            "Bands are the p25 to p75 and p10 to p90 of the comparable cell; a well-calibrated band holds about 50% and 80% of actual prices.",
            "Outlier flags come from the full data set, so the test set excludes extreme registrations.",
        ],
    }
    return result


def run() -> dict:
    tx = pd.read_parquet(CLEAN / "transactions.parquet")
    result = compute(tx)
    MARTS.mkdir(parents=True, exist_ok=True)
    (MARTS / "backtest.json").write_text(json.dumps(result, indent=2, default=str), encoding="utf-8")
    o = result.get("overall", {})
    log.info("backtest: window %s, n_test %s, coverage %s, MdAPE %s, within p25-p75 %s (baseline MdAPE %s)",
             result.get("test_window"), o.get("n_test"), o.get("coverage"), o.get("mdape"), o.get("within_p25_p75"), o.get("baseline_mdape"))
    return result


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(json.dumps(run(), indent=2, default=str))
