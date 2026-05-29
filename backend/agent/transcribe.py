"""
transcribe.py
─────────────
RSS → audio download → local Whisper transcription → episode JSON.

Exposes:
    get_processed_numbers(supabase_url, supabase_key) -> set[int]
    parse_rss(rss_url)                                -> list[dict]
    transcribe_episode(episode, output_dir, model)    -> str  (json path)
"""

import json
import os
import re
import tempfile

import feedparser
import requests
import whisper


# ── Supabase helper ────────────────────────────────────────────────────────────

def get_processed_numbers(supabase_url: str, supabase_key: str) -> set[int]:
    """Return episode_numbers already stored in wiki_pages."""
    try:
        r = requests.get(
            supabase_url.rstrip("/") + "/rest/v1/wiki_pages",
            headers={"apikey": supabase_key, "Authorization": f"Bearer {supabase_key}"},
            params={"select": "episode_number", "limit": "10000"},
            timeout=30,
        )
        r.raise_for_status()
        return {row["episode_number"] for row in r.json() if row.get("episode_number")}
    except Exception as exc:
        print(f"   ⚠️  Could not query Supabase: {exc}")
        return set()


# ── RSS parsing ────────────────────────────────────────────────────────────────

def _episode_number(entry, index: int, total: int) -> int:
    """
    Three-strategy episode number extraction:
      1. <itunes:episode> tag
      2. Regex in title  ("Episode 42", "Ep 7", "#3", etc.)
      3. Positional fallback — reverse feed order (newest = highest)
    """
    raw = getattr(entry, "itunes_episode", None)
    if raw:
        try:
            return int(raw)
        except (ValueError, TypeError):
            pass

    m = re.search(r"\b[Ee]p(?:isode)?\s*\.?\s*#?\s*(\d+)\b", entry.get("title", ""))
    if m:
        return int(m.group(1))

    return total - index


def parse_rss(rss_url: str) -> list[dict]:
    """
    Parse RSS feed; return list of episode dicts sorted by episode_number asc.
    Each dict: episode_number, title, audio_url, episode_url, description.
    """
    print(f"📡 Parsing RSS feed…")
    print(f"   {rss_url}")
    feed = feedparser.parse(rss_url)
    if feed.bozo:
        print(f"   ⚠️  RSS parse warning: {feed.bozo_exception}")

    total = len(feed.entries)
    print(f"   Feed: '{feed.feed.get('title', 'Unknown')}' — {total} entries")

    episodes = []
    for i, entry in enumerate(feed.entries):
        # Audio URL
        audio_url = ""
        for enc in getattr(entry, "enclosures", []):
            href = enc.get("href") or enc.get("url", "")
            if href and ("audio" in enc.get("type", "") or href.endswith(".mp3")):
                audio_url = href
                break
        if not audio_url:
            for lnk in getattr(entry, "links", []):
                if lnk.get("href", "").endswith(".mp3"):
                    audio_url = lnk["href"]
                    break
        if not audio_url:
            continue

        # Web page URL (non-audio link)
        episode_url = ""
        for lnk in getattr(entry, "links", []):
            href = lnk.get("href", "")
            mime = lnk.get("type", "")
            if "audio" in mime or href.endswith(".mp3"):
                continue
            if href.startswith("http"):
                episode_url = href
                break
        if not episode_url:
            episode_url = getattr(entry, "link", "")

        episodes.append({
            "episode_number": _episode_number(entry, i, total),
            "title":          entry.get("title", f"Episode {total - i}").strip(),
            "audio_url":      audio_url,
            "episode_url":    episode_url,
            "description":    entry.get("summary", ""),
            "published":      entry.get("published", ""),
        })

    episodes.sort(key=lambda e: e["episode_number"])
    print(f"   ✅ {len(episodes)} episodes with audio found.\n")
    return episodes


# ── Download + Whisper ─────────────────────────────────────────────────────────

def _download(url: str, dest: str) -> None:
    print(f"   ⬇️  Downloading audio…")
    with requests.get(url, stream=True, timeout=300) as r:
        r.raise_for_status()
        total_bytes = 0
        with open(dest, "wb") as f:
            for chunk in r.iter_content(65_536):
                f.write(chunk)
                total_bytes += len(chunk)
    print(f"   ✅ Downloaded {total_bytes / 1_048_576:.1f} MB")


def _transcribe_audio(path: str, model) -> str:
    print(f"   🎙️  Transcribing with Whisper base…")
    result = model.transcribe(path, fp16=False, verbose=False)
    text = result["text"].strip()
    print(f"   ✅ Transcript: {len(text.split()):,} words")
    return text


# ── Public API ─────────────────────────────────────────────────────────────────

def load_whisper_model():
    """Load Whisper base model once (downloads ~140 MB on first run)."""
    print("🧠 Loading Whisper base model…")
    model = whisper.load_model("base")
    print("   ✅ Whisper ready.\n")
    return model


def transcribe_episode(episode: dict, output_dir: str, model) -> str:
    """
    Download + transcribe one episode.
    Returns path to the saved episode_N.json file.
    Raises on unrecoverable error.

    If episode_N.json already exists (cached), skips download/transcription.
    """
    ep_num   = episode["episode_number"]
    out_path = os.path.join(output_dir, f"episode_{ep_num}.json")

    if os.path.isfile(out_path):
        print(f"   📂 Cached transcript found — skipping download")
        return out_path

    tmp_fd, tmp_path = tempfile.mkstemp(suffix=".mp3")
    os.close(tmp_fd)
    try:
        _download(episode["audio_url"], tmp_path)
        transcript = _transcribe_audio(tmp_path, model)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    os.makedirs(output_dir, exist_ok=True)
    payload = {
        "metadata": {
            "episode_number": ep_num,
            "title":          episode["title"],
            "audio_url":      episode["audio_url"],
            "episode_url":    episode["episode_url"],
            "description":    episode["description"],
            "published":      episode.get("published", ""),
        },
        "transcript": transcript,
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    print(f"   💾 Saved → episode_{ep_num}.json")
    return out_path
