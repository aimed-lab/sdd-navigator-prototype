"""
discover_rank.py
─────────────────
Dedup + 1-5 ranking for items collected by discover_collect.py.

Order of operations (adapted from the Radar reference's dedup/rank passes,
flattened onto plain dicts instead of an Item dataclass):
  1. Group by stable key (DOI > grant# > repo > NCT id > patent id > URL > title hash).
  2. Within a group, keep the highest-quality source.
  3. Fuzzy-merge remaining same-type titles that differ only by punctuation/whitespace.
  4. Score 1-5 = source quality x keyword hits x type-specific signal.

Exposes:
    title_hash(title) -> str
    dedup_key(item)    -> str
    dedupe(items)      -> list[dict]
    rank(items, scope, query=None) -> list[dict]
"""

import hashlib
import re
from difflib import SequenceMatcher
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from discover_collect import BROAD_KEYWORDS_MEDIUM, BROAD_KEYWORDS_STRONG


_WS = re.compile(r"\s+")
_UTM = re.compile(r"^utm_|^ref_|^fbclid$|^gclid$", re.I)


def normalize_title(t: str) -> str:
    if not t:
        return ""
    t = t.lower()
    t = re.sub(r"[^\w\s]", " ", t)
    return _WS.sub(" ", t).strip()


def title_hash(title: str) -> str:
    return hashlib.sha1(normalize_title(title).encode("utf-8")).hexdigest()[:16]


def _canonical_url(url: str) -> str:
    if not url:
        return ""
    try:
        u = urlparse(url.strip())
    except Exception:
        return url
    scheme = (u.scheme or "https").lower()
    netloc = u.netloc.lower()
    if netloc.startswith("www."):
        netloc = netloc[4:]
    q = [(k, v) for k, v in parse_qsl(u.query, keep_blank_values=False) if not _UTM.match(k)]
    q.sort()
    path = u.path.rstrip("/") or "/"
    return urlunparse((scheme, netloc, path, "", urlencode(q), ""))


# ── Dedup key ─────────────────────────────────────────────────────────────────

def dedup_key(item: dict) -> str:
    """Best available stable key — falls back to a title hash."""
    doi = item.get("doi")
    if doi:
        return f"doi:{doi.lower().strip()}"
    grant_no = item.get("grant_opportunity_number")
    if grant_no:
        return f"grant:{grant_no.upper().strip()}"
    repo_full = item.get("repo_full_name")
    if repo_full:
        return f"repo:{repo_full.lower()}"
    nct_id = item.get("nct_id")
    if nct_id:
        return f"trial:{nct_id.upper().strip()}"
    patent_id = item.get("patent_id")
    if patent_id:
        return f"patent:{str(patent_id).strip()}"
    url = item.get("url")
    if url:
        return f"url:{_canonical_url(url)}"
    return f"title:{title_hash(item.get('title', ''))}"


# ── Source quality (used by both dedupe's tie-break and rank()) ────────────

SOURCE_QUALITY = {
    "Nature": 100, "Science": 100, "Cell": 100,
    "Nature Reviews Drug Discovery": 95, "Nature Biotechnology": 95,
    "Nature Machine Intelligence": 92, "PLOS Computational Biology": 80,
    "PubMed": 80, "Europe PMC": 78, "OpenAlex": 70, "Crossref": 70,
    "Semantic Scholar": 65, "biorxiv": 60, "medrxiv": 60, "arXiv": 55,
    "Endpoints News": 80, "STAT Biotech": 80, "Fierce Biotech": 75,
    "BioPharma Dive": 72, "GEN": 65,
    "Grants.gov": 100, "NIH Reporter": 95,
    "GitHub": 70, "ClinicalTrials.gov": 85, "USPTO PatentsView": 75,
}


def _src_rank(source: str) -> int:
    return SOURCE_QUALITY.get(source, 50)


# ── Dedupe ────────────────────────────────────────────────────────────────────

def dedupe(items: list[dict]) -> list[dict]:
    groups: dict[int, list[dict]] = {}
    key_to_group: dict[str, int] = {}
    next_id = 0
    for it in items:
        key = dedup_key(it)
        it["dedup_key"] = key
        gid = key_to_group.get(key)
        if gid is None:
            gid = next_id
            next_id += 1
            groups[gid] = [it]
            key_to_group[key] = gid
        else:
            groups[gid].append(it)

    survivors = []
    for members in groups.values():
        members.sort(key=lambda x: (-_src_rank(x.get("source", "")), -len(x.get("description") or "")))
        survivors.append(members[0])

    # Final fuzzy-title sweep for same-type items that share no structured key.
    survivors.sort(key=lambda x: -_src_rank(x.get("source", "")))
    deduped: list[dict] = []
    for it in survivors:
        nt = normalize_title(it.get("title", ""))
        is_dup = False
        for kept in deduped:
            if kept.get("type") != it.get("type"):
                continue
            nkt = normalize_title(kept.get("title", ""))
            if not nt or not nkt:
                continue
            if SequenceMatcher(None, nt, nkt).ratio() >= 0.93:
                is_dup = True
                break
        if not is_dup:
            deduped.append(it)
    return deduped


