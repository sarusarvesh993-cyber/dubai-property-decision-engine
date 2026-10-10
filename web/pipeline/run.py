"""Pipeline entry point.

    python pipeline/run.py --mode smoke     # last 14 days, quick local check
    python pipeline/run.py --mode daily     # re-pull last 10 days, rebuild everything (GitHub Actions cron)
    python pipeline/run.py --mode backfill  # everything since 2026-01-01 (first run / repair)
    python pipeline/run.py --mode rebuild   # no download; re-run clean, marts, backtest, quality, note, export
"""
from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import backtest  # noqa: E402
import build_marts  # noqa: E402
import clean  # noqa: E402
import export_web  # noqa: E402
import extract  # noqa: E402
import market_note  # noqa: E402
import quality  # noqa: E402

log = logging.getLogger("run")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", choices=["smoke", "daily", "backfill", "rebuild"], default="daily")
    ap.add_argument("--skip-note", action="store_true", help="skip the LLM/rules market note")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    t0 = time.time()
    steps = []
    if args.mode != "rebuild":
        steps.append(("extract", lambda: extract.run(args.mode)))
    steps += [("clean", clean.run), ("marts", build_marts.run), ("backtest", backtest.run), ("quality", quality.run)]
    if not args.skip_note:
        steps.append(("market_note", market_note.run))
    steps.append(("export_web", export_web.run))
    for name, fn in steps:
        s = time.time()
        fn()
        log.info("step %-12s done in %.1fs", name, time.time() - s)
    log.info("pipeline finished in %.1fs", time.time() - t0)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
