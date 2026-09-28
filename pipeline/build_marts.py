"""Run the DuckDB SQL models and persist every mart as parquet (+ a CSV preview for Power BI)."""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import duckdb

from config import BENCHMARK_MONTHS_RENTS, BENCHMARK_MONTHS_SALES, CLEAN, MARTS, MIN_CELL_N, SQL_DIR

log = logging.getLogger("marts")
MART_TABLES = ["mart_weekly_sales", "mart_weekly_rents", "mart_area_month", "mart_area_summary", "mart_price_bands",
               "mart_rent_benchmarks", "mart_anomalies", "mart_top_projects", "dim_area"]


def run() -> dict:
    MARTS.mkdir(parents=True, exist_ok=True)
    sql = (SQL_DIR / "marts.sql").read_text(encoding="utf-8")
    sql = (sql.replace("{CLEAN}", CLEAN.as_posix()).replace("{MIN_N}", str(MIN_CELL_N))
              .replace("{SALES_MONTHS}", str(BENCHMARK_MONTHS_SALES)).replace("{RENT_MONTHS}", str(BENCHMARK_MONTHS_RENTS)))
    con = duckdb.connect()
    con.execute(sql)
    counts = {}
    for t in MART_TABLES:
        con.execute(f"COPY (SELECT * FROM {t}) TO '{(MARTS / (t + '.parquet')).as_posix()}' (FORMAT PARQUET, COMPRESSION ZSTD)")
        counts[t] = con.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
    meta = {
        "built_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "tx_first_date": str(con.execute("SELECT min(date)::DATE FROM tx").fetchone()[0]),
        "tx_last_date": str(con.execute("SELECT max(date)::DATE FROM tx").fetchone()[0]),
        "rt_first_date": str(con.execute("SELECT min(registration_date)::DATE FROM rt").fetchone()[0]),
        "rt_last_date": str(con.execute("SELECT max(registration_date)::DATE FROM rt").fetchone()[0]),
        "tx_rows": con.execute("SELECT COUNT(*) FROM tx").fetchone()[0],
        "rt_rows": con.execute("SELECT COUNT(*) FROM rt").fetchone()[0],
        "mart_rows": counts,
        "params": {"min_cell_n": MIN_CELL_N, "sales_months": BENCHMARK_MONTHS_SALES, "rent_months": BENCHMARK_MONTHS_RENTS},
    }
    (MARTS / "_meta.json").write_text(json.dumps(meta, indent=2, default=str), encoding="utf-8")
    con.close()
    log.info("marts built: %s", counts)
    return meta


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(json.dumps(run(), indent=2, default=str))
