"""Clean & standardise raw partitions into analysis-ready tables.

Outputs
  data/clean/transactions.parquet   one row per registered transaction row
  data/clean/rents.parquet          one row per registered Ejari contract (deduplicated)

Rules (documented in docs/methodology.md)
  * sizes in sqm from ACTUAL_AREA (fallback PROCEDURE_AREA); price_per_sqft derived
  * sale flag: procedures Sale / Sell - Pre registration / Delayed Sell (excludes mortgages, grants, lease-to-own)
  * partial-share transfers (procedure area below the unit area) and same-day portfolio blocks are flagged and kept out of benchmarks
  * bulk flags: transactions sharing a TRANSACTION_NUMBER; leases with TOTAL_PROPERTIES > 1
  * robust outlier flag per cell (area x sub-type x off-plan): |modified z| of log(price/sqm) > 3.5
  * rooms normalised to Studio / 1 B/R / 2 B/R / 3 B/R / 4 B/R / 5+ B/R / NA
  * size bands used for rent benchmarks because ROOMS is ~96% null in the rents feed
"""
from __future__ import annotations

import glob
import logging

import numpy as np
import pandas as pd

import crosswalk
from config import CLEAN, MARTS, RAW, SQFT_PER_SQM, PARTIAL_SHARE_MAX_RATIO, PORTFOLIO_MIN_UNITS

log = logging.getLogger("clean")

SALE_PROCEDURES = {"Sale", "Sell - Pre registration", "Delayed Sell", "Sale On Payment Plan"}
SALE_GROUPS = {"sales"}          # GROUP_EN values: Sales / Mortgage / Gifts
SIZE_BANDS = [(0, 40, "<40 sqm"), (40, 60, "40-60"), (60, 85, "60-85"), (85, 120, "85-120"),
              (120, 170, "120-170"), (170, 250, "170-250"), (250, 400, "250-400"), (400, 10_000, "400+")]


def _flag(mask: pd.Series) -> pd.Series:
    """Nullable boolean -> 0/1 int (NA counts as False)."""
    return mask.astype("boolean").fillna(False).astype(int)


def _load(command: str) -> pd.DataFrame:
    files = sorted(glob.glob(str(RAW / command / "*.parquet")))
    if not files:
        raise FileNotFoundError(f"No raw partitions for {command}; run extract first")
    return pd.concat([pd.read_parquet(f) for f in files], ignore_index=True)


def size_band(sqm: pd.Series) -> pd.Series:
    bins = [b[0] for b in SIZE_BANDS] + [SIZE_BANDS[-1][1]]
    labels = [b[2] for b in SIZE_BANDS]
    return pd.cut(sqm, bins=bins, labels=labels, right=False).astype("string")


def normalise_rooms(s: pd.Series) -> pd.Series:
    s = s.astype("string").str.strip()
    out = s.where(s.isin(["Studio", "1 B/R", "2 B/R", "3 B/R", "4 B/R"]), other=pd.NA)
    five_plus = s.str.match(r"^(5|6|7|8|9|\d{2}) B/R$", na=False)
    out = out.mask(five_plus, "5+ B/R")
    return out.fillna("NA")


def robust_outlier_flag(df: pd.DataFrame, value_col: str, group_cols: list[str], thresh: float = 3.5) -> pd.Series:
    x = np.log(df[value_col].where(df[value_col] > 0))
    med = x.groupby([df[c] for c in group_cols]).transform("median")
    mad = (x - med).abs().groupby([df[c] for c in group_cols]).transform("median")
    z = 0.6745 * (x - med) / mad.replace(0, np.nan)
    return (z.abs() > thresh).fillna(False)


