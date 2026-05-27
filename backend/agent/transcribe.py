"""
transcribe.py
─────────────
Fetches RSS feed, identifies NEW episodes (not already in Supabase),
downloads each MP3, transcribes with LOCAL OpenAI Whisper (base model),
and saves results to backend/output/episode_{N}.json.

NO supabase Python client used anywhere — Supabase is queried via raw
REST API (requests library only) to avoid httpcore / Python 3.14 issues.
"""

import json
import os
import re
import tempfile

import feedparser
import requests
import whisper


# ──────────────────────────────────────────────
# Output directory
# ──────────────────────────────────────────────

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "output")


def _ensure_output_dir() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)


# ──────────────────────────────────────────────
# Supabase REST helpers  (raw requests, no client)
# ──────────────────────────────────────────────

def _sb_headers() -> dict:
    key = os.environ["SUPABASE_KEY"]
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


def _get_existing_episode_numbers() -> set:
    """
    Query Supabase REST API for episode_numbers already in wiki_pages.
    Returns an empty set on any network/auth error so the pipeline can
    still continue (may attempt a duplicate insert, which Supabase will
    reject via the unique constraint on slug).
    """
    base = os.environ["SUPABASE_URL"].rstrip("/")
    url  = f"{base}/rest/v1/wiki_pages"

    try:
        r = requests.get(
            url,
            headers=_sb_headers(),
            params={"select": "episode_number"},
            timeout=30,
        )
        r.raise_for_status()
        rows = r.json()
        numbers = {
            row["episode_number"]
            for row in rows
            if row.get("episode_number") is not None
        }
        print(f"📦 {len(numbers)} episode(s) already in Supabase: "
              f"{sorted(numbers) or 'none'}")
        return numbers

    except Exception as exc:
        print(f"⚠️  Could not fetch existing episodes from Supabase: {exc}")
        print("   Continuing without skip-check.")
        return set()


# ──────────────────────────────────────────────
# RSS parsing
# ──────────────────────────────────────────────

def _parse_episode_number(entry, index: int, total: int) -> int:
    """
    Three-strategy episode-number extraction:
      1. <itunes:episode> tag
      2. Regex in title  ("Episode 42", "Ep.7", "#3" …)
      3. Fallback: reverse position in feed (newest = highest)
    """
    # 1 — iTunes metadata
    raw = getattr(entry, "itunes_episode", None)
    if raw:
        try:
            return int(raw)
        except (ValueError, TypeError):
            pass

    # 2 — Title regex
    m = re.search(r"\b[Ee]p(?:isode)?\s*\.?\s*#?(\d+)\b", entry.title)
    if m:
        return int(m.group(1))

    # 3 — Positional fallback
    return total - index


def parse_rss(rss_url: str) -> list[dict]:
    """Parse the RSS feed; return list of episode dicts sorted by episode_number asc."""
    print(f"\n📡 Fetching RSS feed …")
    print(f"   URL: {rss_url}")

    feed = feedparser.parse(rss_url)
    if feed.bozo:
        print(f"   ⚠️  RSS parse warning: {feed.bozo_exception}")

    total = len(feed.entries)
    print(f"   ✅ Feed: '{feed.feed.get('title', 'Unknown')}' — {total} entries\n")

    episodes = []
    for i, entry in enumerate(feed.entries):
        # Find audio enclosure
        audio_url = None
        for enc in getattr(entry, "enclosures", []):
            href = enc.get("href") or enc.get("url", "")
            if href and ("audio" in enc.get("type", "") or href.endswith(".mp3")):
                audio_url = href
                break

        # Fallback: any .mp3 link
        if not audio_url:
            for link in getattr(entry, "links", []):
                if link.get("href", "").endswith(".mp3"):
                    audio_url = link["href"]
                    break

        if not audio_url:
            print(f"   ⚠️  No audio URL for '{entry.title}'. Skipping.")
            continue

        episodes.append({
            "episode_number": _parse_episode_number(entry, i, total),
            "title":          entry.title.strip(),
            "audio_url":      audio_url,
            "description":    entry.get("summary", ""),
            "published":      entry.get("published", ""),
        })

    episodes.sort(key=lambda e: e["episode_number"])
    print(f"   📋 {len(episodes)} episodes with audio URLs found.")
    return episodes