# ── Ranking ───────────────────────────────────────────────────────────────────

def _hit_terms(text: str, keywords: list[str]) -> list[str]:
    if not text:
        return []
    t = text.lower()
    return [k for k in keywords if k.lower() in t]


def _clamp(x: int) -> int:
    return max(1, min(5, x))


def _scope_keywords(scope: str, query: str | None) -> tuple[list[str], list[str]]:
    if scope == "broad":
        return BROAD_KEYWORDS_STRONG, BROAD_KEYWORDS_MEDIUM
    tokens = [t.strip() for t in re.split(r"[\s,]+", query or "") if len(t.strip()) >= 3]
    return tokens, []


def _score_paper(item, strong, medium):
    text = f"{item.get('title', '')}. {item.get('description', '')}"
    hits = _hit_terms(text, strong)
    m_hits = _hit_terms(text, medium)
    base = 2
    sq = _src_rank(item.get("source", ""))
    if sq >= 90:
        base += 2
    elif sq >= 75:
        base += 1
    base += min(2, len(hits))
    if m_hits and not hits:
        base += 1
    cited = (item.get("raw") or {}).get("cited_by_count") or 0
    if cited >= 5:
        base += 1
    return _clamp(base), (hits or m_hits)


def _score_news(item, strong, medium):
    text = f"{item.get('title', '')}. {item.get('description', '')}"
    hits = _hit_terms(text, strong)
    m_hits = _hit_terms(text, medium)
    base = 2
    sq = _src_rank(item.get("source", ""))
    if sq >= 80:
        base += 2
    elif sq >= 70:
        base += 1
    base += min(2, len(hits))
    if m_hits and not hits:
        base += 1
    if re.search(r"\b(partnership|series [a-d]|acquisition|FDA|approval|funding round|collaboration)\b",
                 text, re.I):
        base += 1
    return _clamp(base), (hits or m_hits)


def _score_grant(item, strong, medium):
    text = f"{item.get('title', '')} {item.get('description', '')}"
    hits = _hit_terms(text, strong)
    m_hits = _hit_terms(text, medium)
    if not hits and not m_hits:
        # Relevance gate: off-topic/administrative notices never score above the floor.
        return _clamp(2), []
    base = 3
    raw = item.get("raw") or {}
    if (raw.get("agency_code") or "").upper() in {"NIH", "NSF", "DOD", "BARDA"}:
        base += 1
    if hits:
        base += 1
    return _clamp(base), (hits or m_hits)


def _score_repo(item, strong, medium):
    raw = item.get("raw") or {}
    stars = raw.get("stars") or 0
    base = 2
    if stars >= 1000:
        base += 2
    elif stars >= 500:
        base += 1
    text = f"{item.get('title', '')} {item.get('description', '')} {' '.join(raw.get('topics') or [])}"
    hits = _hit_terms(text, strong)
    if hits:
        base += 1
    return _clamp(base), hits


def _score_trial(item, strong, medium):
    text = f"{item.get('title', '')} {item.get('description', '')}"
    hits = _hit_terms(text, strong)
    m_hits = _hit_terms(text, medium)
    base = 2
    if (item.get("raw") or {}).get("status") == "RECRUITING":
        base += 1
    base += min(2, len(hits))
    return _clamp(base), (hits or m_hits)


def _score_patent(item, strong, medium):
    text = f"{item.get('title', '')} {item.get('description', '')}"
    hits = _hit_terms(text, strong)
    m_hits = _hit_terms(text, medium)
    base = 2 + min(2, len(hits))
    return _clamp(base), (hits or m_hits)


_SCORERS = {
    "paper": _score_paper, "preprint": _score_paper,
    "news": _score_news, "grant": _score_grant,
    "repo": _score_repo, "trial": _score_trial, "patent": _score_patent,
}


def rank(items: list[dict], scope: str, query: str | None = None) -> list[dict]:
    strong, medium = _scope_keywords(scope, query)
    out = []
    for it in items:
        scorer = _SCORERS.get(it.get("type"))
        if not scorer:
            continue
        score, topics = scorer(it, strong, medium)
        it["score"] = score
        it["topics"] = list(dict.fromkeys(topics))[:8]
        out.append(it)
    out.sort(key=lambda x: (-x["score"], x.get("type", ""), x.get("title", "")))
    return out