def clean_transactions() -> pd.DataFrame:
    df = _load("transactions")
    df = df.rename(columns={
        "TRANSACTION_NUMBER": "transaction_id", "INSTANCE_DATE": "date", "GROUP_EN": "group",
        "PROCEDURE_EN": "procedure", "USAGE_EN": "usage", "AREA_EN": "area", "PROJECT_EN": "project",
        "MASTER_PROJECT_EN": "master_project", "PROP_TYPE_EN": "prop_type", "PROP_SB_TYPE_EN": "sub_type",
        "NEAREST_METRO_EN": "nearest_metro", "NEAREST_MALL_EN": "nearest_mall", "NEAREST_LANDMARK_EN": "nearest_landmark",
        "PARCEL_ID": "parcel_id", "PARKING": "parking"})
    df["date"] = pd.to_datetime(df["date"])
    df["is_offplan"] = _flag(df["IS_OFFPLAN_EN"].astype("string").str.lower() == "off-plan")
    df["is_freehold"] = _flag(df["IS_FREE_HOLD_EN"].astype("string").str.lower() == "free hold")
    df["is_sale"] = _flag(df["procedure"].isin(SALE_PROCEDURES))
    df["is_mortgage"] = _flag(df["group"].astype("string").str.lower().str.startswith("mortgage"))
    df["price_aed"] = pd.to_numeric(df["TRANS_VALUE"], errors="coerce")
    size = pd.to_numeric(df["ACTUAL_AREA"], errors="coerce")
    size = size.where(size > 0, pd.to_numeric(df["PROCEDURE_AREA"], errors="coerce"))
    df["size_sqm"] = size
    df["size_sqft"] = (size * SQFT_PER_SQM).round(1)
    df["price_per_sqm"] = (df["price_aed"] / df["size_sqm"]).where(df["size_sqm"] > 0)
    df["price_per_sqft"] = (df["price_per_sqm"] / SQFT_PER_SQM).round(1)
    df["rooms"] = normalise_rooms(df["ROOMS_EN"])
    df["size_band"] = size_band(df["size_sqm"])
    df["area"] = df["area"].astype("string").str.strip().str.title()
    df["month"] = df["date"].dt.to_period("M").astype(str)
    df["week"] = df["date"].dt.to_period("W-SUN").dt.start_time.dt.strftime("%Y-%m-%d")
    # Bulk deals: several rows under one transaction number (multi-unit / lease-to-own).
    df["is_bulk"] = df.groupby("transaction_id")["transaction_id"].transform("size").gt(1).astype(int)
    # Partial-share transfers: the procedure area is a fraction of the unit (a 50% share, say), so the registered price covers
    # only that fraction and AED/sqft on the full unit is understated. Counted in volumes, excluded from every benchmark.
    proc_area = pd.to_numeric(df["PROCEDURE_AREA"], errors="coerce")
    share = (proc_area / size).where((size > 0) & (proc_area > 0))
    df["is_partial"] = _flag(share.notna() & (share < PARTIAL_SHARE_MAX_RATIO))
    # Portfolio blocks: ten or more ready units in one community registered on the same day at an identical AED/sqft, i.e. a
    # building or portfolio changing hands in one lot and registered unit by unit. Not individual market sales.
    block_key = (df["area"].astype("string") + "|" + df["date"].dt.strftime("%Y-%m-%d") + "|" + df["price_per_sqft"].round(0).astype("string"))
    block_key = block_key.where((df["is_sale"] == 1) & (df["is_offplan"] == 0) & df["price_per_sqft"].notna())
    block_size = block_key.map(block_key.value_counts()).fillna(0)
    df["is_portfolio"] = _flag(block_size >= PORTFOLIO_MIN_UNITS)
    # Residential units: flats and villas that are units or buildings. Land plots share the "Residential" usage label
    # but their AED/sqft is not comparable with built units, so they are kept out of every residential benchmark.
    df["is_land"] = _flag(df["prop_type"].astype("string").str.strip().str.lower() == "land")
    df["is_res_unit"] = _flag((df["is_land"] == 0) & df["sub_type"].astype("string").str.strip().isin(["Flat", "Villa"]))
    # Plausibility for the pricing universe (built-property sales with sensible price and size). Outliers are flagged in finalise().
    plaus = (df["is_sale"] == 1) & (df["is_land"] == 0) & df["price_aed"].between(50_000, 500_000_000) & df["size_sqm"].between(15, 20_000)
    df["is_plausible"] = _flag(plaus)
    cols = ["transaction_id", "date", "month", "week", "group", "procedure", "usage", "area", "project", "master_project",
            "prop_type", "sub_type", "rooms", "size_band", "is_offplan", "is_freehold", "is_sale", "is_mortgage",
            "price_aed", "size_sqm", "size_sqft", "price_per_sqm", "price_per_sqft", "parking", "parcel_id",
            "nearest_metro", "nearest_mall", "nearest_landmark", "is_bulk", "is_partial", "is_portfolio", "is_land", "is_res_unit",
            "is_plausible", "_pulled_at"]
    return df[cols].sort_values("date").reset_index(drop=True)


