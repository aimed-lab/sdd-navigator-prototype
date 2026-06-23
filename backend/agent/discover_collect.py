"""
discover_collect.py
────────────────────
Source collectors for the Discovery engine. Each collector accepts a
(query, scope) pair so the same code path serves two contexts:

    scope="broad"    — the full drug-discovery keyword set (Discovery tab)
    scope="targeted" — a specific project query, e.g. "PHGDH inhibitors
                        Alzheimer's" (Navigator, wired in a later phase)

Collectors return plain dicts (no classes) shaped like:
    {
        "type": "paper"|"preprint"|"news"|"grant"|"repo"|"trial"|"patent",
        "title": str, "description": str, "source": str, "url": str,
        "published_date": "YYYY-MM-DD" | None,
        "doi": str | None,                       # papers/preprints
        "grant_opportunity_number": str | None,   # grants
        "repo_full_name": str | None,              # GitHub repos
        "nct_id": str | None,                      # clinical trials
        "patent_id": str | None,                   # patents
        "raw": dict,                                # source-specific extras
    }

Network calls use _fetch_json / _fetch_text (flat retry-with-backoff
helpers) — for EXTERNAL APIs only, never for Supabase.

Exposes:
    collect_all(scope, query=None) -> tuple[list[dict], list[str]]
"""

import os
import random
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import feedparser
import requests


# ── HTTP helpers (external APIs only) ───────────────────────────────────────

def _fetch_json(url, *, params=None, headers=None, method="GET", json_body=None,
                 retries=3, timeout=20):
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            if method == "POST":
                r = requests.post(url, params=params, headers=headers,
                                   json=json_body, timeout=timeout)
            else:
                r = requests.get(url, params=params, headers=headers, timeout=timeout)
            if r.status_code >= 500 or r.status_code == 429:
                raise requests.HTTPError(f"HTTP {r.status_code}", response=r)
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            last_exc = exc
            if attempt < retries:
                backoff = (1.5 ** attempt) + random.uniform(0, 0.5)
                print(f"      retry {attempt}/{retries} for {url.split('?')[0]}: {exc} "
                      f"(backing off {backoff:.1f}s)")
                time.sleep(backoff)
    raise last_exc


def _fetch_text(url, *, params=None, headers=None, retries=3, timeout=20):
    last_exc = None
    for attempt in range(1, retries + 1):
        try:
            r = requests.get(url, params=params, headers=headers, timeout=timeout)
            if r.status_code >= 500 or r.status_code == 429:
                raise requests.HTTPError(f"HTTP {r.status_code}", response=r)
            r.raise_for_status()
            return r.text
        except Exception as exc:
            last_exc = exc
            if attempt < retries:
                backoff = (1.5 ** attempt) + random.uniform(0, 0.5)
                print(f"      retry {attempt}/{retries} for {url.split('?')[0]}: {exc} "
                      f"(backing off {backoff:.1f}s)")
                time.sleep(backoff)
    raise last_exc


# ── Shared parsing helpers ───────────────────────────────────────────────────

