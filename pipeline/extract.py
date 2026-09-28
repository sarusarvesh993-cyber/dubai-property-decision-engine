"""Extract DLD transactions and Ejari rents into monthly parquet partitions.

Modes
  backfill : HISTORY_START -> today (≈30 min for 9 months; run in GitHub Actions)
  daily    : re-pull the last DAILY_LOOKBACK_DAYS and merge (late registrations are common)
  smoke    : last SMOKE_DAYS — quick local verification

Partitions: data/raw/<command>/YYYY-MM.parquet keyed by the record's own date column,
re-written with de-duplication so re-pulls are idempotent.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta

import pandas as pd

from config import DAILY_LOOKBACK_DAYS, DATE_COLUMN, HISTORY_START, KEEP_COLUMNS, RAW, SMOKE_DAYS
from dld_client import fetch_range

log = logging.getLogger("extract")

# Identifiers in the public feed are anonymised, so de-duplication is on the full record
# (all kept columns). Legitimate multi-row records survive: e.g. "Lease to Own" transactions
# carry two rows with different values, and multi-unit leases carry TOTAL_PROPERTIES > 1.
DEDUPE_KEYS = {cmd: [c for c in cols] for cmd, cols in KEEP_COLUMNS.items()}


def partition_key(ts) -> str:
    """Monthly partition name (YYYY-MM) for a record timestamp."""
    return pd.Timestamp(ts).strftime("%Y-%m")


def _frame(command: str, rows: list[dict]) -> pd.DataFrame:
    if not rows:
        return pd.DataFrame(columns=KEEP_COLUMNS[command])
    df = pd.DataFrame(rows)
    keep = [c for c in KEEP_COLUMNS[command] if c in df.columns]
    df = df[keep].copy()
    dcol = DATE_COLUMN[command]
    df[dcol] = pd.to_datetime(df[dcol], errors="coerce")
    df = df.dropna(subset=[dcol])
    df["_pulled_at"] = pd.Timestamp.utcnow().tz_localize(None)
    return df


def _merge_partition(command: str, month: str, new: pd.DataFrame) -> int:
    path = RAW / command / f"{month}.parquet"
    if path.exists():
        old = pd.read_parquet(path)
        combined = pd.concat([old, new], ignore_index=True)
    else:
        combined = new
    combined = combined.sort_values("_pulled_at").drop_duplicates(subset=DEDUPE_KEYS[command], keep="last")
    combined = combined.sort_values(DATE_COLUMN[command]).reset_index(drop=True)
    path.parent.mkdir(parents=True, exist_ok=True)
    combined.to_parquet(path, index=False, compression="zstd")
    return len(combined)


def pull(command: str, start: date, end: date) -> dict[str, int]:
    rows = fetch_range(command, start, end)
    df = _frame(command, rows)
    if df.empty:
        log.warning("%s: no rows for %s->%s", command, start, end)
        return {}
    dcol = DATE_COLUMN[command]
    result = {}
    for month, part in df.groupby(df[dcol].map(partition_key)):
        result[str(month)] = _merge_partition(command, str(month), part)
    log.info("%s: %d rows pulled -> partitions %s", command, len(df), result)
    return result


def run(mode: str = "daily", today: date | None = None) -> None:
    today = today or date.today()
    if mode == "backfill":
        start = HISTORY_START
    elif mode == "smoke":
        start = today - timedelta(days=SMOKE_DAYS - 1)
    else:
        start = today - timedelta(days=DAILY_LOOKBACK_DAYS - 1)
    for command in ("transactions", "rents"):
        pull(command, start, today)


if __name__ == "__main__":
    import sys
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    run(sys.argv[1] if len(sys.argv) > 1 else "smoke")
