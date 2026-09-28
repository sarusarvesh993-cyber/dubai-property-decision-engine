"""Export compact JSON artefacts for the Next.js site (web/data/*.json).

Everything the site needs is pre-computed here, so the front-end is static, fast and free to host.
"""
from __future__ import annotations

import json
import logging
import math
from datetime import datetime, timezone

import pandas as pd

from config import MARTS, WEB_DATA

log = logging.getLogger("export")


def _records(df: pd.DataFrame, round_cols: dict[str, int] | None = None) -> list[dict]:
    df = df.copy()
    for c, d in (round_cols or {}).items():
        if c in df.columns:
            df[c] = df[c].astype(float).round(d)
    for c in df.columns:
        if str(df[c].dtype).startswith("datetime") or df[c].dtype == "object" and len(df) and hasattr(df[c].iloc[0], "isoformat"):
            df[c] = df[c].astype(str)
    recs = df.to_dict("records")
    for r in recs:
        for k, v in list(r.items()):
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                r[k] = None
            elif hasattr(v, "item"):
                r[k] = v.item()
    return recs


def _clean(obj):
    """Recursively replace NaN/Inf floats (invalid JSON) with None."""
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_clean(v) for v in obj]
    if isinstance(obj, float) and (obj != obj or obj in (float("inf"), float("-inf"))):
        return None
    if hasattr(obj, "item"):
        return _clean(obj.item())
    return obj


def _write(name: str, payload) -> int:
    path = WEB_DATA / name
    path.write_text(json.dumps(_clean(payload), separators=(",", ":"), default=str, allow_nan=False), encoding="utf-8")
    return path.stat().st_size


