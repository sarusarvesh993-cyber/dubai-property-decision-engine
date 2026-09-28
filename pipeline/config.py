"""Central configuration for the Dubai Property Decision Engine pipeline."""
from __future__ import annotations

import os
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RAW = DATA / "raw"
CLEAN = DATA / "clean"
MARTS = DATA / "marts"
DOCS = ROOT / "docs"
WEB_DATA = ROOT / "web" / "public" / "data"   # served statically by Next.js (also a public JSON API)
SQL_DIR = ROOT / "pipeline" / "sql"

GATEWAY = "https://gateway.dubailand.gov.ae/open-data"
USER_AGENT = "dubai-property-decision-engine/0.1 (open-data research; github.com)"
PAGE_SIZE = int(os.getenv("DLD_PAGE_SIZE", "5000"))
WINDOW_DAYS = 7                      # pull in weekly windows to keep paging stable
HISTORY_START = date(2026, 1, 1)     # gateway serves data from January 2026
DAILY_LOOKBACK_DAYS = 10             # daily mode re-pulls this many days (late registrations)
SMOKE_DAYS = 14                      # quick local run

SQFT_PER_SQM = 10.7639
BENCHMARK_MONTHS_SALES = 6           # window for price bands
BENCHMARK_MONTHS_RENTS = 12          # window for rent benchmarks
MIN_CELL_N = 8                       # minimum contracts/sales before publishing a benchmark cell

# Every gateway command needs its FULL parameter list, even when values are empty.
COMMAND_PARAMS = {
    "transactions": ["P_FROM_DATE", "P_TO_DATE", "P_GROUP_ID", "P_IS_OFFPLAN", "P_IS_FREE_HOLD",
                     "P_AREA_ID", "P_USAGE_ID", "P_PROP_TYPE_ID", "P_TAKE", "P_SKIP", "P_SORT"],
    "rents": ["P_FROM_DATE", "P_TO_DATE", "P_DATE_TYPE", "P_IS_FREE_HOLD", "P_VERSION",
              "P_AREA_ID", "P_USAGE_ID", "P_PROP_TYPE_ID", "P_TAKE", "P_SKIP", "P_SORT"],
}

# Columns kept from each command (English + identifiers; Arabic twins dropped to save space).
KEEP_COLUMNS = {
    "transactions": ["TRANSACTION_NUMBER", "INSTANCE_DATE", "GROUP_EN", "PROCEDURE_EN", "IS_OFFPLAN_EN",
                     "IS_FREE_HOLD_EN", "USAGE_EN", "AREA_EN", "PROJECT_EN", "MASTER_PROJECT_EN",
                     "PROP_TYPE_EN", "PROP_SB_TYPE_EN", "ROOMS_EN", "PARKING",
                     "TRANS_VALUE", "PROCEDURE_AREA", "ACTUAL_AREA", "PARCEL_ID",
                     "NEAREST_METRO_EN", "NEAREST_MALL_EN", "NEAREST_LANDMARK_EN"],
    # NOTE: the public rents feed is anonymised - CONTRACT_NUMBER / PROPERTY_ID / PARCEL_ID are null or 0,
    # and ROOMS is ~96% null. There is no contract key; rows are de-duplicated on the full record.
    "rents": ["VERSION_EN", "REGISTRATION_DATE", "START_DATE", "END_DATE", "TOTAL_PROPERTIES",
              "IS_FREE_HOLD_EN", "USAGE_EN", "AREA_EN", "PROJECT_EN", "MASTER_PROJECT_EN", "PROP_TYPE_EN",
              "PROP_SUB_TYPE_EN", "ROOMS", "ACTUAL_AREA", "CONTRACT_AMOUNT", "ANNUAL_AMOUNT", "PARKING",
              "NEAREST_METRO_EN", "NEAREST_MALL_EN", "NEAREST_LANDMARK_EN"],
}
DATE_COLUMN = {"transactions": "INSTANCE_DATE", "rents": "REGISTRATION_DATE"}