def _clean_html(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", s).strip()


def _maybe_doi(text: str):
    if not text:
        return None
    m = re.search(r"10\.\d{4,9}/[\-._;()/:A-Z0-9]+", text, re.I)
    return m.group(0).rstrip(".,);") if m else None


def _normalize_date(value):
    """Best-effort parse of a source's date string into 'YYYY-MM-DD' or None."""
    if not value:
        return None
    value = str(value).strip()
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z",
                "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(value[: len(fmt) + 6], fmt).date().isoformat()
        except Exception:
            continue
    # PubMed-style "2024 Oct 15" / "2024 Oct"
    m = re.match(r"(\d{4})\s+([A-Za-z]{3})(?:\s+(\d{1,2}))?", value)
    if m:
        try:
            d = datetime.strptime(f"{m.group(2)} {m.group(3) or '1'} {m.group(1)}", "%b %d %Y")
            return d.date().isoformat()
        except Exception:
            pass
    return None


def _parse_feed_date(entry):
    for attr in ("published_parsed", "updated_parsed"):
        v = getattr(entry, attr, None)
        if v:
            try:
                return datetime(*v[:6], tzinfo=timezone.utc).date().isoformat()
            except Exception:
                continue
    return None


def _query_tokens(query: str) -> list[str]:
    return [t.strip().lower() for t in re.split(r"[\s,]+", query or "") if len(t.strip()) >= 4]


def _matches_query(text: str, query: str) -> bool:
    """Targeted-scope relevance filter for sources with no free-text search param."""
    if not query:
        return True
    text_l = (text or "").lower()
    if query.lower().strip() in text_l:
        return True
    tokens = _query_tokens(query)
    return any(t in text_l for t in tokens) if tokens else True


# ── Broad-scope keyword / source config (module constants, not YAML) ───────

BROAD_KEYWORDS_STRONG = [
    "drug discovery", "drug design", "AI drug", "machine learning drug",
    "deep learning drug", "molecular generation", "generative chemistry",
    "protein design", "molecular docking", "virtual screening", "ADMET",
    "QSAR", "retrosynthesis", "de novo drug", "target discovery",
    "foundation model", "protein language model", "AlphaFold", "RoseTTAFold",
    "diffusion model", "geometric deep learning", "graph neural network",
    "cheminformatics", "bioinformatics", "computational chemistry",
    "computational biology", "single-cell", "genomics", "biomedical AI",
    "precision medicine", "translational research",
]

BROAD_KEYWORDS_MEDIUM = [
    "computational", "modeling", "simulation", "molecular dynamics",
    "binding affinity", "pharmacokinetics", "PK/PD", "biologics",
    "antibody design", "CRISPR", "spatial transcriptomics", "multi-omics",
    "clinical AI", "RNA design", "structure-based drug design",
]

BROAD_SEARCH_TEXT = (
    "drug discovery AI OR cheminformatics OR bioinformatics OR "
    "foundation model biology OR protein design OR molecular generation"
)
BROAD_PUBMED_QUERY = (
    '("drug discovery"[tiab] OR "drug design"[tiab] OR "computational chemistry"[tiab] '
    'OR "computational biology"[tiab] OR "machine learning"[tiab] OR "deep learning"[tiab] '
    'OR "artificial intelligence"[tiab] OR "protein design"[tiab] OR cheminformatics[tiab] '
    'OR bioinformatics[tiab] OR "foundation model"[tiab])'
)
BROAD_EUROPE_PMC_QUERY = (
    '(("drug discovery" OR "drug design" OR cheminformatics OR bioinformatics OR '
    '"protein design" OR "foundation model" OR "machine learning"))'
)
BROAD_CROSSREF_QUERY = "AI drug discovery OR molecular generation OR protein design OR cheminformatics"
BROAD_S2_QUERY = "AI drug discovery foundation models molecular generation protein design"
BROAD_CLINICALTRIALS_TERM = "drug discovery AI OR cheminformatics OR computational drug design"
BROAD_PATENT_QUERY = "drug discovery artificial intelligence"
BROAD_NIH_REPORTER_TERMS = "drug discovery artificial intelligence machine learning"
BROAD_ARXIV_CATEGORIES = ["q-bio", "cs.LG", "cs.AI", "cs.CE", "stat.ML"]

BROAD_GRANTS_KEYWORDS = [
    "drug discovery", "therapeutic", "artificial intelligence",
    "machine learning", "bioinformatics", "computational biology",
    "computational chemistry", "biomedical data science",
    "precision medicine", "translational research", "small molecule",
    "biologics", "target discovery", "clinical AI",
]

BROAD_GITHUB_TOPICS = [
    "drug-discovery", "bioinformatics", "cheminformatics", "molecular-docking",
    "virtual-screening", "protein-design", "generative-chemistry",
    "molecular-generation", "diffusion-models", "graph-neural-networks",
    "alphafold", "genomics", "rdkit", "deepchem", "retrosynthesis",
]
BROAD_GITHUB_QUERIES = [
    '"drug discovery" stars:>=100',
    '"bioinformatics" stars:>=500',
    '"protein design" stars:>=100',
    '"molecular docking" stars:>=100',
    '"generative chemistry" OR "molecular generation" stars:>=100',
    '"ADMET" OR "QSAR" stars:>=100',
]

JOURNAL_RSS_FEEDS = [
    {"name": "Nature", "url": "https://www.nature.com/nature.rss"},
    {"name": "Nature Reviews Drug Discovery", "url": "https://www.nature.com/nrd.rss"},
    {"name": "Nature Biotechnology", "url": "https://www.nature.com/nbt.rss"},
    {"name": "Nature Machine Intelligence", "url": "https://www.nature.com/natmachintell.rss"},
    {"name": "Science", "url": "https://www.science.org/rss/news_current.xml"},
    {"name": "Cell", "url": "https://www.cell.com/cell/current.rss"},
    {"name": "PLOS Computational Biology", "url": "https://journals.plos.org/ploscompbiol/feed/atom"},
]

NEWS_RSS_FEEDS = [
    {"name": "Fierce Biotech", "url": "https://www.fiercebiotech.com/rss/xml", "quality": 4},
    {"name": "Endpoints News", "url": "https://endpts.com/feed/", "quality": 5},
    {"name": "STAT Biotech", "url": "https://www.statnews.com/category/biotech/feed/", "quality": 5},
    {"name": "BioPharma Dive", "url": "https://www.biopharmadive.com/feeds/news/", "quality": 4},
    {"name": "GEN", "url": "https://www.genengnews.com/feed/", "quality": 4},
]


# ── Papers / preprints ───────────────────────────────────────────────────────

def fetch_journal_rss(name: str, url: str, query, scope) -> list[dict]:
    items = []
    try:
        text = _fetch_text(url)
    except Exception as exc:
        print(f"   ⚠️  {name} RSS failed: {exc}")
        return items
    feed = feedparser.parse(text)
    for entry in feed.entries[:30]:
        title = (entry.get("title") or "").strip()
        link = entry.get("link") or ""
        if not title or not link:
            continue
        summary = _clean_html(entry.get("summary") or entry.get("description") or "")[:500]
        if scope == "targeted" and not _matches_query(f"{title} {summary}", query):
            continue
        doi = _maybe_doi(entry.get("id", "")) or _maybe_doi(link) or _maybe_doi(summary)
        items.append({
            "type": "paper", "title": title, "description": summary, "source": name,
            "url": link, "published_date": _parse_feed_date(entry), "doi": doi,
            "raw": {"via": "rss"},
        })
    return items


def fetch_pubmed(query, scope) -> list[dict]:
    out = []
    q = BROAD_PUBMED_QUERY if scope == "broad" else f"({query})"
    params = {"db": "pubmed", "term": q, "retmode": "json", "retmax": 50, "sort": "date"}
    try:
        es = _fetch_json("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi", params=params)
    except Exception as exc:
        print(f"   ⚠️  PubMed esearch failed: {exc}")
        return out
    ids = ((es.get("esearchresult") or {}).get("idlist")) or []
    if not ids:
        return out
    time.sleep(0.34)  # NCBI asks for <=3 req/s without an API key
    try:
        summary = _fetch_json(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi",
            params={"db": "pubmed", "id": ",".join(ids), "retmode": "json"},
        )
    except Exception as exc:
        print(f"   ⚠️  PubMed esummary failed: {exc}")
        return out
    res = summary.get("result") or {}
    for pmid in ids:
        rec = res.get(pmid) or {}
        title = (rec.get("title") or "").strip()
        if not title:
            continue
        doi = None
        for aid in (rec.get("articleids") or []):
            if (aid.get("idtype") or "").lower() == "doi":
                doi = aid.get("value")
                break
        out.append({
            "type": "paper", "title": title,
            "description": f"Published in {rec.get('fulljournalname') or rec.get('source') or 'a journal'}.",
            "source": "PubMed", "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
            "published_date": _normalize_date(rec.get("pubdate") or rec.get("epubdate")),
            "doi": doi,
            "raw": {"pmid": pmid, "journal": rec.get("fulljournalname")},
        })
    return out


def fetch_europe_pmc(query, scope) -> list[dict]:
    out = []
    q = BROAD_EUROPE_PMC_QUERY if scope == "broad" else f"({query})"
    params = {"query": q, "format": "json", "pageSize": 50, "resultType": "lite", "sort": "P_PDATE_D desc"}
    try:
        data = _fetch_json("https://www.ebi.ac.uk/europepmc/webservices/rest/search", params=params)
    except Exception as exc:
        print(f"   ⚠️  Europe PMC failed: {exc}")
        return out
    for rec in (((data.get("resultList") or {}).get("result")) or []):
        title = (rec.get("title") or "").strip()
        if not title:
            continue
        out.append({
            "type": "paper", "title": title,
            "description": (rec.get("abstractText") or "")[:500],
            "source": "Europe PMC", "url": f"https://europepmc.org/article/{rec.get('source', 'MED')}/{rec.get('id')}",
            "published_date": _normalize_date(rec.get("firstPublicationDate")), "doi": rec.get("doi"),
            "raw": {"pmid": rec.get("pmid"), "journal": rec.get("journalTitle")},
        })
    return out


def fetch_openalex(query, scope) -> list[dict]:
    out = []
    search = BROAD_SEARCH_TEXT if scope == "broad" else query
    params = {"search": search, "per-page": 50, "sort": "publication_date:desc"}
    try:
        data = _fetch_json("https://api.openalex.org/works", params=params)
    except Exception as exc:
        print(f"   ⚠️  OpenAlex failed: {exc}")
        return out
    for w in data.get("results") or []:
        title = (w.get("title") or "").strip()
        if not title:
            continue
        doi = (w.get("doi") or "").replace("https://doi.org/", "") or None
        url_ = w.get("doi") or ((w.get("primary_location") or {}).get("landing_page_url")) or w.get("id")
        out.append({
            "type": "paper", "title": title, "description": "",
            "source": "OpenAlex", "url": url_,
            "published_date": _normalize_date(w.get("publication_date")), "doi": doi,
            "raw": {
                "venue": ((w.get("primary_location") or {}).get("source") or {}).get("display_name"),
                "cited_by_count": w.get("cited_by_count"),
            },
        })
    return out


def fetch_crossref(query, scope) -> list[dict]:
    out = []
    q = BROAD_CROSSREF_QUERY if scope == "broad" else query
    params = {"query": q, "rows": 50, "sort": "published", "order": "desc"}
    try:
        data = _fetch_json("https://api.crossref.org/works", params=params)
    except Exception as exc:
        print(f"   ⚠️  Crossref failed: {exc}")
        return out
    for w in ((data.get("message") or {}).get("items") or []):
        title_list = w.get("title") or []
        title = (title_list[0] if title_list else "").strip()
        if not title:
            continue
        doi = w.get("DOI")
        url_ = w.get("URL") or (f"https://doi.org/{doi}" if doi else "")
        published = None
        try:
            parts = (w.get("issued") or {}).get("date-parts", [[None]])[0]
            if parts and parts[0]:
                y = parts[0]
                m = parts[1] if len(parts) > 1 else 1
                d = parts[2] if len(parts) > 2 else 1
                published = f"{y:04d}-{m:02d}-{d:02d}"
        except Exception:
            pass
        out.append({
            "type": "paper", "title": title,
            "description": (w.get("abstract") or "")[:500],
            "source": "Crossref", "url": url_,
            "published_date": published, "doi": doi,
            "raw": {"venue": (w.get("container-title") or [None])[0]},
        })
    return out


def fetch_semantic_scholar(query, scope) -> list[dict]:
    out = []
    q = BROAD_S2_QUERY if scope == "broad" else query
    params = {"query": q, "limit": 50, "fields": "title,abstract,url,publicationDate,externalIds,venue"}
    headers = {}
    api_key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY")
    if api_key:
        headers["x-api-key"] = api_key
    try:
        data = _fetch_json("https://api.semanticscholar.org/graph/v1/paper/search",
                            params=params, headers=headers or None)
    except Exception as exc:
        print(f"   ⚠️  Semantic Scholar failed: {exc}")
        return out
    for r in data.get("data") or []:
        title = (r.get("title") or "").strip()
        if not title:
            continue
        doi = (r.get("externalIds") or {}).get("DOI")
        url_ = r.get("url") or (f"https://doi.org/{doi}" if doi else "")
        out.append({
            "type": "paper", "title": title,
            "description": (r.get("abstract") or "")[:500],
            "source": "Semantic Scholar", "url": url_,
            "published_date": _normalize_date(r.get("publicationDate")), "doi": doi,
            "raw": {"venue": r.get("venue")},
        })
    return out


def _fetch_rxiv(server: str, query, scope, days: int = 14) -> list[dict]:
    out = []
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=days)
    url = f"https://api.biorxiv.org/details/{server}/{start.isoformat()}/{end.isoformat()}/0"
    try:
        data = _fetch_json(url)
    except Exception as exc:
        print(f"   ⚠️  {server} failed: {exc}")
        return out
    for entry in (data.get("collection") or []):
        title = (entry.get("title") or "").strip()
        doi = entry.get("doi")
        if not title or not doi:
            continue
        abstract = (entry.get("abstract") or "")[:500]
        if scope == "targeted" and not _matches_query(f"{title} {abstract}", query):
            continue
        out.append({
            "type": "preprint", "title": title, "description": abstract,
            "source": server,
            "url": f"https://www.{server}.org/content/{doi}v{entry.get('version', '1')}",
            "published_date": _normalize_date(entry.get("date")), "doi": doi,
            "raw": {"category": entry.get("category")},
        })
    return out