def run() -> dict:
    WEB_DATA.mkdir(parents=True, exist_ok=True)
    meta = json.loads((MARTS / "_meta.json").read_text(encoding="utf-8"))
    ws = pd.read_parquet(MARTS / "mart_weekly_sales.parquet").sort_values("week")
    wr = pd.read_parquet(MARTS / "mart_weekly_rents.parquet").sort_values("week")
    areas = pd.read_parquet(MARTS / "mart_area_summary.parquet")
    bands = pd.read_parquet(MARTS / "mart_price_bands.parquet")
    rents = pd.read_parquet(MARTS / "mart_rent_benchmarks.parquet")
    anomalies = pd.read_parquet(MARTS / "mart_anomalies.parquet")
    projects = pd.read_parquet(MARTS / "mart_top_projects.parquet")
    area_month = pd.read_parquet(MARTS / "mart_area_month.parquet")
    note = json.loads((MARTS / "market_note.json").read_text(encoding="utf-8")) if (MARTS / "market_note.json").exists() else None
    quality = json.loads((MARTS / "quality.json").read_text(encoding="utf-8")) if (MARTS / "quality.json").exists() else None
    backtest = json.loads((MARTS / "backtest.json").read_text(encoding="utf-8")) if (MARTS / "backtest.json").exists() else None

    full = ws.iloc[:-1] if len(ws) > 2 else ws
    last4, prev4 = full.tail(4), (full.iloc[-8:-4] if len(full) >= 8 else pd.DataFrame())

    def kpi(df):
        if df.empty:
            return None
        return {"sales": int(df["sales"].sum()), "value_aed": float(df["sales_value_aed"].sum()), "mortgages": int(df["mortgages"].sum()),
                "offplan_share": float(df["offplan_share"].mean()), "median_ppsqft_res": float(df["median_ppsqft_res"].median())}

    rl4 = wr.iloc[:-1].tail(4) if len(wr) > 2 else wr
    summary = {
        "as_of": meta["tx_last_date"], "rent_as_of": meta["rt_last_date"], "coverage_from": meta["tx_first_date"],
        "built_at_utc": meta["built_at_utc"], "rows": {"transactions": meta["tx_rows"], "rents": meta["rt_rows"]},
        "kpi_last4w": kpi(last4), "kpi_prev4w": kpi(prev4),
        "rent_kpi_last4w": {"contracts": int(rl4["contracts"].sum()), "renewal_share": float(rl4["renewal_share"].mean()),
                            "median_rent_res": float(rl4["median_rent_res"].median()),
                            "median_rent_psqft_res": float(rl4["median_rent_psqft_res"].median())} if len(rl4) else None,
        "weekly_sales": _records(ws, {"offplan_share": 3, "median_ppsqft_res": 0, "median_price_res": 0, "sales_value_aed": 0}),
        "weekly_rents": _records(wr, {"renewal_share": 3, "median_rent_res": 0, "median_rent_psqft_res": 1}),
        "params": meta["params"],
    }
    sizes = {"summary.json": _write("summary.json", summary)}

    areas_out = areas.copy()
    heat = areas_out["ppsqft_change_12w"]
    areas_out["signal"] = pd.cut(heat, bins=[-1, -0.05, -0.015, 0.015, 0.05, 10],
                                 labels=["cooling", "softening", "stable", "warming", "heating"]).astype("string")
    areas_out.loc[heat.isna(), "signal"] = "insufficient data"
    sizes["areas.json"] = _write("areas.json", {
        "as_of": meta["tx_last_date"],
        "areas": _records(areas_out, {"value_12w": 0, "offplan_share_12w": 3, "median_ppsqft_12w": 0, "median_price_12w": 0,
                                      "median_ppsqft_prev_12w": 0, "ppsqft_change_12w": 4, "renewal_share_12w": 3,
                                      "median_rent_12w": 0, "median_rent_psqft_12w": 1, "gross_yield_est": 4}),
        "area_month": _records(area_month[area_month["n_bench"] >= meta["params"]["min_cell_n"]],
                               {"median_ppsqft": 0, "p25_ppsqft": 0, "p75_ppsqft": 0, "sales_value_aed": 0}),
    })
    sizes["price_bands.json"] = _write("price_bands.json", {
        "as_of": meta["tx_last_date"], "window_months": meta["params"]["sales_months"], "min_n": meta["params"]["min_cell_n"],
        "bands": _records(bands, {"p10": 0, "p25": 0, "median": 0, "p75": 0, "p90": 0, "median_size_sqft": 0, "median_price": 0}),
    })
    sizes["rent_benchmarks.json"] = _write("rent_benchmarks.json", {
        "as_of": meta["rt_last_date"], "window_months": meta["params"]["rent_months"], "min_n": meta["params"]["min_cell_n"],
        "benchmarks": _records(rents, {"p25": 0, "median": 0, "p75": 0, "median_rent_psqft": 1, "median_size_sqft": 0}),
    })
    sizes["anomalies.json"] = _write("anomalies.json", {
        "as_of": meta["tx_last_date"], "total": int(len(anomalies)),
        "items": _records(anomalies.head(100), {"size_sqft": 0, "price_aed": 0, "price_per_sqft": 0, "cell_median_ppsqft": 0, "deviation_pct": 3}),
    })
    sizes["projects.json"] = _write("projects.json", {"as_of": meta["tx_last_date"],
                                                      "projects": _records(projects.head(150), {"value_aed": 0, "offplan_share": 3, "median_ppsqft": 0})})
    xw_path = MARTS / "community_crosswalk.csv"
    if xw_path.exists():
        xw = pd.read_csv(xw_path)
        sizes["crosswalk.json"] = _write("crosswalk.json", {"as_of": meta["tx_last_date"], "mappings": _records(xw, {"share": 3})})
    if note:
        sizes["market_note.json"] = _write("market_note.json", note)
    if quality:
        sizes["quality.json"] = _write("quality.json", quality)
    if backtest:
        sizes["backtest.json"] = _write("backtest.json", backtest)
    sizes["meta.json"] = _write("meta.json", {"exported_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"), **meta, "file_sizes": sizes})
    log.info("web artefacts: %s", {k: f"{v / 1024:.0f} KB" for k, v in sizes.items()})
    return sizes


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(run())
