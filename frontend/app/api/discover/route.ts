import { NextRequest, NextResponse } from "next/server";

export type DiscoverItem = {
  id: string;
  type: "paper" | "grant" | "trial" | "tool";
  title: string;
  description: string;
  source: string;
  date: string;
  dateISO: string;
  url: string;
  tags: string[];
  relevance: number; // 1-5
};

type RawDiscoverItem = Omit<DiscoverItem, "relevance">;

const DEFAULT_QUERY = "drug discovery AI";
const FETCH_TIMEOUT_MS = 8000;
const PER_SOURCE_CAP = 6;

// ── Date helpers ────────────────────────────────────────────────────────────────

function toISO(dateStr: string): string {
  if (!dateStr) return new Date(0).toISOString();
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString();
  // PubMed-style "2024 Oct" or "2024 Oct 15"
  const m = /(\d{4})\s+([A-Za-z]{3})(?:\s+(\d{1,2}))?/.exec(dateStr);
  if (m) {
    const parsed = new Date(`${m[2]} ${m[3] ?? "1"} ${m[1]}`);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date(0).toISOString();
}

function fmtDate(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return "Recent";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Dedupe + relevance scoring ───────────────────────────────────────────────────

function dedupeKey(item: RawDiscoverItem): string {
  const doiMatch = /doi\.org\/(.+)$/i.exec(item.url);
  if (doiMatch) return `doi:${doiMatch[1].toLowerCase()}`;
  try {
    const u = new URL(item.url);
    return `url:${(u.hostname + u.pathname).toLowerCase()}`;
  } catch {
    return `title:${item.title.trim().toLowerCase()}`;
  }
}

// Simple heuristic: keyword overlap with the query bumps the score, very recent
// items get a small boost, very old ones get a small penalty. Kept intentionally
// simple per spec rather than a full relevance model.
function scoreRelevance(item: RawDiscoverItem, queryTerms: string[]): number {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const matched = queryTerms.filter((t) => t.length > 2 && text.includes(t)).length;
  let score = 2 + Math.min(matched, 2);

  const ageDays = (Date.now() - new Date(item.dateISO).getTime()) / 86_400_000;
  if (ageDays >= 0 && ageDays <= 30) score += 1;
  else if (ageDays > 365 * 2) score -= 1;

  return Math.max(1, Math.min(5, Math.round(score)));
}

// ── Source fetchers ───────────────────────────────────────────────────────────
// Fast + reliable only — PubMed, OpenAlex, Crossref, Grants.gov, ClinicalTrials.gov,
// GitHub. Slower/blockable sources (Semantic Scholar, news RSS, bioRxiv, patents)
// stay on the Python collection engine (backend/agent/discover_collect.py) for the
// scheduled digest — they're skipped here so they never delay the live page.

async function fetchPubMed(term: string): Promise<RawDiscoverItem[]> {
  const searchUrl =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi" +
    `?db=pubmed&term=${encodeURIComponent(term)}&retmax=${PER_SOURCE_CAP}&sort=date&retmode=json`;
  const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!searchRes.ok) throw new Error(`PubMed esearch ${searchRes.status}`);
  const searchData = (await searchRes.json()) as { esearchresult?: { idlist?: string[] } };
  const ids = searchData.esearchresult?.idlist ?? [];
  if (!ids.length) return [];

  const summaryUrl =
    `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi` +
    `?db=pubmed&id=${ids.join(",")}&retmode=json`;
  const summaryRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!summaryRes.ok) throw new Error(`PubMed esummary ${summaryRes.status}`);
  const summaryData = (await summaryRes.json()) as {
    result?: Record<string, { title?: string; source?: string; pubdate?: string; authors?: { name: string }[] }>;
  };
  const result = summaryData.result ?? {};

  return ids
    .filter((id) => (result[id]?.title ?? "").trim().length > 0)
    .map((id) => {
      const item = result[id];
      const isoDate = toISO(item.pubdate ?? "");
      const authorStr =
        (item.authors ?? []).slice(0, 2).map((a) => a.name).join(", ") +
        ((item.authors?.length ?? 0) > 2 ? " et al." : "");

      return {
        id: `pubmed-${id}`,
        type: "paper" as const,
        title: item.title!,
        description: `Published in ${item.source ?? "Unknown Journal"}. ${authorStr}`.trim(),
        source: item.source ?? "PubMed",
        date: fmtDate(isoDate),
        dateISO: isoDate,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        tags: ["Paper", "PubMed"],
      };
    });
}