def fetch_biorxiv(query, scope) -> list[dict]:
    return _fetch_rxiv("biorxiv", query, scope)


def fetch_medrxiv(query, scope) -> list[dict]:
    return _fetch_rxiv("medrxiv", query, scope)


def fetch_arxiv(query, scope) -> list[dict]:
    out = []
    cats_q = " OR ".join(f"cat:{c}" for c in BROAD_ARXIV_CATEGORIES)
    search_query = f"({cats_q})" if scope == "broad" else f'all:"{query}"'
    params = {
        "search_query": search_query, "start": 0, "max_results": 50,
        "sortBy": "submittedDate", "sortOrder": "descending",
    }
    url = "http://export.arxiv.org/api/query?" + urlencode(params)
    try:
        text = _fetch_text(url)
    except Exception as exc:
        print(f"   ⚠️  arXiv failed: {exc}")
        return out
    feed = feedparser.parse(text)
    for e in feed.entries:
        title = re.sub(r"\s+", " ", (e.get("title") or "").strip().replace("\n", " "))
        link = e.get("link") or ""
        if not title or not link:
            continue
        out.append({
            "type": "preprint", "title": title,
            "description": _clean_html(e.get("summary") or "")[:500],
            "source": "arXiv", "url": link,
            "published_date": _parse_feed_date(e), "doi": None,
            "raw": {"categories": [t.get("term") for t in e.get("tags", []) if t.get("term")]},
        })
    return out


