"""
discover_store.py
───────────────────
Supabase persistence for discovery_items + a discovery_progress.json
run-history cache (mirrors pipeline.py's progress.json pattern).

sb_post (supabase_client.py) has no upsert support, so this module builds
the on_conflict request directly on top of sb_url / sb_headers — no new
general-purpose Supabase helpers are added.

Required table — see discover.py's module docstring for the CREATE TABLE.

Exposes:
    save_items(items)  -> tuple[int, int]   # (new_count, duplicate_count)
    load_progress()     -> dict
    record_run(scope, query, collected, written, duplicates, errors) -> None
"""

import json
import os
from datetime import datetime, timezone

import requests

from supabase_client import sb_get, sb_headers, sb_url


TABLE = "discovery_items"
_BATCH_SIZE = 200
_PRECHECK_CHUNK = 100

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "output")
PROGRESS_F = os.path.join(OUTPUT_DIR, "discovery_progress.json")


# ── Supabase upsert (built on sb_url / sb_headers — sb_post has no on_conflict) ──

def _sb_upsert(rows: list[dict]) -> list:
    url = sb_url(TABLE) + "?on_conflict=dedup_key"
    headers = sb_headers(represent=True)
    headers["Prefer"] = "resolution=merge-duplicates,return=representation"
    r = requests.post(url, headers=headers, json=rows, timeout=30)
    r.raise_for_status()
    return r.json() if r.text.strip() else []


def _row(item: dict) -> dict:
    return {
        "type":           item["type"],
        "title":          item["title"][:500],
        "description":    (item.get("description") or "")[:2000],
        "source":         item.get("source", ""),
        "url":            item.get("url") or None,
        "published_date": item.get("published_date") or None,
        "score":          item.get("score", 1),
        "topics":         item.get("topics", []),
        "dedup_key":      item["dedup_key"],
        "raw":            item.get("raw", {}),
    }


def save_items(items: list[dict]) -> tuple[int, int]:
    """
    Upsert ranked items into discovery_items by dedup_key (idempotent).
    Returns (new_count, duplicate_count) — determined by pre-checking which
    dedup_keys already exist, since PostgREST's merge-duplicates response
    doesn't distinguish inserts from updates.
    """
    if not items:
        return 0, 0
    rows = [_row(it) for it in items]
    keys = [r["dedup_key"] for r in rows]

    existing_keys: set[str] = set()
    try:
        for i in range(0, len(keys), _PRECHECK_CHUNK):
            chunk = keys[i:i + _PRECHECK_CHUNK]
            quoted = ",".join(f'"{k}"' for k in chunk)
            rows_found = sb_get(TABLE, {"dedup_key": f"in.({quoted})", "select": "dedup_key"})
            existing_keys.update(row["dedup_key"] for row in rows_found)
    except Exception as exc:
        print(f"   ⚠️  Could not pre-check existing dedup_keys: {exc}")

    new_count = sum(1 for k in keys if k not in existing_keys)
    duplicate_count = len(keys) - new_count

    for i in range(0, len(rows), _BATCH_SIZE):
        batch = rows[i:i + _BATCH_SIZE]
        try:
            _sb_upsert(batch)
        except requests.HTTPError as exc:
            print(f"   ❌ Supabase upsert failed for batch {i // _BATCH_SIZE}: {exc}")

    return new_count, duplicate_count


# ── Run-history cache (backend/output/discovery_progress.json) ─────────────

def _load_progress() -> dict:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    if os.path.isfile(PROGRESS_F):
        try:
            with open(PROGRESS_F, encoding="utf-8") as f:
                data = json.load(f)
            data.setdefault("runs", [])
            return data
        except Exception:
            pass
    return {"runs": []}


def _save_progress(prog: dict) -> None:
    with open(PROGRESS_F, "w", encoding="utf-8") as f:
        json.dump(prog, f, indent=2)


def load_progress() -> dict:
    return _load_progress()


def record_run(scope: str, query: str | None, collected: int, written: int,
                duplicates: int, errors: list[str]) -> None:
    prog = _load_progress()
    prog["runs"].append({
        "timestamp":  datetime.now(timezone.utc).isoformat(),
        "scope":      scope,
        "query":      query,
        "collected":  collected,
        "written":    written,
        "duplicates": duplicates,
        "errors":     errors,
    })
    prog["runs"] = prog["runs"][-50:]   # keep last 50 runs
    _save_progress(prog)
