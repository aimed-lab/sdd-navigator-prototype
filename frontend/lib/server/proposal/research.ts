// lib/server/proposal/research.ts — proposal-specific relevant-research gathering.
//
// Moved VERBATIM from app/api/generate-proposal/route.ts (Step 4a): the
// extract-entities → discover → precision-filter pipeline. This is the proposal's
// precision-filtered wrapper over the live /api/discover engine — bodies copied
// unchanged.

import type { ProposalInput, ProposalResearchItem } from "@/types/proposal";
import type { DiscoverItem } from "@/types/discover";
import { cleanText } from "@/lib/sanitizeText";

// ── Relevant research (reuses the live /api/discover engine) ──────────────────
//
// Precision strategy (vs. the old raw-blob query that returned broad, off-target
// results): extract clean search entities from the proposal, query discover in
// MULTI-TERM mode, then post-filter papers/trials down to items that actually
// mention the extracted entities. Grants are Grants.gov FUNDING OPPORTUNITIES —
// broad by nature — so they're NOT precision-filtered and are labelled honestly.
// The whole chain runs in parallel with the main generation call (see engine).

export type ResearchPools = {
  papers: ProposalResearchItem[];
  trials: ProposalResearchItem[];
  grants: ProposalResearchItem[];
};

const EMPTY_POOLS: ResearchPools = { papers: [], trials: [], grants: [] };

// Turn the proposal's free-text target + rationale into 3-5 clean search terms
// via the existing /api/extract-interests Groq route. Returns [] on any failure
// so research degrades gracefully to a single-term query.
async function extractSearchTerms(origin: string, input: ProposalInput): Promise<string[]> {
  try {
    const res = await fetch(`${origin}/api/extract-interests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        working: input.therapeutic_target,
        topics: input.scientific_rationale,
      }),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { keywords?: unknown };
    if (!Array.isArray(data.keywords)) return [];
    return data.keywords.filter((k): k is string => typeof k === "string" && k.trim().length > 0);
  } catch {
    return [];
  }
}

// Count how many extracted term-phrases appear (case-insensitive substring) in
// the item's title + description — the precision signal. Items matching more
// terms (e.g. target AND disease) rank above single-term matches.
function termMatchCount(item: DiscoverItem, terms: string[]): number {
  const hay = `${item.title} ${item.description}`.toLowerCase();
  return terms.reduce((n, t) => (hay.includes(t.toLowerCase()) ? n + 1 : n), 0);
}

function toResearchItem(i: DiscoverItem): ProposalResearchItem {
  return {
    // discover types are paper | grant | trial | tool; we only keep the first 3.
    type: i.type === "grant" || i.type === "trial" ? i.type : "paper",
    id: i.id,
    // Source APIs embed HTML/XML in titles (<scp>, <i>, &amp;) — clean to plain
    // text so output_data, the PDF, and saved projects are all clean.
    title: cleanText(i.title),
    source: cleanText(i.source),
    date: i.date,
    url: i.url,
  };
}

// Precision post-filter for target-queryable types (papers, trials): keep only
// items mentioning an extracted term, ranked by match count. If that leaves the
// pool empty (over-filtered), fall back to the unfiltered subset rather than
// showing nothing. No-op when we have no terms.
function precisionFilter(items: DiscoverItem[], terms: string[]): DiscoverItem[] {
  if (terms.length === 0) return items;
  const onTarget = items
    .map((i) => ({ i, score: termMatchCount(i, terms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.i);
  return onTarget.length > 0 ? onTarget : items;
}

// Gather the whole research pool in ONE discover call (multi-term), split by
// type, precision-filter papers/trials, and clean titles. Never throws.
export async function gatherResearch(origin: string, input: ProposalInput): Promise<ResearchPools> {
  const terms = await extractSearchTerms(origin, input);

  // Multi-term when we have extracted entities; otherwise fall back to the raw
  // target as a single query (old behaviour) so research still works.
  const url =
    terms.length > 0
      ? `${origin}/api/discover?interests=${encodeURIComponent(terms.join(","))}`
      : `${origin}/api/discover?q=${encodeURIComponent(input.therapeutic_target.slice(0, 200))}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return EMPTY_POOLS;
    const data = (await res.json()) as { items?: DiscoverItem[] };
    const items = data.items ?? [];

    const rawPapers = items.filter((i) => i.type === "paper");
    const rawTrials = items.filter((i) => i.type === "trial");
    const rawGrants = items.filter((i) => i.type === "grant"); // broad — not filtered

    return {
      papers: precisionFilter(rawPapers, terms).map(toResearchItem),
      trials: precisionFilter(rawTrials, terms).map(toResearchItem),
      grants: rawGrants.map(toResearchItem),
    };
  } catch {
    return EMPTY_POOLS;
  }
}