def collect_papers(query, scope) -> list[dict]:
    items = []
    for feed in JOURNAL_RSS_FEEDS:
        items.extend(fetch_journal_rss(feed["name"], feed["url"], query, scope))
    items.extend(fetch_pubmed(query, scope))
    items.extend(fetch_europe_pmc(query, scope))
    items.extend(fetch_openalex(query, scope))
    items.extend(fetch_crossref(query, scope))
    items.extend(fetch_semantic_scholar(query, scope))
    items.extend(fetch_biorxiv(query, scope))
    items.extend(fetch_medrxiv(query, scope))
    items.extend(fetch_arxiv(query, scope))
    return items


# ── News ─────────────────────────────────────────────────────────────────────

def fetch_news_rss(name: str, url: str, quality: int, query, scope) -> list[dict]:
    out = []
    try:
        text = _fetch_text(url)
    except Exception as exc:
        print(f"   ⚠️  {name} RSS failed: {exc}")
        return out
    feed = feedparser.parse(text)
    for entry in feed.entries[:30]:
        title = (entry.get("title") or "").strip()
        link = entry.get("link") or ""
        if not title or not link:
            continue
        summary = _clean_html(entry.get("summary") or entry.get("description") or "")[:500]
        if scope == "targeted" and not _matches_query(f"{title} {summary}", query):
            continue
        out.append({
            "type": "news", "title": title, "description": summary,
            "source": name, "url": link,
            "published_date": _parse_feed_date(entry), "doi": None,
            "raw": {"quality": quality},
        })
    return out