# ──────────────────────────────────────────────
# Download + Whisper transcription
# ──────────────────────────────────────────────

def _download_audio(url: str, dest_path: str) -> None:
    print(f"   ⬇️  Downloading audio …")
    print(f"      {url}")
    with requests.get(url, stream=True, timeout=300) as r:
        r.raise_for_status()
        downloaded = 0
        with open(dest_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=65_536):
                f.write(chunk)
                downloaded += len(chunk)
    print(f"   ✅ Download complete — {downloaded / 1_048_576:.1f} MB")


def _transcribe(audio_path: str, model) -> str:
    """Run LOCAL Whisper base model on the audio file (CPU, no API call)."""
    print(f"   🎤 Transcribing with local Whisper base model …")
    result = model.transcribe(audio_path, fp16=False, verbose=False)
    text   = result["text"].strip()
    print(f"   ✅ Done — {len(text.split()):,} words / {len(text):,} chars")
    return text


# ──────────────────────────────────────────────
# JSON output
# ──────────────────────────────────────────────

def _save_episode_json(metadata: dict, transcript: str) -> str:
    """
    Save {metadata, transcript} to backend/output/episode_{N}.json.
    Returns the absolute file path.
    """
    _ensure_output_dir()
    ep_num   = metadata["episode_number"]
    out_path = os.path.join(OUTPUT_DIR, f"episode_{ep_num}.json")
    payload  = {"metadata": metadata, "transcript": transcript}

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)

    print(f"   💾 Saved → {out_path}")
    return out_path


# ──────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────

def transcribe_new_episodes(rss_url: str, latest_only: bool = True) -> list[str]:
    """
    Main entry point.

    Args:
        rss_url:     Podcast RSS feed URL.
        latest_only: True  → only the single most-recent episode (default).
                     False → every episode not yet in Supabase.

    Returns:
        List of paths to the written episode_{N}.json files.
    """
    existing_eps = _get_existing_episode_numbers()
    all_eps      = parse_rss(rss_url)

    if not all_eps:
        print("⚠️  RSS feed returned no usable episodes.")
        return []

    if latest_only:
        # all_eps is sorted ascending → last element = highest episode number
        candidates = [all_eps[-1]]
        print(f"🎯 Mode: latest only — Episode {candidates[0]['episode_number']}")
    else:
        candidates = all_eps
        print(f"🎯 Mode: all episodes — {len(candidates)} candidate(s)")

    to_process = []
    for ep in candidates:
        ep_num = ep["episode_number"]
        if ep_num in existing_eps:
            print(f"⏭️  Episode {ep_num} already in Supabase — skipping.")
            continue
        to_process.append(ep)

    if not to_process:
        print("\n✅ Nothing new to transcribe.")
        return []

    print(f"\n🔊 {len(to_process)} episode(s) queued for transcription.")
    print("🧠 Loading local Whisper base model "
          "(first run downloads weights ~140 MB) …")
    model = whisper.load_model("base")
    print("✅ Whisper model ready.\n")

    output_paths: list[str] = []
    for ep in to_process:
        ep_num = ep["episode_number"]
        print(f"\n{'━' * 60}")
        print(f"  🎙️  Episode {ep_num}: {ep['title']}")
        print(f"{'━' * 60}")

        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".mp3")
        os.close(tmp_fd)

        try:
            _download_audio(ep["audio_url"], tmp_path)
            transcript = _transcribe(tmp_path, model)
            json_path  = _save_episode_json(ep, transcript)
            output_paths.append(json_path)
        except Exception as exc:
            print(f"   ❌ Episode {ep_num} failed: {exc}")
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                print(f"   🗑️  Temp file removed.")

    return output_paths
