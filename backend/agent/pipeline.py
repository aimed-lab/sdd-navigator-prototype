"""
pipeline.py
───────────
Main entry point for the SDD Navigator transcription + knowledge-extraction
pipeline.

Usage:
    python agent/pipeline.py          # latest episode only (default)
    python agent/pipeline.py --all    # every episode not yet in Supabase

Flow:
    RSS feed
      └─► transcribe.py  (local Whisper base → backend/output/episode_{N}.json)
            └─► [reads JSON from disk]
                  └─► extract.py  (Groq llama3-70b-8192)
                        └─► Supabase REST API  (raw requests — NO Python client)

Why raw requests?
    supabase-py pulls in httpcore, which is not compatible with Python 3.14+.
    We call the Supabase PostgREST API directly with the requests library instead.
"""

import argparse
import json
import os

import requests
from dotenv import load_dotenv

# ── Load .env before any local imports ───────────────────────────────────────
_ENV_PATH = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(_ENV_PATH)

# ── Local modules ─────────────────────────────────────────────────────────────
from transcribe import transcribe_new_episodes   # noqa: E402
from extract import extract_knowledge             # noqa: E402


# ──────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────

RSS_URL = os.environ.get(
    "RSS_URL",
    "https://anchor.fm/s/103fb6090/podcast/rss",
)


# ──────────────────────────────────────────────
# Supabase REST API helpers  (raw requests, NO Python client)
# ──────────────────────────────────────────────

def _sb_url(table: str) -> str:
    return os.environ["SUPABASE_URL"].rstrip("/") + f"/rest/v1/{table}"


def _sb_headers(*, represent: bool = False) -> dict:
    """
    Build Supabase request headers.
    represent=True adds  Prefer: return=representation
    so that POST returns the inserted row (needed to capture auto-gen IDs).
    """
    key = os.environ["SUPABASE_KEY"]
    h = {
        "apikey":        key,
        "Authorization": f"Bearer {key}",
        "Content-Type":  "application/json",
    }
    if represent:
        h["Prefer"] = "return=representation"
    return h


def _sb_post(table: str, payload: dict | list) -> list:
    """
    POST a row (dict) or multiple rows (list) to a Supabase table.
    Returns the list of inserted rows (with server-generated fields).
    Raises requests.HTTPError on failure.
    """
    r = requests.post(
        _sb_url(table),
        headers=_sb_headers(represent=True),
        json=payload,
        timeout=30,
    )
    r.raise_for_status()
    return r.json() if r.text.strip() else []


# ──────────────────────────────────────────────
# Supabase insert helpers
# ──────────────────────────────────────────────

def _save_wiki_page(metadata: dict, transcript: str, extracted: dict) -> str:
    """Insert into wiki_pages. Returns the new UUID."""
    ep_num         = metadata["episode_number"]
    slug           = extracted.get("slug") or f"episode-{ep_num}"
    concept_titles = [
        c["title"] for c in extracted.get("concepts", []) if c.get("title")
    ]

    row = {
        "slug":           slug,
        "title":          extracted.get("title") or metadata["title"],
        "episode_number": ep_num,
        "transcript":     transcript,
        "concepts":       concept_titles,
        "tags":           extracted.get("tags", []),
    }

    print(f"   📄 Inserting wiki_page  slug='{slug}'")
    result = _sb_post("wiki_pages", row)

    if not result:
        raise RuntimeError("wiki_pages insert returned no data")

    wiki_id = result[0]["id"]
    print(f"   ✅ wiki_page saved  id={wiki_id}")
    return wiki_id


def _save_nodes(nodes_raw: list[dict]) -> dict[str, str]:
    """
    Insert nodes one by one; return {label → uuid} mapping for edge resolution.
    Duplicate labels are skipped (Supabase will raise a 409 / unique violation).
    """
    if not nodes_raw:
        print("   ℹ️  No nodes to insert.")
        return {}

    print(f"   🔵 Inserting {len(nodes_raw)} node(s) …")
    label_to_id: dict[str, str] = {}

    for node in nodes_raw:
        label = (node.get("label") or "").strip()
        if not label:
            continue

        node_type = node.get("type", "concept")
        if node_type not in ("episode", "concept", "resource"):
            node_type = "concept"

        row = {
            "label":       label,
            "type":        node_type,
            "description": node.get("description", ""),
        }
        try:
            result = _sb_post("nodes", row)
            if result:
                label_to_id[label] = result[0]["id"]
                print(f"      ✔ '{label}' ({node_type})")
            else:
                print(f"      ⚠️  '{label}' insert returned no data")
        except requests.HTTPError as exc:
            print(f"      ⚠️  '{label}' skipped: {exc.response.status_code} "
                  f"{exc.response.text[:80]}")
        except Exception as exc:
            print(f"      ⚠️  '{label}' skipped: {exc}")

    print(f"   ✅ {len(label_to_id)} node(s) saved.")
    return label_to_id