def collect_news(query, scope) -> list[dict]:
    items = []
    for feed in NEWS_RSS_FEEDS:
        items.extend(fetch_news_rss(feed["name"], feed["url"], feed["quality"], query, scope))
    return items


# ── Grants (Grants.gov + NIH Reporter) ──────────────────────────────────────

def fetch_grants_gov(keyword: str) -> list[dict]:
    out = []
    body = {"keyword": keyword, "oppStatuses": "forecasted|posted", "rows": 50}
    try:
        data = _fetch_json("https://api.grants.gov/v1/api/search2", method="POST", json_body=body)
    except Exception as exc:
        print(f"   ⚠️  Grants.gov keyword={keyword!r} failed: {exc}")
        return out
    hits = ((data.get("data") or {}).get("oppHits")) or []
    for h in hits:
        title = (h.get("title") or "").strip()
        opp_no = (h.get("number") or "").strip() or None
        if not title or not opp_no:
            continue
        opp_id = h.get("id")
        out.append({
            "type": "grant", "title": title,
            "description": f"{h.get('agencyCode', '?')} — {h.get('agency', '')}",
            "source": "Grants.gov",
            "url": f"https://www.grants.gov/search-results-detail/{opp_id}" if opp_id else "https://www.grants.gov/",
            "published_date": _normalize_date(h.get("openDate") or h.get("postedDate")),
            "grant_opportunity_number": opp_no,
            "raw": {"agency_code": h.get("agencyCode"), "close_date": h.get("closeDate"), "matched_keyword": keyword},
        })
    return out


