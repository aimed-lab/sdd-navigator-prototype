import { NextRequest, NextResponse } from "next/server";

// =============================================================================
// GET /api/orcid/works?id=<ORCID> — server-side proxy for ORCID public data.
// =============================================================================
// Reads a researcher's PUBLIC record from ORCID's public API in ONE call action:
//   • /works  → the 5 MOST RECENT publications (title, year, url)
//   • /person → name, biography, and keywords (research areas)
// Neither endpoint needs a secret / auth key — pub.orcid.org serves public
// records with just `Accept: application/json` (verified: HTTP 200). We fetch
// server-side (matching how the rest of this repo proxies external feeds, e.g.
// /api/discover) so the browser never deals with ORCID CORS, and normalize the
// verbose ORCID shapes down to the few real fields the profile editor pre-fills.
// Nothing is persisted here — the caller edits then saves through the normal
// PUT /api/profile + POST /api/collaborate flows.
// =============================================================================

export const dynamic = "force-dynamic";

// 0000-0002-1825-0097 — four groups of 4, last char may be X (checksum).
const ORCID_RE = /(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i;

// Only the 5 most recent publications are imported by default (a senior
// researcher can have 100+; importing everything floods the profile). The
// researcher can still add more rows manually afterward.
const MAX_WORKS = 5;

type NormalizedWork = { title: string; year: number | null; url: string | null };
type OrcidPerson = {
  name: string | null;
  bio: string | null;
  keywords: string[];
  linkedin: string | null;
};

// ── /works shapes (only the bits we read) ─────────────────────────────────────
type WorkSummary = {
  title?: { title?: { value?: string | null } | null } | null;
  "publication-date"?: {
    year?: { value?: string | null } | null;
    month?: { value?: string | null } | null;
    day?: { value?: string | null } | null;
  } | null;
  url?: { value?: string | null } | null;
  "external-ids"?: {
    "external-id"?: Array<{
      "external-id-type"?: string | null;
      "external-id-value"?: string | null;
      "external-id-url"?: { value?: string | null } | null;
    }>;
  } | null;
};
type OrcidWorksResponse = { group?: Array<{ "work-summary"?: WorkSummary[] }> };

// ── /person shapes (only the bits we read) ────────────────────────────────────
type OrcidPersonResponse = {
  name?: {
    "given-names"?: { value?: string | null } | null;
    "family-name"?: { value?: string | null } | null;
    "credit-name"?: { value?: string | null } | null;
  } | null;
  biography?: { content?: string | null } | null;
  keywords?: { keyword?: Array<{ content?: string | null }> } | null;
  "researcher-urls"?: {
    "researcher-url"?: Array<{
      "url-name"?: string | null;
      url?: { value?: string | null } | null;
    }>;
  } | null;
};

// Best-effort URL for a work: explicit url, else the DOI's external-id-url, else a
// doi.org link built from the DOI value, else any external-id-url. Null otherwise.
function workUrl(summary: WorkSummary): string | null {
  if (summary.url?.value) return summary.url.value;
  const ids = summary["external-ids"]?.["external-id"] ?? [];
  const doi = ids.find((i) => (i["external-id-type"] ?? "").toLowerCase() === "doi");
  if (doi) {
    if (doi["external-id-url"]?.value) return doi["external-id-url"].value;
    if (doi["external-id-value"]) return `https://doi.org/${doi["external-id-value"]}`;
  }
  const anyUrl = ids.find((i) => i["external-id-url"]?.value);
  return anyUrl?.["external-id-url"]?.value ?? null;
}

// A sortable numeric key from a work's publication-date (year*10000 + m*100 + d).
// Missing parts default to 0 so year-only dates still order correctly, newest first.
function dateKey(summary: WorkSummary): number {
  const d = summary["publication-date"];
  const num = (v: string | null | undefined, def: number) =>
    v && /^\d+$/.test(v) ? parseInt(v, 10) : def;
  const y = num(d?.year?.value, 0);
  const m = num(d?.month?.value, 0);
  const day = num(d?.day?.value, 0);
  return y * 10000 + m * 100 + day;
}

function fetchOrcid(orcid: string, path: string): Promise<Response> {
  return fetch(`https://pub.orcid.org/v3.0/${orcid}/${path}`, {
    headers: { Accept: "application/json" },
    // ORCID is external and read-only; don't let a slow response hang the editor.
    signal: AbortSignal.timeout(12000),
  });
}

// Parse /works → the 5 most recent normalized publications.
function parseWorks(data: OrcidWorksResponse | null): NormalizedWork[] {
  if (!data) return [];
  // One entry per group (a group = one work, possibly multiple sources); keep the
  // first summary. Drop untitled entries. De-dupe by title+year. Sort newest-first
  // by full publication date, then cap.
  const seen = new Set<string>();
  const rows: Array<NormalizedWork & { key: number }> = [];
  for (const group of data.group ?? []) {
    const summary = group["work-summary"]?.[0];
    if (!summary) continue;
    const title = summary.title?.title?.value?.trim();
    if (!title) continue;
    const yearStr = summary["publication-date"]?.year?.value;
    const year = yearStr && /^\d{4}$/.test(yearStr) ? parseInt(yearStr, 10) : null;
    const dedupe = `${title.toLowerCase()}::${year ?? ""}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    rows.push({ title, year, url: workUrl(summary), key: dateKey(summary) });
  }
  rows.sort((a, b) => b.key - a.key);
  return rows.slice(0, MAX_WORKS).map(({ title, year, url }) => ({ title, year, url }));
}

// Parse /person → name (credit-name preferred, else given + family), biography,
// keywords, and a LinkedIn URL (from researcher-urls). Every field is optional in
// a real record.
function parsePerson(data: OrcidPersonResponse | null): OrcidPerson {
  if (!data) return { name: null, bio: null, keywords: [], linkedin: null };

  const credit = data.name?.["credit-name"]?.value?.trim();
  const given = data.name?.["given-names"]?.value?.trim() ?? "";
  const family = data.name?.["family-name"]?.value?.trim() ?? "";
  const composed = [given, family].filter(Boolean).join(" ").trim();
  const name = credit || composed || null;

  const bio = data.biography?.content?.trim() || null;

  const keywords = (data.keywords?.keyword ?? [])
    .map((k) => k.content?.trim())
    .filter((k): k is string => Boolean(k));

  // LinkedIn: first researcher-url whose url-name contains "linkedin"
  // (case-insensitive). Falls back to null when the researcher listed none.
  const urls = data["researcher-urls"]?.["researcher-url"] ?? [];
  const linkedinEntry = urls.find((u) =>
    (u["url-name"] ?? "").toLowerCase().includes("linkedin"),
  );
  const linkedin = linkedinEntry?.url?.value?.trim() || null;

  return { name, bio, keywords, linkedin };
}

export async function GET(req: NextRequest) {
  const raw = new URL(req.url).searchParams.get("id") ?? "";
  const match = raw.match(ORCID_RE);
  if (!match) {
    return NextResponse.json(
      { error: "Enter a valid ORCID iD, e.g. 0000-0002-1825-0097." },
      { status: 400 },
    );
  }
  const orcid = match[1].toUpperCase();

  // ── TEMPORARY DEBUG HOOK ────────────────────────────────────────────────────
  // GET /api/orcid/works?id=<ORCID>&debug=1 returns ORCID's RAW, UNMODIFIED
  // /person and /works payloads (plus upstream status codes) before any of our
  // parsing/filtering touches them — so we can inspect exactly what ORCID sends
  // for a specific iD. REMOVE THIS BLOCK once verified; it is not used by the app.
  if (new URL(req.url).searchParams.get("debug")) {
    const [p, w] = await Promise.all([
      fetchOrcid(orcid, "person").catch(() => null),
      fetchOrcid(orcid, "works").catch(() => null),
    ]);
    const rawBody = async (r: Response | null) => {
      if (!r) return { status: 0, error: "fetch failed" };
      const text = await r.text().catch(() => "");
      try {
        return { status: r.status, body: JSON.parse(text) };
      } catch {
        return { status: r.status, body: text };
      }
    };
    return NextResponse.json({
      orcid,
      person: await rawBody(p),
      works: await rawBody(w),
    });
  }

  // Fetch works + person together so one paste gives the editor everything.
  let worksRes: Response;
  let personRes: Response;
  try {
    [worksRes, personRes] = await Promise.all([
      fetchOrcid(orcid, "works"),
      fetchOrcid(orcid, "person"),
    ]);
  } catch {
    return NextResponse.json({ error: "Could not reach ORCID. Please try again." }, { status: 502 });
  }

  // The works endpoint is the primary signal — a 404 there means "no such record".
  if (worksRes.status === 404) {
    return NextResponse.json({ error: "No public ORCID record found for that iD." }, { status: 404 });
  }
  if (!worksRes.ok) {
    return NextResponse.json({ error: "ORCID returned an error. Please try again." }, { status: 502 });
  }

  const worksData = (await worksRes.json().catch(() => null)) as OrcidWorksResponse | null;
  // Person is best-effort: if it fails, still return the works (person → blanks).
  const personData = personRes.ok
    ? ((await personRes.json().catch(() => null)) as OrcidPersonResponse | null)
    : null;

  return NextResponse.json({
    orcid,
    works: parseWorks(worksData),
    person: parsePerson(personData),
  });
}