def _save_edges(edges_raw: list[dict], label_to_id: dict[str, str]) -> None:
    """Insert edges using the label→uuid map produced by _save_nodes."""
    if not edges_raw:
        print("   ℹ️  No edges to insert.")
        return

    print(f"   🔗 Inserting up to {len(edges_raw)} edge(s) …")
    saved = skipped = 0

    for edge in edges_raw:
        src_label    = (edge.get("source")       or "").strip()
        tgt_label    = (edge.get("target")       or "").strip()
        relationship = (edge.get("relationship") or "related_to").strip()

        src_id = label_to_id.get(src_label)
        tgt_id = label_to_id.get(tgt_label)

        if not src_id or not tgt_id:
            print(f"      ⚠️  Skipped edge — unknown node: "
                  f"'{src_label}' → '{tgt_label}'")
            skipped += 1
            continue

        try:
            _sb_post("edges", {
                "source_id":    src_id,
                "target_id":    tgt_id,
                "relationship": relationship,
            })
            saved += 1
        except Exception as exc:
            print(f"      ⚠️  Edge skipped ({src_label} → {tgt_label}): {exc}")
            skipped += 1

    print(f"   ✅ {saved} edge(s) saved, {skipped} skipped.")


def save_to_supabase(metadata: dict, transcript: str, extracted: dict) -> None:
    """Orchestrate all REST inserts for one episode."""
    ep_num = metadata["episode_number"]
    print(f"\n💾 Saving Episode {ep_num} to Supabase (raw REST API) …")

    _save_wiki_page(metadata, transcript, extracted)
    label_to_id = _save_nodes(extracted.get("nodes", []))
    _save_edges(extracted.get("edges", []), label_to_id)

    print(f"   🎉 Episode {ep_num} fully persisted!\n")


# ──────────────────────────────────────────────
# Pipeline orchestrator
# ──────────────────────────────────────────────

def run_pipeline(all_episodes: bool = False) -> None:
    print()
    print("═" * 70)
    print("  🚀  SDD Navigator — Transcription & Knowledge Extraction Pipeline")
    print("═" * 70)
    print("  🎯  Mode:", "ALL new episodes" if all_episodes
          else "latest episode only  (use --all for everything)")
    print(f"  🔌  Supabase: {os.environ['SUPABASE_URL']}")
    print(f"  📡  RSS:      {RSS_URL}")
    print()

    # ── STEP 1 ── Transcribe → JSON files ────────────────────────────────
    print("─" * 70)
    print("  STEP 1 / 3 — Fetch RSS & Transcribe  (local Whisper base model)")
    print("─" * 70)

    json_paths = transcribe_new_episodes(RSS_URL, latest_only=not all_episodes)

    if not json_paths:
        print("\n✅ No new episodes to process. Pipeline complete.\n")
        return

    print(f"\n✅ Transcription done — {len(json_paths)} JSON file(s) written.\n")

    # ── STEP 2 ── Extract knowledge from each JSON file ───────────────────
    print("─" * 70)
    print(f"  STEP 2 / 3 — Extract Knowledge  ({len(json_paths)} episode(s))")
    print("─" * 70)

    for i, json_path in enumerate(json_paths, 1):
        filename = os.path.basename(json_path)
        print(f"\n  [{i}/{len(json_paths)}] Reading {filename} …")

        with open(json_path, encoding="utf-8") as f:
            data = json.load(f)

        metadata   = data["metadata"]
        transcript = data["transcript"]
        ep_num     = metadata["episode_number"]

        print(f"  Episode {ep_num}: {metadata['title']}")
        print("  " + "·" * 58)

        try:
            extracted = extract_knowledge(transcript, metadata)
        except Exception as exc:
            print(f"\n  ❌ Extraction failed for episode {ep_num}: {exc}")
            continue

        # ── STEP 3 ── Persist via REST API ───────────────────────────────
        print(f"\n  ─ STEP 3 / 3 — Persist Episode {ep_num} ─")
        try:
            save_to_supabase(metadata, transcript, extracted)
        except Exception as exc:
            print(f"\n  ❌ Supabase save failed for episode {ep_num}: {exc}")

    print("═" * 70)
    print("  ✅  Pipeline complete!")
    print("═" * 70)
    print()


# ──────────────────────────────────────────────
# CLI entry point
# ──────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="SDD Navigator — Whisper + Groq transcription pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python agent/pipeline.py          # latest episode only (default)
  python agent/pipeline.py --all    # every episode not yet in Supabase
        """,
    )
    parser.add_argument(
        "--all",
        action="store_true",
        default=False,
        dest="all_episodes",
        help="Process ALL episodes not yet in Supabase (default: latest only)",
    )
    args = parser.parse_args()
    run_pipeline(all_episodes=args.all_episodes)
