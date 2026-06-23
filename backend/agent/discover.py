"""
discover.py
─────────────
Discovery collection engine — backend-only. Collects research signals
(papers, preprints, news, grants, GitHub repos, clinical trials, patents)
either broadly (the full drug-discovery keyword set) or narrowly scoped to
a specific project query (e.g. "PHGDH inhibitors Alzheimer's"). The same
engine serves both the Discovery tab (broad) and, in a later phase, the
Navigator (targeted) — only the scope/query argument changes.

Usage:
    python discover.py --dry-run                                       # broad, no write
    python discover.py --dry-run --query "PHGDH inhibitors Alzheimer's" # targeted, no write
    python discover.py                                                  # broad, writes to Supabase
    python discover.py --query "PHGDH inhibitors Alzheimer's"           # targeted, writes

Flow:
    collect_all(scope, query) -> dedupe() -> rank() -> save_items()
                                                          (skipped on --dry-run)

Required Supabase table (run once in the SQL editor):

    CREATE TABLE IF NOT EXISTS discovery_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        source TEXT NOT NULL,
        url TEXT,
        published_date DATE,
        score SMALLINT NOT NULL DEFAULT 1,
        topics TEXT[] NOT NULL DEFAULT '{}',
        dedup_key TEXT NOT NULL UNIQUE,
        raw JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_discovery_items_type ON discovery_items(type);
    CREATE INDEX IF NOT EXISTS idx_discovery_items_published_date ON discovery_items(published_date DESC);
    CREATE INDEX IF NOT EXISTS idx_discovery_items_score ON discovery_items(score DESC);

NOTE: frontend/app/api/discover/route.ts duplicates a small slice of this
logic (PubMed/NIH/ClinicalTrials/Patents/bioRxiv, no dedup/ranking/persistence)
for the live Discovery tab. Once this engine is wired to a read API backed by
discovery_items, that route should be retired in favor of reading from the table.
"""

import argparse
import os

from dotenv import load_dotenv

_ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(_ENV_PATH)

from discover_collect import collect_all              # noqa: E402
from discover_rank    import dedupe, rank              # noqa: E402
from discover_store   import save_items, record_run    # noqa: E402


def run_discovery(scope: str, query: str | None, dry_run: bool) -> None:
    items, errors = collect_all(scope, query)

    deduped = dedupe(items)
    print(f"\n   After dedupe: {len(deduped)} item(s) (removed {len(items) - len(deduped)} duplicate(s))")

    ranked = rank(deduped, scope, query)

    by_type: dict[str, int] = {}
    for it in ranked:
        by_type[it["type"]] = by_type.get(it["type"], 0) + 1

    print()
    print("─" * 70)
    print(f"  RESULTS — {len(ranked)} item(s)  |  by type: {by_type}")
    print("─" * 70)
    for it in ranked[:30]:
        print(f"  [{it['score']}] ({it['type']:<8}) {it['title'][:80]}")
        print(f"        {it['source']} · {it.get('published_date') or '?'} · {it['url']}")
        if it["topics"]:
            print(f"        topics: {', '.join(it['topics'])}")
    if len(ranked) > 30:
        print(f"  … and {len(ranked) - 30} more")

    if errors:
        print(f"\n  ⚠️  {len(errors)} source error(s):")
        for e in errors:
            print(f"     - {e}")

    if dry_run:
        print("\n  🧪 DRY RUN — nothing written to Supabase.")
        return

    print("\n  💾 Writing to Supabase…")
    written, duplicates = save_items(ranked)
    print(f"   ✅ {written} new, {duplicates} already present (by dedup_key)")
    record_run(scope, query, collected=len(items), written=written,
               duplicates=duplicates, errors=errors)
    print("\n  🏁 Discovery run complete.\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SDD Navigator — Discovery collection engine")
    parser.add_argument(
        "--query", default=None,
        help="Project-specific query (e.g. 'PHGDH inhibitors Alzheimer's'). "
             "If omitted, runs the broad drug-discovery scope.",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Collect + dedupe + rank + print. Do not write to Supabase.",
    )
    args = parser.parse_args()

    scope = "targeted" if args.query else "broad"
    run_discovery(scope, args.query, args.dry_run)