def fetch_nih_reporter(terms: str) -> list[dict]:
    out = []
    body = {"criteria": {"terms": terms}, "limit": 25, "sort_field": "project_start_date", "sort_order": "desc"}
    try:
        data = _fetch_json("https://api.reporter.nih.gov/v2/projects/search", method="POST", json_body=body)
    except Exception as exc:
        print(f"   ⚠️  NIH Reporter failed: {exc}")
        return out
    for p in data.get("results") or []:
        title = (p.get("project_title") or "").strip()
        if not title:
            continue
        appl_id = p.get("appl_id")
        out.append({
            "type": "grant", "title": title,
            "description": (p.get("abstract_text") or "").replace("<", " <")[:500],
            "source": "NIH Reporter",
            "url": f"https://reporter.nih.gov/project-details/{appl_id}" if appl_id else "https://reporter.nih.gov/",
            "published_date": _normalize_date(p.get("project_start_date")),
            "grant_opportunity_number": None,
            "raw": {"award_amount": p.get("award_amount"), "appl_id": appl_id},
        })
    return out


def collect_grants(query, scope) -> list[dict]:
    items = []
    keywords = BROAD_GRANTS_KEYWORDS if scope == "broad" else [query]
    for kw in keywords:
        items.extend(fetch_grants_gov(kw))
    terms = BROAD_NIH_REPORTER_TERMS if scope == "broad" else query
    items.extend(fetch_nih_reporter(terms))
    return items


# ── GitHub repos ─────────────────────────────────────────────────────────────

