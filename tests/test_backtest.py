"""Back-test of the fair-price engine on synthetic data (no network, no files)."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pipeline"))

import backtest  # noqa: E402


def _synthetic(n_days: int = 200, seed: int = 7) -> pd.DataFrame:
    """Two communities with stable price levels, one project cell, plus a few sales in an unseen community."""
    rng = np.random.default_rng(seed)
    rows = []
    start = pd.Timestamp("2026-01-01")
    for i in range(n_days * 6):
        day = start + pd.Timedelta(days=int(i // 6))
        area = "Alpha" if i % 3 else "Beta"
        base = 1500.0 if area == "Alpha" else 900.0
        rooms = ["Studio", "1 B/R", "2 B/R"][i % 3]
        base *= {"Studio": 1.15, "1 B/R": 1.0, "2 B/R": 0.95}[rooms]
        project = "Tower One" if (area == "Alpha" and i % 2 == 0) else None
        if project:
            base *= 1.10
        ppsf = base * float(np.exp(rng.normal(0, 0.05)))
        size = 800.0
        rows.append({"transaction_id": str(i), "date": day, "area": area, "project": project, "sub_type": "Flat", "rooms": rooms,
                     "is_offplan": 0, "usage": "Residential", "size_sqft": size, "price_aed": ppsf * size, "price_per_sqft": ppsf,
                     "benchmark_eligible": 1})
    # a community that only appears in the test window: no comparable cell, so coverage < 100%
    last = start + pd.Timedelta(days=n_days - 1)
    for j in range(5):
        rows.append({"transaction_id": f"g{j}", "date": last, "area": "Gamma", "project": None, "sub_type": "Flat", "rooms": "1 B/R",
                     "is_offplan": 0, "usage": "Residential", "size_sqft": 800.0, "price_aed": 800 * 1200.0, "price_per_sqft": 1200.0,
                     "benchmark_eligible": 1})
    return pd.DataFrame(rows)


def test_backtest_metrics_are_sensible():
    tx = _synthetic()
    res = backtest.compute(tx, months=6, min_n=8)
    o = res["overall"]
    assert res["test_window"]["days"] == 28  # 200 days of history triggers the 28-day window
    assert o["n_test"] > 100
    assert 0.9 < o["coverage"] < 1.0  # Gamma has no training data
    assert o["mdape"] < 0.06  # noise is 5%, the comparable median should land within it
    assert o["baseline_mdape"] > o["mdape"]  # the hierarchy beats one citywide median
    assert 0.35 < o["within_p25_p75"] < 0.65  # band calibration around 50%
    assert "L0 project" in res["by_level"] and "L1 area x type x bedrooms" in res["by_level"]
    assert res["by_level"]["L0 project"]["coverage"] == 1.0


def test_backtest_short_history_uses_seven_days():
    tx = _synthetic(n_days=20)
    res = backtest.compute(tx, months=6, min_n=8)
    assert res["test_window"]["days"] == 7
    assert res["overall"]["n_test"] > 0


def test_backtest_handles_empty_input():
    empty = pd.DataFrame(columns=["transaction_id", "date", "area", "project", "sub_type", "rooms", "is_offplan", "usage",
                                  "size_sqft", "price_aed", "price_per_sqft", "benchmark_eligible"])
    empty["date"] = pd.to_datetime(empty["date"])
    assert backtest.compute(empty)["status"] == "no data"