async function fetchOpenAlex(term: string): Promise<RawDiscoverItem[]> {
  const url =
    `https://api.openalex.org/works?search=${encodeURIComponent(term)}` +
    `&per-page=${PER_SOURCE_CAP}&sort=publication_date:desc`;
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
  const data = (await res.json()) as {
    results?: {
      title?: string;
      doi?: string;
      id?: string;
      publication_date?: string;
      primary_location?: { landing_page_url?: string; source?: { display_name?: string } };
      authorships?: { author?: { display_name?: string } }[];
    }[];
  };

  return (data.results ?? [])
    .filter((w) => w.title)
    .map((w) => {
      const isoDate = toISO(w.publication_date ?? "");
      const venue = w.primary_location?.source?.display_name;
      const authors = (w.authorships ?? [])
        .slice(0, 2)
        .map((a) => a.author?.display_name)
        .filter(Boolean)
        .join(", ");
      const desc = [
        venue ? `Published in ${venue}.` : "Indexed in OpenAlex.",
        authors ? `${authors}${(w.authorships?.length ?? 0) > 2 ? " et al." : ""}` : "",
      ].filter(Boolean).join(" ");

      return {
        id: `openalex-${(w.id ?? Math.random().toString()).split("/").pop()}`,
        type: "paper" as const,
        title: w.title!,
        description: desc,
        source: "OpenAlex",
        date: fmtDate(isoDate),
        dateISO: isoDate,
        url: w.doi ?? w.primary_location?.landing_page_url ?? w.id ?? "https://openalex.org",
        tags: ["Paper", "OpenAlex"],
      };
    });
}

async function fetchCrossref(term: string): Promise<RawDiscoverItem[]> {
  const url =
    `https://api.crossref.org/works?query=${encodeURIComponent(term)}` +
    `&rows=${PER_SOURCE_CAP}&sort=published&order=desc`;
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Crossref ${res.status}`);
  const data = (await res.json()) as {
    message?: {
      items?: {
        title?: string[];
        DOI?: string;
        URL?: string;
        "container-title"?: string[];
        issued?: { "date-parts"?: number[][] };
      }[];
    };
  };

  return (data.message?.items ?? [])
    .filter((w) => (w.title ?? [])[0])
    .map((w) => {
      const parts = w.issued?.["date-parts"]?.[0] ?? [];
      const isoDate = parts.length
        ? toISO(`${parts[0]}-${String(parts[1] ?? 1).padStart(2, "0")}-${String(parts[2] ?? 1).padStart(2, "0")}`)
        : toISO("");
      const venue = (w["container-title"] ?? [])[0];
      return {
        id: `crossref-${(w.DOI ?? Math.random().toString()).replace(/\//g, "-")}`,
        type: "paper" as const,
        title: w.title![0],
        description: venue ? `Published in ${venue}.` : "Indexed in Crossref.",
        source: "Crossref",
        date: fmtDate(isoDate),
        dateISO: isoDate,
        url: w.URL ?? (w.DOI ? `https://doi.org/${w.DOI}` : "https://search.crossref.org"),
        tags: ["Paper", "Crossref"],
      };
    });
}

async function fetchGrantsGov(term: string): Promise<RawDiscoverItem[]> {
  const res = await fetch("https://api.grants.gov/v1/api/search2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword: term, oppStatuses: "forecasted|posted", rows: PER_SOURCE_CAP }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Grants.gov ${res.status}`);
  const data = (await res.json()) as {
    data?: {
      oppHits?: {
        id?: string | number;
        title?: string;
        number?: string;
        agencyCode?: string;
        agency?: string;
        openDate?: string;
        postedDate?: string;
      }[];
    };
  };

  return (data.data?.oppHits ?? [])
    .filter((h) => h.title && h.number)
    .map((h) => {
      const isoDate = toISO(h.openDate ?? h.postedDate ?? "");
      return {
        id: `grantsgov-${h.id ?? h.number}`,
        type: "grant" as const,
        title: h.title!,
        description: `${h.agencyCode ?? "?"} — ${h.agency ?? ""}`.trim(),
        source: "Grants.gov",
        date: fmtDate(isoDate),
        dateISO: isoDate,
        url: h.id ? `https://www.grants.gov/search-results-detail/${h.id}` : "https://www.grants.gov/",
        tags: ["Grant", "Grants.gov"],
      };
    });
}

async function fetchClinicalTrials(term: string): Promise<RawDiscoverItem[]> {
  const url =
    "https://clinicaltrials.gov/api/v2/studies" +
    `?query.term=${encodeURIComponent(term)}&pageSize=${PER_SOURCE_CAP}&sort=LastUpdatePostDate:desc`;
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`ClinicalTrials.gov ${res.status}`);
  const data = (await res.json()) as {
    studies?: {
      protocolSection?: {
        identificationModule?: { nctId?: string; briefTitle?: string };
        statusModule?: { startDateStruct?: { date?: string }; overallStatus?: string };
        descriptionModule?: { briefSummary?: string };
      };
    }[];
  };

  return (data.studies ?? [])
    .map((s) => {
      const proto = s.protocolSection ?? {};
      const ident = proto.identificationModule ?? {};
      const status = proto.statusModule ?? {};
      const desc = proto.descriptionModule ?? {};
      const nctId = ident.nctId ?? "";
      const isoDate = toISO(status.startDateStruct?.date ?? "");
      return {
        id: `ct-${nctId}`,
        type: "trial" as const,
        title: ident.briefTitle ?? "Clinical Trial",
        description:
          (desc.briefSummary ?? "").slice(0, 220) ||
          `${status.overallStatus ?? "Active"} clinical trial.`,
        source: "ClinicalTrials.gov",
        date: fmtDate(isoDate),
        dateISO: isoDate,
        url: `https://clinicaltrials.gov/study/${nctId}`,
        tags: ["Trial", status.overallStatus ?? "Clinical Trial"],
      };
    })
    .filter((i) => i.id !== "ct-");
}

