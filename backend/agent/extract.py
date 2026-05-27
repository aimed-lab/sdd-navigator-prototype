"""
extract.py
──────────
Sends a transcript to Groq (llama-3.3-70b-versatile) and extracts structured
research knowledge as a validated JSON object.
"""

import json
import os
import re

from groq import Groq


# ──────────────────────────────────────────────
# Prompt
# ──────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are a research knowledge extractor.
Given a podcast transcript, extract and return
ONLY a JSON object with this exact structure:
{
  "title": "string",
  "episode_number": 0,
  "slug": "url-friendly-title",
  "summary": "2-3 sentence summary of the episode.",
  "concepts": [
    {
      "title": "Concept Name",
      "bullets": ["point one", "point two", "point three"]
    }
  ],
  "tags": ["tag1", "tag2"],
  "entities": {
    "drugs": ["string"],
    "proteins": ["string"],
    "targets": ["string"],
    "tools": ["string"]
  },
  "nodes": [
    {"label": "string", "type": "episode|concept|resource", "description": "string"}
  ],
  "edges": [
    {"source": "label of source node", "target": "label of target node", "relationship": "string"}
  ]
}

Rules:
- Return ONLY the raw JSON object — no markdown fences, no explanation.
- Every field must be present even if its value is an empty array.
- "slug" must be lowercase, hyphen-separated, no special chars (e.g. "digital-twins-in-oncology").
- "type" in nodes must be exactly one of: episode, concept, resource.
- "source" and "target" in edges must exactly match a "label" in the nodes array.
- Extract at least 5 concepts and 10 nodes when the transcript is long enough.
"""


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

# Groq's context window for llama-3.3-70b-versatile.
# Keep user message well under that; ~6 000 tokens ≈ 24 000 chars.
_MAX_TRANSCRIPT_CHARS = 24_000


def _trim_transcript(transcript: str) -> tuple[str, bool]:
    """Return (possibly-trimmed transcript, was_trimmed)."""
    if len(transcript) <= _MAX_TRANSCRIPT_CHARS:
        return transcript, False
    # Trim to last sentence boundary within the limit
    trimmed = transcript[:_MAX_TRANSCRIPT_CHARS]
    last_dot = trimmed.rfind(".")
    if last_dot > _MAX_TRANSCRIPT_CHARS * 0.8:
        trimmed = trimmed[: last_dot + 1]
    return trimmed + "\n\n[— transcript trimmed for length —]", True


def _extract_json(raw: str) -> str:
    """
    Pull the first {...} block from the response, tolerating markdown
    code fences that some models insert despite instructions.
    """
    # Strip ```json ... ``` fences
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if fenced:
        return fenced.group(1)

    # Bare JSON object
    bare = re.search(r"\{.*\}", raw, re.DOTALL)
    if bare:
        return bare.group(0)

    raise ValueError("No JSON object found in Groq response.")


def _validate(data: dict, metadata: dict) -> dict:
    """
    Fill in any missing top-level keys with safe defaults so the caller
    never has to guard against KeyError.
    """
    ep_num = metadata.get("episode_number", 0)
    title = metadata.get("title", f"Episode {ep_num}")

    defaults = {
        "title": title,
        "episode_number": ep_num,
        "slug": re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-"),
        "summary": "",
        "concepts": [],
        "tags": [],
        "entities": {"drugs": [], "proteins": [], "targets": [], "tools": []},
        "nodes": [],
        "edges": [],
    }
    for key, val in defaults.items():
        data.setdefault(key, val)

    # Ensure episode_number is int
    try:
        data["episode_number"] = int(data["episode_number"])
    except (ValueError, TypeError):
        data["episode_number"] = ep_num

    return data


# ──────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────

def extract_knowledge(transcript: str, metadata: dict) -> dict:
    """
    Send transcript + metadata to Groq and return structured knowledge JSON.

    Args:
        transcript: Full plain-text transcript.
        metadata:   Dict with at least episode_number and title.

    Returns:
        Validated dict matching the extraction schema.
    """
    client = Groq(api_key=os.environ["GROQ_API_KEY"])

    ep_num = metadata.get("episode_number", "?")
    title = metadata.get("title", "")

    print(f"   🤖 Sending transcript to Groq (llama-3.3-70b-versatile) …")

    trimmed, was_trimmed = _trim_transcript(transcript)
    if was_trimmed:
        print(
            f"   ✂️  Transcript trimmed: {len(transcript):,} → {len(trimmed):,} chars"
        )

    user_message = (
        f"Episode Title: {title}\n"
        f"Episode Number: {ep_num}\n\n"
        f"TRANSCRIPT:\n{trimmed}"
    )

    print(f"   📤 Prompt size: {len(user_message):,} chars")

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0.1,      # Low temperature → more deterministic JSON
        max_tokens=4_096,
    )

    raw = response.choices[0].message.content.strip()
    usage = response.usage
    print(
        f"   ✅ Groq response — "
        f"in:{usage.prompt_tokens} / out:{usage.completion_tokens} tokens"
    )

    # Parse
    try:
        json_str = _extract_json(raw)
        data = json.loads(json_str)
    except (ValueError, json.JSONDecodeError) as exc:
        print(f"   ❌ JSON parse error: {exc}")
        print(f"   ─── Raw response (first 800 chars) ───")
        print(raw[:800])
        print(f"   ──────────────────────────────────────")
        raise

    data = _validate(data, metadata)

    # Summary stats
    print(
        f"   📊 Extracted: "
        f"{len(data['concepts'])} concepts · "
        f"{len(data['tags'])} tags · "
        f"{len(data['nodes'])} nodes · "
        f"{len(data['edges'])} edges"
    )
    return data