def fetch_github_search(q: str) -> list[dict]:
    out = []
    headers = {"Accept": "application/vnd.github+json"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    params = {"q": q, "sort": "stars", "order": "desc", "per_page": 20}
    try:
        data = _fetch_json("https://api.github.com/search/repositories", params=params, headers=headers)
    except Exception as exc:
        print(f"   ⚠️  GitHub search {q!r} failed: {exc}")
        return out
    for r in data.get("items") or []:
        full = r.get("full_name") or ""
        out.append({
            "type": "repo", "title": full,
            "description": (r.get("description") or "")[:500],
            "source": "GitHub", "url": r.get("html_url") or f"https://github.com/{full}",
            "published_date": _normalize_date(r.get("pushed_at")),
            "repo_full_name": full,
            "raw": {"stars": r.get("stargazers_count", 0), "language": r.get("language"),
                    "topics": r.get("topics", [])},
        })
    return out


def collect_github(query, scope) -> list[dict]:
    items = []
    if scope == "broad":
        queries = [f"topic:{t} stars:>=50" for t in BROAD_GITHUB_TOPICS] + list(BROAD_GITHUB_QUERIES)
    else:
        queries = [f'"{query}" stars:>=5']
    for i, q in enumerate(queries):
        items.extend(fetch_github_search(q))
        if i < len(queries) - 1:
            time.sleep(2.0)  # stay under GitHub's 30/min authenticated search limit
    return items


# ── Clinical trials ──────────────────────────────────────────────────────────

def collect_trials(query, scope) -> list[dict]:
    out = []
    term = BROAD_CLINICALTRIALS_TERM if scope == "broad" else query
    params = {"query.term": term, "pageSize": 30, "sort": "LastUpdatePostDate:desc"}
    try:
        data = _fetch_json("https://clinicaltrials.gov/api/v2/studies", params=params)
    except Exception as exc:
        print(f"   ⚠️  ClinicalTrials.gov failed: {exc}")
        return out
    for s in data.get("studies") or []:
        proto = s.get("protocolSection") or {}
        ident = proto.get("identificationModule") or {}
        status = proto.get("statusModule") or {}
        desc = proto.get("descriptionModule") or {}
        nct_id = ident.get("nctId") or ""
        title = ident.get("briefTitle") or ""
        if not title or not nct_id:
            continue
        out.append({
            "type": "trial", "title": title,
            "description": (desc.get("briefSummary") or "")[:500],
            "source": "ClinicalTrials.gov", "url": f"https://clinicaltrials.gov/study/{nct_id}",
            "published_date": _normalize_date((status.get("startDateStruct") or {}).get("date")),
            "nct_id": nct_id,
            "raw": {"status": status.get("overallStatus")},
        })
    return out


# ── Patents (USPTO PatentsView) ──────────────────────────────────────────────
#
# Requires a free PatentsView API key (https://patentsview.org/apis/keyrequest)
# in PATENTSVIEW_API_KEY — the collector skips itself (not a hard failure) when
# the key is absent. The query/response shape below follows the documented
# PatentSearch API (search.patentsview.org/api/v1/patent/) as of this writing;
# flagged as unverified since it hasn't been exercised against a live key.

PATENTSVIEW_URL = "https://search.patentsview.org/api/v1/patent/"


def collect_patents(query, scope) -> list[dict]:
    out = []
    api_key = os.environ.get("PATENTSVIEW_API_KEY")
    if not api_key:
        print("   ⚠️  PATENTSVIEW_API_KEY not set — skipping patents collector")
        return out
    text = BROAD_PATENT_QUERY if scope == "broad" else query
    import json as _json
    q = _json.dumps({"_text_any": {"patent_title": text}})
    f = _json.dumps(["patent_id", "patent_title", "patent_date", "patent_abstract"])
    o = _json.dumps({"size": 25, "sort": [{"patent_date": "desc"}]})
    params = {"q": q, "f": f, "o": o}
    headers = {"X-Api-Key": api_key}
    try:
        data = _fetch_json(PATENTSVIEW_URL, params=params, headers=headers)
    except Exception as exc:
        print(f"   ⚠️  PatentsView failed: {exc}")
        return out
    for p in data.get("patents") or []:
        title = (p.get("patent_title") or "").strip()
        patent_id = p.get("patent_id")
        if not title or not patent_id:
            continue
        out.append({
            "type": "patent", "title": title,
            "description": (p.get("patent_abstract") or "")[:500],
            "source": "USPTO PatentsView",
            "url": f"https://patents.google.com/patent/US{patent_id}",
            "published_date": _normalize_date(p.get("patent_date")),
            "patent_id": str(patent_id),
            "raw": {},
        })
    return out


# ── Orchestrator ─────────────────────────────────────────────────────────────

def collect_all(scope: str, query: str | None = None) -> tuple[list[dict], list[str]]:
    """
    Fan out across independent source categories with per-source isolation —
    one bad collector/category never blocks the others.

    scope="broad"    -> query is ignored; every collector uses the BROAD_*
                        keyword constants.
    scope="targeted" -> query is required and passed through to every
                        collector (each adapts it to that source's search API,
                        or filters post-hoc for sources with no query param).
    """
    if scope not in ("broad", "targeted"):
        raise ValueError("scope must be 'broad' or 'targeted'")
    if scope == "targeted" and not (query or "").strip():
        raise ValueError("targeted scope requires a non-empty query")

    print()
    print("=" * 70)
    label = f"scope=broad" if scope == "broad" else f"scope=targeted  query={query!r}"
    print(f"  DISCOVERY ENGINE — {label}")
    print("=" * 70)

    tasks = {
        "papers":  lambda: collect_papers(query, scope),
        "news":    lambda: collect_news(query, scope),
        "grants":  lambda: collect_grants(query, scope),
        "github":  lambda: collect_github(query, scope),
        "trials":  lambda: collect_trials(query, scope),
        "patents": lambda: collect_patents(query, scope),
    }

    all_items: list[dict] = []
    errors: list[str] = []
    with ThreadPoolExecutor(max_workers=6) as ex:
        futures = {ex.submit(fn): name for name, fn in tasks.items()}
        for fut in as_completed(futures):
            name = futures[fut]
            try:
                items = fut.result()
                all_items.extend(items)
                print(f"   [{name}] {len(items)} item(s)")
            except Exception as exc:
                errors.append(f"{name}: {exc}")
                print(f"   ❌ [{name}] failed: {exc}")

    print(f"\n   TOTAL collected: {len(all_items)} item(s), {len(errors)} source error(s)")
    return all_items, errors
