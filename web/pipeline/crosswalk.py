"""Community-name resolution between the two DLD feeds.

Problem: the transactions feed labels most sales with the popular community name ("Jumeirah Village Circle",
"Dubai Marina"), while the Ejari rents feed uses the official district name ("Al Barsha South Fourth",
"Marsa Dubai"). Without a crosswalk ~55% of sales cannot be matched to rents (no yields, no rent check).

Solution: entity resolution driven by the data itself. Projects that appear in BOTH feeds link a district
name to a community name; the dominant pairing (weighted by contracts, >= MIN_PROJECTS distinct projects and
>= MIN_SHARE of the district's linked contracts) becomes the mapping. A small seed list of verified,
well-known equivalences guarantees coverage while history is still thin. The result is published as
data/marts/community_crosswalk.csv and web/public/data/crosswalk.json so every mapping is auditable.
"""
from __future__ import annotations

import logging

import pandas as pd

log = logging.getLogger("crosswalk")

MIN_PROJECTS = 3
MIN_SHARE = 0.70

# district name (as used by Ejari / older DLD records) -> community name (as used by the transactions feed).
# Verified against project overlap in the live feeds (Sep 2026) and public DLD district lists.
SEED: dict[str, str] = {
    "Al Barsha South Fourth": "Jumeirah Village Circle",
    "Al Barsha South Fifth": "Jumeirah Village Triangle",
    "Al Barshaa South Third": "Arjan",
    "Al Barshaa South Second": "Dubai Science Park",
    "Marsa Dubai": "Dubai Marina",
    "Al Thanyah Fifth": "Jumeirah Lakes Towers",
    "Al Thanyah First": "Barsha Heights",
    "Al Thanayah Fourth": "Emirate Living",
    "Al Hebiah Fourth": "Dubai Sports City",
    "Al Hebiah Third": "Damac Hills",
    "Al Hebiah Second": "Dubai Studio City",
    "Nadd Hessa": "Silicon Oasis",
    "Me'Aisem First": "Dubai Production City",
    "Al Khairan First": "Dubai Creek Harbour",
    "Hadaeq Sheikh Mohammed Bin Rashid": "Dubai Hills",
    "Al Yelayiss 2": "Town Square",
    "Al Warsan First": "International City Ph 1",
    "Warsan Fourth": "International City Ph 2 & 3",
    "Madinat Al Mataar": "Dubai South",
    "Jabal Ali Industrial Second": "Down Town Jabal Ali",
    "Al Jadaf": "Dubai Healthcare City - Phase 2",
}


def _norm_project(s: pd.Series) -> pd.Series:
    return s.astype("string").str.upper().str.replace(r"[^A-Z0-9]+", " ", regex=True).str.strip()


def derive(t: pd.DataFrame, r: pd.DataFrame) -> pd.DataFrame:
    """Data-driven district -> community pairs from shared project names."""
    tx = t[t["is_sale"] == 1].assign(p=_norm_project(t["project"])).dropna(subset=["p"])
    rt = r.assign(p=_norm_project(r["project"])).dropna(subset=["p"])
    if tx.empty or rt.empty:
        return pd.DataFrame(columns=["district", "community", "projects", "contracts", "share"])
    tp = tx.groupby(["p", "area"]).size().rename("n_t").reset_index()
    rp = rt.groupby(["p", "area"]).size().rename("n_r").reset_index()
    j = tp.merge(rp, on="p", suffixes=("_tx", "_rt"))
    pair = j.groupby(["area_rt", "area_tx"]).agg(projects=("p", "nunique"), contracts=("n_r", "sum")).reset_index()
    pair["share"] = pair["contracts"] / pair.groupby("area_rt")["contracts"].transform("sum")
    best = pair.sort_values(["area_rt", "contracts"], ascending=[True, False]).drop_duplicates("area_rt")
    # a district that the transactions feed itself uses heavily is already canonical -> never remap it
    tx_heavy = set(tx["area"].value_counts().loc[lambda s: s >= 30].index)
    best = best[(best["projects"] >= MIN_PROJECTS) & (best["share"] >= MIN_SHARE)
                & (best["area_rt"] != best["area_tx"]) & (~best["area_rt"].isin(tx_heavy))]
    return best.rename(columns={"area_rt": "district", "area_tx": "community"})[["district", "community", "projects", "contracts", "share"]]


def build(t: pd.DataFrame, r: pd.DataFrame) -> pd.DataFrame:
    derived = derive(t, r)
    derived["method"] = "project-overlap"
    seed = pd.DataFrame({"district": list(SEED.keys()), "community": list(SEED.values())})
    seed["method"] = "verified seed"
    # seed wins on conflicts; derived adds new districts as history grows
    xw = pd.concat([seed, derived[~derived["district"].isin(seed["district"])]], ignore_index=True)
    # annotate seeds with the evidence the data provides (if any)
    ev = derived.set_index("district")[["projects", "contracts", "share"]]
    xw = xw.merge(ev, left_on="district", right_index=True, how="left", suffixes=("", "_ev"))
    for c in ("projects", "contracts", "share"):
        if f"{c}_ev" in xw.columns:
            xw[c] = xw[c].fillna(xw[f"{c}_ev"])
            xw = xw.drop(columns=[f"{c}_ev"])
    # avoid chains (A -> B where B is itself mapped)
    m = dict(zip(xw["district"], xw["community"]))
    xw["community"] = xw["community"].map(lambda c: m.get(c, c))
    log.info("crosswalk: %d mappings (%d seed, %d derived)", len(xw), len(seed), len(xw) - len(seed))
    return xw.sort_values(["method", "district"]).reset_index(drop=True)


def apply(area: pd.Series, xw: pd.DataFrame) -> pd.Series:
    m = dict(zip(xw["district"], xw["community"]))
    return area.map(lambda a: m.get(a, a) if isinstance(a, str) else a).astype("string")
