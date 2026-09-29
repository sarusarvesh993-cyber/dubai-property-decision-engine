"""Weekly market note: numbers come from the marts (never from the model); the LLM only writes prose.

If no free model is reachable (no keys, rate limits, retired models) a deterministic rules-based note is
written instead, so the product never depends on an LLM being available.
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import pandas as pd

from config import MARTS, RANK_MIN_N, YIELD_BOUNDS

log = logging.getLogger("note")


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


def _pct(x: float | None, digits: int = 1) -> str:
    return "n/a" if x is None or pd.isna(x) else f"{x * 100:+.{digits}f}%"


def _fmt(x: float | None, digits: int = 0) -> str:
    return "n/a" if x is None or pd.isna(x) else f"{x:,.{digits}f}"


def build_facts() -> dict:
    ws = pd.read_parquet(MARTS / "mart_weekly_sales.parquet").sort_values("week")
    wr = pd.read_parquet(MARTS / "mart_weekly_rents.parquet").sort_values("week")
    areas = pd.read_parquet(MARTS / "mart_area_summary.parquet")
    anomalies = pd.read_parquet(MARTS / "mart_anomalies.parquet")
    projects = pd.read_parquet(MARTS / "mart_top_projects.parquet")
    meta = json.loads((MARTS / "_meta.json").read_text(encoding="utf-8"))

    # Drop the current (partial) week when there is history to compare against.
    full = ws.iloc[:-1] if len(ws) > 2 else ws
    last4 = full.tail(4)
    prev4 = full.iloc[-8:-4] if len(full) >= 8 else pd.DataFrame()

    def agg(df: pd.DataFrame) -> dict:
        if df.empty:
            return {}
        return {"sales": int(df["sales"].sum()), "value_aed": float(df["sales_value_aed"].sum()),
                "mortgages": int(df["mortgages"].sum()), "offplan_share": float(df["offplan_share"].mean()),
                "median_ppsqft_res": float(df["median_ppsqft_res"].median())}

    cur, prev = agg(last4), agg(prev4)
    # Same convention as the KPI cards (export_web): drop the current partial week of rent registrations too.
    rl4 = wr.iloc[:-1].tail(4) if len(wr) > 2 else wr
    # Rankings use the same thresholds as the site and the Ask box: RANK_MIN_N sales in both windows for trend,
    # RANK_MIN_N sales and rent contracts of the same type plus a plausibility band for yields.
    lo, hi = YIELD_BOUNDS
    ranked = areas[(areas["n_bench_12w"] >= RANK_MIN_N) & (areas["n_bench_prev_12w"].fillna(0) >= RANK_MIN_N) & areas["ppsqft_change_12w"].notna()]
    ys = areas["n_yield_sales"] if "n_yield_sales" in areas.columns else areas["n_bench_12w"]
    yr = areas["n_yield_rents"] if "n_yield_rents" in areas.columns else areas["n_rent_bench_12w"]
    yieldable = areas[areas["gross_yield_est"].between(lo, hi) & (ys.fillna(0) >= RANK_MIN_N) & (yr.fillna(0) >= RANK_MIN_N)]
    facts = {
        "as_of": meta["tx_last_date"], "coverage_from": meta["tx_first_date"], "weeks_available": int(len(ws)),
        "last4w": cur, "prev4w": prev,
        "delta": {k: (cur[k] / prev[k] - 1) if prev and prev.get(k) else None for k in ("sales", "value_aed", "median_ppsqft_res")},
        "rent_last4w": {"contracts": int(rl4["contracts"].sum()), "renewal_share": float(rl4["renewal_share"].mean()),
                        "median_rent_res": float(rl4["median_rent_res"].median())} if len(rl4) else {},
        "top_areas_by_sales": areas.head(8)[["area", "sales_12w", "median_ppsqft_12w", "ppsqft_change_12w", "gross_yield_est"]]
            .round(3).to_dict("records"),
        "ranking_rule": f"communities with at least {RANK_MIN_N} eligible sales in both 12-week windows; yields also need {RANK_MIN_N} rent contracts of the same property type",
        "heating": ranked.nlargest(5, "ppsqft_change_12w")[["area", "ppsqft_change_12w", "n_bench_12w", "offplan_share_12w"]].round(3).to_dict("records"),
        "cooling": ranked.nsmallest(5, "ppsqft_change_12w")[["area", "ppsqft_change_12w", "n_bench_12w", "offplan_share_12w"]].round(3).to_dict("records"),
        "best_yield": yieldable.nlargest(5, "gross_yield_est")[[c for c in ("area", "gross_yield_est", "yield_sub_type", "median_rent_12w", "median_ppsqft_12w") if c in areas.columns]].round(3).to_dict("records"),
        "anomaly_count_60d": int(len(anomalies)),
        "top_projects": projects.head(5)[["project", "area", "sales", "median_ppsqft"]].round(0).to_dict("records"),
    }
    return _clean(facts)


def rules_note(f: dict) -> str:
    c, p, d = f.get("last4w", {}), f.get("prev4w", {}), f.get("delta", {})
    lines = [f"Dubai residential market note, data to {f['as_of']} (DLD open data, {f['weeks_available']} weeks loaded).", ""]
    if c:
        lines.append(f"Activity: {c['sales']:,} registered sales worth AED {c['value_aed'] / 1e9:,.2f}bn in the last four full weeks"
                     + (f" ({_pct(d.get('sales'))} vs the previous four weeks)." if p else "."))
        lines.append(f"Pricing: median residential price AED {_fmt(c['median_ppsqft_res'])}/sqft"
                     + (f" ({_pct(d.get('median_ppsqft_res'))} vs prior four weeks)." if p else ".")
                     + f" Off-plan share {c['offplan_share'] * 100:.0f}%; {c['mortgages']:,} mortgage registrations.")
    r = f.get("rent_last4w", {})
    if r:
        lines.append(f"Rentals: {r['contracts']:,} Ejari contracts registered, renewals {r['renewal_share'] * 100:.0f}%, "
                     f"median residential rent AED {_fmt(r['median_rent_res'])}/yr.")
    if f.get("heating"):
        lines.append("Heating (12-week median AED/sqft change): " + "; ".join(f"{a['area']} {_pct(a['ppsqft_change_12w'])}" for a in f["heating"]) + ".")
    if f.get("cooling"):
        lines.append("Cooling: " + "; ".join(f"{a['area']} {_pct(a['ppsqft_change_12w'])}" for a in f["cooling"]) + ".")
    if f.get("best_yield"):
        lines.append("Highest estimated gross yields: " + "; ".join(f"{a['area']} {a['gross_yield_est'] * 100:.1f}%" for a in f["best_yield"]) + ".")
    lines.append(f"Anomaly monitor: {f['anomaly_count_60d']:,} residential sales in the last 60 days priced more than 35% away from the median of their comparable cell.")
    lines.append("")
    lines.append("Generated by rules (no LLM call). Figures are computed from registered DLD transactions and Ejari contracts; "
                 "benchmarks exclude bulk deals, partial-share transfers, portfolio blocks, mortgages, gifts and statistical outliers.")
    return "\n".join(lines)


def llm_note(f: dict) -> tuple[str, str] | None:
    try:
        from llm_router import LLMUnavailable, get_router
        router = get_router()
        system = ("You are a property market analyst writing for institutional readers in Dubai. Write a concise weekly market note "
                  "(180-260 words, plain prose, 4 short paragraphs: activity, pricing & off-plan, rentals & yields, watch-list). "
                  "Use ONLY the numbers in the JSON facts; never invent figures; quote AED and percentages exactly; "
                  "mention data caveats in one sentence at the end (registered DLD data, medians, benchmark filters).")
        resp = router.chat([{"role": "system", "content": system},
                            {"role": "user", "content": "FACTS:\n" + json.dumps(f, default=str)}], temperature=0.3, max_tokens=700)
        return resp.text.strip(), resp.label
    except Exception as exc:  # LLMUnavailable or import problems -> caller falls back to rules
        log.warning("LLM note unavailable: %s", exc)
        return None


def run() -> dict:
    facts = build_facts()
    out = llm_note(facts)
    if out:
        text, source = out
    else:
        text, source = rules_note(facts), "rules"
    note = {"generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"), "as_of": facts["as_of"],
            "source": source, "text": text, "facts": facts}
    (MARTS / "market_note.json").write_text(json.dumps(_clean(note), indent=2, default=str, allow_nan=False), encoding="utf-8")
    log.info("market note written (source=%s)", source)
    return note


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(run()["text"])
