"""Thin, robust client for the Dubai Land Department open-data gateway.

Facts learned the hard way (and verified 2026-09-28):
* POST JSON to  https://gateway.dubailand.gov.ae/open-data/<command>
* EVERY declared P_* parameter must be present (empty string if unused) — otherwise the
  gateway returns an HTML 500 page. A body of {} returns responseCode 420 INVALID_REQUEST.
* Dates are MM/DD/YYYY. Paging via P_TAKE / P_SKIP; each row carries TOTAL for the window.
* No API key. Be polite: small concurrency, retries with back-off, weekly windows.
"""
from __future__ import annotations

import logging
import time
from datetime import date, timedelta
from typing import Iterator

import requests

from config import COMMAND_PARAMS, GATEWAY, PAGE_SIZE, USER_AGENT, WINDOW_DAYS

log = logging.getLogger("dld")
_session = requests.Session()
_session.headers.update({"Content-Type": "application/json", "Accept": "application/json", "User-Agent": USER_AGENT})


def _mdY(d: date) -> str:
    return d.strftime("%m/%d/%Y")


def _post(command: str, body: dict, retries: int = 4, timeout: int = 120) -> list[dict]:
    url = f"{GATEWAY}/{command}"
    delay = 3.0
    for attempt in range(1, retries + 1):
        try:
            r = _session.post(url, json=body, timeout=timeout)
            if r.status_code == 200:
                try:
                    payload = r.json()
                except ValueError:
                    raise RuntimeError("non-JSON body (a required P_* parameter is probably missing)")
                code = payload.get("responseCode")
                if code not in (None, 200):
                    raise RuntimeError(f"gateway responseCode {code}: {payload.get('validationErrorsList')}")
                return (payload.get("response") or {}).get("result") or []
            if r.status_code in (429, 500, 502, 503, 504):
                raise RuntimeError(f"HTTP {r.status_code}")
            r.raise_for_status()
        except Exception as e:  # noqa: BLE001
            if attempt == retries:
                raise
            log.warning("%s attempt %d failed (%s); retrying in %.0fs", command, attempt, e, delay)
            time.sleep(delay)
            delay *= 2
    return []


def fetch_window(command: str, start: date, end: date, page_size: int = PAGE_SIZE) -> list[dict]:
    """All rows for [start, end] (inclusive), paging until TOTAL is exhausted."""
    params = {p: "" for p in COMMAND_PARAMS[command]}
    params.update({"P_FROM_DATE": _mdY(start), "P_TO_DATE": _mdY(end), "P_TAKE": str(page_size)})
    rows: list[dict] = []
    skip, total = 0, None
    while True:
        params["P_SKIP"] = str(skip)
        page = _post(command, params)
        if not page:
            break
        if total is None:
            total = int(page[0].get("TOTAL") or len(page))
        rows.extend(page)
        skip += len(page)
        if skip >= total or len(page) < page_size:
            break
        time.sleep(0.5)  # be polite between pages
    log.info("%s %s->%s: %d rows (TOTAL %s)", command, start, end, len(rows), total)
    return rows


def iter_windows(start: date, end: date, days: int = WINDOW_DAYS) -> Iterator[tuple[date, date]]:
    cur = start
    while cur <= end:
        nxt = min(cur + timedelta(days=days - 1), end)
        yield cur, nxt
        cur = nxt + timedelta(days=1)


def fetch_range(command: str, start: date, end: date) -> list[dict]:
    out: list[dict] = []
    for a, b in iter_windows(start, end):
        out.extend(fetch_window(command, a, b))
    return out