async function fetchGitHubTools(term: string): Promise<RawDiscoverItem[]> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const q = `${term} stars:>=5`;
  const url =
    `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}` +
    `&sort=stars&order=desc&per_page=${PER_SOURCE_CAP}`;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`GitHub search ${res.status}`);
  const data = (await res.json()) as {
    items?: {
      full_name?: string;
      description?: string;
      html_url?: string;
      pushed_at?: string;
      stargazers_count?: number;
      language?: string | null;
      topics?: string[];
    }[];
  };

  return (data.items ?? [])
    .filter((r) => r.full_name)
    .map((r) => {
      const isoDate = toISO(r.pushed_at ?? "");
      const tags = ["Tool", ...(r.language ? [r.language] : []), ...(r.topics ?? []).slice(0, 2)];
      return {
        id: `github-${r.full_name}`,
        type: "tool" as const,
        title: r.full_name!,
        description: r.description || "Open-source tool on GitHub.",
        source: `GitHub${r.stargazers_count ? ` · ${r.stargazers_count}★` : ""}`,
        date: fmtDate(isoDate),
        dateISO: isoDate,
        url: r.html_url ?? `https://github.com/${r.full_name}`,
        tags,
      };
    });
}

// ── Short-lived scope cache ──────────────────────────────────────────────────
//
// A module-scoped Map, in-process — deliberately not a database table or
// external cache service. It's a comfort window over the live fetch, not a
// source of truth: a redeploy or serverless cold start just means the next
// request repopulates it, which is fine since the live fetch is still the
// fallback. Keyed by the resolved scope (the interest/search term actually
// used, or the general default for anonymous users), so each scope gets its
// own cached feed independent of who's asking.
const DISCOVER_CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4h — tune here (spec range: 3-6h)
const DISCOVER_CACHE_PRUNE_AFTER_MS = DISCOVER_CACHE_TTL_MS * 6; // bound Map growth from one-off searches

type DiscoverCacheEntry = { items: DiscoverItem[]; cachedAt: number };
const discoverCache = new Map<string, DiscoverCacheEntry>();

function pruneDiscoverCache(now: number) {
  for (const [key, entry] of discoverCache) {
    if (now - entry.cachedAt > DISCOVER_CACHE_PRUNE_AFTER_MS) discoverCache.delete(key);
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────
//
// Progressive rendering note: all six sources are fetched in parallel via
// Promise.allSettled and the response is returned once they've all settled
// (each is individually fast/reliable, so the slowest one bounds the total).
// To upgrade to true progressive rendering later, swap this for a
// ReadableStream/NDJSON response that pushes each source's items as its
// promise resolves, and have the client append incrementally instead of
// waiting for the single JSON payload.

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const qOverride = params.get("q")?.trim();
  const interests = (params.get("interests") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const forceRefresh = params.get("refresh") === "1";

  const personalized = !qOverride && interests.length > 0;
  const term = qOverride || interests[0] || DEFAULT_QUERY;
  const queryTerms = term.toLowerCase().split(/\s+/).filter(Boolean);
  const cacheKey = term.toLowerCase();

  const now = Date.now();
  const cached = discoverCache.get(cacheKey);
  const cacheIsFresh = !!cached && now - cached.cachedAt < DISCOVER_CACHE_TTL_MS;

  if (!forceRefresh && cacheIsFresh) {
    return NextResponse.json(
      { items: cached!.items, personalized, query: term, cachedAt: cached!.cachedAt, fromCache: true },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }

  const results = await Promise.allSettled([
    fetchPubMed(term),
    fetchOpenAlex(term),
    fetchCrossref(term),
    fetchGrantsGov(term),
    fetchClinicalTrials(term),
    fetchGitHubTools(term),
  ]);

  const seen = new Set<string>();
  const items: DiscoverItem[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue; // per-source isolation — one failure never breaks the rest
    for (const raw of r.value) {
      const key = dedupeKey(raw);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ ...raw, relevance: scoreRelevance(raw, queryTerms) });
    }
  }

  items.sort(
    (a, b) => b.relevance - a.relevance || new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
  );

  pruneDiscoverCache(now);
  discoverCache.set(cacheKey, { items, cachedAt: now });

  return NextResponse.json(
    { items, personalized, query: term, cachedAt: now, fromCache: false },
    // Caching is handled by our own scope-keyed store above, not HTTP/CDN caching —
    // that would otherwise fight with `refresh=1` bypassing the cache on demand.
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