def clean_rents() -> pd.DataFrame:
    df = _load("rents")
    df = df.rename(columns={
        "VERSION_EN": "version", "REGISTRATION_DATE": "registration_date", "START_DATE": "start_date",
        "END_DATE": "end_date", "TOTAL_PROPERTIES": "n_properties", "USAGE_EN": "usage", "AREA_EN": "area",
        "PROJECT_EN": "project", "MASTER_PROJECT_EN": "master_project", "PROP_TYPE_EN": "prop_type",
        "PROP_SUB_TYPE_EN": "sub_type", "NEAREST_METRO_EN": "nearest_metro", "NEAREST_MALL_EN": "nearest_mall",
        "NEAREST_LANDMARK_EN": "nearest_landmark", "PARKING": "parking"})
    for c in ["registration_date", "start_date", "end_date"]:
        df[c] = pd.to_datetime(df[c], errors="coerce")
    df["is_freehold"] = _flag(df["IS_FREE_HOLD_EN"].astype("string").str.lower() == "free hold")
    df["is_renewal"] = _flag(df["version"].astype("string").str.lower() == "renewed")
    df["annual_rent_aed"] = pd.to_numeric(df["ANNUAL_AMOUNT"], errors="coerce")
    df["contract_amount_aed"] = pd.to_numeric(df["CONTRACT_AMOUNT"], errors="coerce")
    df["n_properties"] = pd.to_numeric(df["n_properties"], errors="coerce").fillna(1).astype(int)
    df["size_sqm"] = pd.to_numeric(df["ACTUAL_AREA"], errors="coerce")
    df["size_sqft"] = (df["size_sqm"] * SQFT_PER_SQM).round(1)
    df["rent_per_sqm"] = (df["annual_rent_aed"] / df["size_sqm"]).where(df["size_sqm"] > 0)
    df["rent_per_sqft"] = (df["rent_per_sqm"] / SQFT_PER_SQM).round(1)
    df["rooms"] = pd.to_numeric(df["ROOMS"], errors="coerce")
    df["size_band"] = size_band(df["size_sqm"])
    df["area"] = df["area"].astype("string").str.strip().str.title()
    df["month"] = df["registration_date"].dt.to_period("M").astype(str)
    df["week"] = df["registration_date"].dt.to_period("W-SUN").dt.start_time.dt.strftime("%Y-%m-%d")
    df["term_months"] = ((df["end_date"] - df["start_date"]).dt.days / 30.44).round(1)
    df["is_bulk"] = (df["n_properties"] > 1).astype(int)
    plaus = (df["usage"].astype("string").str.lower() == "residential") & df["annual_rent_aed"].between(8_000, 5_000_000) \
        & df["size_sqm"].between(15, 5_000) & df["term_months"].between(6, 36)
    df["is_plausible"] = _flag(plaus)
    cols = ["registration_date", "start_date", "end_date", "month", "week", "version", "is_renewal", "usage", "area",
            "project", "master_project", "prop_type", "sub_type", "rooms", "size_band", "is_freehold", "n_properties",
            "annual_rent_aed", "contract_amount_aed", "size_sqm", "size_sqft", "rent_per_sqm", "rent_per_sqft",
            "term_months", "parking", "nearest_metro", "nearest_mall", "nearest_landmark", "is_bulk", "is_plausible",
            "_pulled_at"]
    return df[cols].sort_values("registration_date").reset_index(drop=True)


def _flag_outliers(df: pd.DataFrame, value_col: str, group_cols: list[str]) -> pd.DataFrame:
    """Robust outlier flag within comparable cells, then the single benchmark_eligible flag every mart filters on."""
    excluded = df["is_bulk"] == 1
    for col in ("is_partial", "is_portfolio"):          # transactions only
        if col in df.columns:
            excluded |= df[col] == 1
    df["is_outlier"] = 0
    sub = df[(df["is_plausible"] == 1) & ~excluded]
    if len(sub):
        flag = robust_outlier_flag(sub, value_col, group_cols)
        df.loc[sub.index, "is_outlier"] = flag.astype(int).values
    df["benchmark_eligible"] = _flag((df["is_plausible"] == 1) & (df["is_outlier"] == 0) & ~excluded)
    return df


def finalise(t: pd.DataFrame, r: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Resolve community names across both feeds, then flag outliers within the resolved cells."""
    xw = crosswalk.build(t, r)
    t["district"] = t["area"]
    r["district"] = r["area"]
    t["area"] = crosswalk.apply(t["area"], xw)
    r["area"] = crosswalk.apply(r["area"], xw)
    t = _flag_outliers(t, "price_per_sqm", ["area", "sub_type", "is_offplan"])
    r = _flag_outliers(r, "rent_per_sqm", ["area", "sub_type"])
    return t, r, xw


def run() -> dict:
    CLEAN.mkdir(parents=True, exist_ok=True)
    MARTS.mkdir(parents=True, exist_ok=True)
    t, r, xw = finalise(clean_transactions(), clean_rents())
    t.to_parquet(CLEAN / "transactions.parquet", index=False, compression="zstd")
    r.to_parquet(CLEAN / "rents.parquet", index=False, compression="zstd")
    xw.to_csv(MARTS / "community_crosswalk.csv", index=False)
    matched = t.loc[t["is_sale"] == 1, "area"].isin(set(r["area"])).mean()
    stats = {"transactions": len(t), "sales_benchmark_eligible": int(t["benchmark_eligible"].sum()),
             "rents": len(r), "rents_benchmark_eligible": int(r["benchmark_eligible"].sum()),
             "crosswalk_mappings": len(xw), "sales_with_rent_coverage": round(float(matched), 3)}
    log.info("clean: %s", stats)
    return stats


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print(run())
