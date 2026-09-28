"""Unit tests for the deterministic parts of the pipeline (no network)."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pipeline"))

import clean  # noqa: E402
import config  # noqa: E402
from build_marts import MART_TABLES  # noqa: E402
from extract import DEDUPE_KEYS, partition_key  # noqa: E402


def test_command_params_are_complete():
    # The gateway rejects bodies with missing P_* keys, so every declared key must be present.
    assert set(config.COMMAND_PARAMS["transactions"]) >= {"P_FROM_DATE", "P_TO_DATE", "P_TAKE", "P_SKIP", "P_SORT", "P_GROUP_ID", "P_IS_OFFPLAN"}
    assert set(config.COMMAND_PARAMS["rents"]) >= {"P_FROM_DATE", "P_TO_DATE", "P_DATE_TYPE", "P_VERSION", "P_TAKE", "P_SKIP", "P_SORT"}


def test_dedupe_uses_full_record():
    for cmd, cols in config.KEEP_COLUMNS.items():
        assert DEDUPE_KEYS[cmd] == cols


def test_partition_key_is_month():
    assert partition_key("2026-09-21T13:20:13") == "2026-09"
    assert partition_key("2026-01-05T00:00:00") == "2026-01"


def test_normalise_rooms():
    s = pd.Series(["Studio", "1 B/R", "2 B/R", "5 B/R", "7 B/R", "Office", None, "PENTHOUSE"])
    out = clean.normalise_rooms(s).tolist()
    assert out == ["Studio", "1 B/R", "2 B/R", "5+ B/R", "5+ B/R", "NA", "NA", "NA"]


def test_size_bands_cover_range():
    s = pd.Series([10.0, 45.0, 84.9, 85.0, 300.0, 999.0])
    assert clean.size_band(s).tolist() == ["<40 sqm", "40-60", "60-85", "85-120", "250-400", "400+"]


def test_robust_outlier_flags_extreme_only():
    rng = np.random.default_rng(0)
    base = pd.DataFrame({"area": "X", "sub_type": "Flat", "is_offplan": 0, "price_per_sqm": np.exp(rng.normal(np.log(20000), 0.15, 200))})
    base.loc[0, "price_per_sqm"] = 400000  # 20x the typical level
    base.loc[1, "price_per_sqm"] = 500
    flags = clean.robust_outlier_flag(base, "price_per_sqm", ["area", "sub_type", "is_offplan"])
    assert flags.iloc[0] and flags.iloc[1]
    assert flags.mean() < 0.05


def test_sql_defines_every_mart():
    sql = (config.SQL_DIR / "marts.sql").read_text()
    for t in MART_TABLES:
        assert f"CREATE OR REPLACE TABLE {t}" in sql, t
    for placeholder in ("{CLEAN}", "{MIN_N}", "{SALES_MONTHS}", "{RENT_MONTHS}"):
        assert placeholder in sql


def test_sale_procedures_exclude_non_sales():
    assert "Mortgage Registration" not in clean.SALE_PROCEDURES
    assert "Grant" not in clean.SALE_PROCEDURES
    assert "Lease to Own Registration" not in clean.SALE_PROCEDURES
    assert {"Sale", "Sell - Pre registration"} <= clean.SALE_PROCEDURES


@pytest.mark.parametrize("below,expected", [(0.05, 0.0), (0.10, 0.0), (0.15, 0.05), (0.25, 0.10), (0.35, 0.15), (0.50, 0.20), (-0.2, 0.0)])
def test_rera_slabs_match_web_engine(below, expected):
    # Mirror of web/lib/engine.ts::reraSlab — keeps the Python docs and the TS calculator in sync.
    def rera_slab(b):
        return 0.0 if b <= 0.10 else 0.05 if b <= 0.20 else 0.10 if b <= 0.30 else 0.15 if b <= 0.40 else 0.20
    assert rera_slab(below) == expected
    ts = (ROOT / "web" / "lib" / "engine.ts").read_text()
    assert "if (belowMarketPct <= 0.10) return 0;" in ts and "return 0.20;" in ts


def test_crosswalk_derives_from_shared_projects():
    import crosswalk
    t = pd.DataFrame({"is_sale": 1, "project": ["A", "B", "C", "A", "B", "C"] * 3, "area": ["JVC"] * 18})
    r = pd.DataFrame({"project": ["A", "B", "C"] * 4, "area": ["Al Barsha South Fourth"] * 12})
    xw = crosswalk.build(t, r)
    assert xw.set_index("district").loc["Al Barsha South Fourth", "community"] == "Jumeirah Village Circle"  # seed wins
    derived = crosswalk.derive(t, r)
    assert derived.iloc[0]["community"] == "JVC" and derived.iloc[0]["projects"] == 3
    mapped = crosswalk.apply(pd.Series(["Marsa Dubai", "Business Bay", None]), xw).tolist()
    assert mapped[0] == "Dubai Marina" and mapped[1] == "Business Bay"


def test_crosswalk_never_remaps_canonical_names():
    import crosswalk
    # a district heavily used by the transactions feed itself must stay as it is
    t = pd.DataFrame({"is_sale": 1, "project": ["P1", "P2", "P3"] * 20, "area": ["Business Bay"] * 60})
    r = pd.DataFrame({"project": ["P1", "P2", "P3"] * 5, "area": ["Business Bay"] * 15})
    assert crosswalk.derive(t, r).empty
