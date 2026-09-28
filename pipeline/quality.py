"""Data-quality checks -> docs/data_quality.md + data/marts/quality.json (published with every refresh)."""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

import pandas as pd

from config import CLEAN, DOCS, MARTS

log = logging.getLogger("quality")


def run() -> dict:
    t = pd.read_parquet(CLEAN / "transactions.parquet")
    r = pd.read_parquet(CLEAN / "rents.parquet")
    checks = []

    def add(name, passed, detail):
        checks.append({"check": name, "status": "PASS" if passed else "WARN", "detail": detail})

    add("Transactions loaded", len(t) > 0, f"{len(t):,} rows, {t['date'].min().date()} to {t['date'].max().date()}")
    add("Rent contracts loaded", len(r) > 0, f"{len(r):,} rows, {r['registration_date'].min().date()} to {r['registration_date'].max().date()}")
    lag_t = max(0, (pd.Timestamp.utcnow().tz_localize(None) - t["date"].max()).days)
    lag_r = max(0, (pd.Timestamp.utcnow().tz_localize(None) - r["registration_date"].max()).days)
    add("Transactions fresh within 3 days", lag_t <= 3, f"latest registration {lag_t} day(s) old")
    add("Rents fresh within 3 days", lag_r <= 3, f"latest registration {lag_r} day(s) old")
    single = t[t["is_bulk"] == 0]
    dup_t = single.duplicated(subset=["transaction_id", "price_aed", "size_sqm", "procedure"]).mean() if len(single) else 0.0
    add("Transaction duplicates < 0.5% (outside multi-unit deals)", dup_t < 0.005,
        f"{dup_t:.2%} duplicate rows on id+price+size+procedure among single-unit transactions")
    land = t.loc[(t["is_sale"] == 1) & (t["benchmark_eligible"] == 1), "is_land"].mean() if "is_land" in t.columns else 0.0
    add("No land plots in the pricing universe", land == 0, f"{land:.2%} of eligible sales are land plots")
    miss_price = t.loc[t["is_sale"] == 1, "price_aed"].isna().mean()
    add("Sale price completeness >= 99%", miss_price < 0.01, f"{miss_price:.2%} sales without price")
    miss_size = t.loc[t["is_sale"] == 1, "size_sqm"].isna().mean()
    add("Sale size completeness >= 95%", miss_size < 0.05, f"{miss_size:.2%} sales without size")
    elig = t.loc[t["is_sale"] == 1, "benchmark_eligible"].mean()
    add("Benchmark-eligible share of sales 60-100%", elig >= 0.6, f"{elig:.1%} of sales eligible after bulk/plausibility/outlier filters")
    out_t = t.loc[t["is_plausible"] == 1, "is_outlier"].mean()
    add("Sales outlier rate < 5%", out_t < 0.05, f"{out_t:.2%} flagged by robust z-score")
    rooms_null = r["rooms"].isna().mean()
    add("Rents ROOMS null (known gateway gap; size bands used instead)", True, f"{rooms_null:.0%} null")
    bulk_r = r["is_bulk"].mean()
    add("Bulk leases share < 15%", bulk_r < 0.15, f"{bulk_r:.1%} of contracts cover >1 property")
    elig_r = r.loc[r["usage"].str.lower() == "residential", "benchmark_eligible"].mean()
    add("Benchmark-eligible share of residential rents >= 60%", elig_r >= 0.6, f"{elig_r:.1%} eligible")
    cover = t.loc[t["is_sale"] == 1, "area"].isin(set(r["area"])).mean()
    add("Sales in communities with rent coverage >= 70% (after crosswalk)", cover >= 0.7, f"{cover:.1%} of sales can be matched to Ejari benchmarks")
    weekly = t[t["is_sale"] == 1].groupby("week").size()
    if len(weekly) >= 5:
        last_full = weekly.iloc[-2]
        med = weekly.iloc[:-1].median()
        add("Weekly volume within 50-200% of median (last full week)", 0.5 * med <= last_full <= 2 * med,
            f"last full week {last_full:,} vs median {med:,.0f}")

    profile = {
        "transactions": {"rows": int(len(t)), "sales": int(t["is_sale"].sum()), "mortgages": int(t["is_mortgage"].sum()),
                          "areas": int(t["area"].nunique()), "projects": int(t["project"].nunique()),
                          "offplan_share_of_sales": float(t.loc[t["is_sale"] == 1, "is_offplan"].mean()),
                          "procedures": t["procedure"].value_counts().head(10).to_dict()},
        "rents": {"rows": int(len(r)), "renewal_share": float(r["is_renewal"].mean()), "areas": int(r["area"].nunique()),
                  "usage": r["usage"].value_counts().head(6).to_dict(), "sub_types": r["sub_type"].value_counts().head(8).to_dict()},
    }
    report = {"generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"), "checks": checks, "profile": profile,
              "warnings": sum(c["status"] == "WARN" for c in checks)}
    (MARTS / "quality.json").write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")

    DOCS.mkdir(parents=True, exist_ok=True)
    md = ["# Data quality report", "", f"_Generated {report['generated_at_utc']}. Regenerated on every pipeline run._", "",
          "| Check | Status | Detail |", "|---|---|---|"]
    md += [f"| {c['check']} | {c['status']} | {c['detail']} |" for c in checks]
    md += ["", "## Profile", "", "```json", json.dumps(profile, indent=2, default=str), "```", "",
           "## Known limitations of the public gateway", "",
           "* Rent contracts are anonymised: no contract/property identifiers, `ROOMS` ~96% null -> benchmarks use size bands.",
           "* Transactions are published from January 2026 onward; earlier history requires the Dubai Pulse bulk files.",
           "* `BUILDING_AGE`, `PROPERTY_ID` are always 0 in the feed and are not used.",
           "* Late registrations: the daily job re-pulls a 10-day window, so recent weeks can be revised upward."]
    (DOCS / "data_quality.md").write_text("\n".join(md), encoding="utf-8")
    log.info("quality: %d checks, %d warnings", len(checks), report["warnings"])
    return report


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    rep = run()
    for c in rep["checks"]:
        print(f"{c['status']:<5} {c['check']}: {c['detail']}")
