// lib/server/proposal/research.ts — proposal-specific relevant-research gathering.
//
// Moved VERBATIM from app/api/generate-proposal/route.ts (Step 4a): the
// extract-entities → discover → precision-filter pipeline. This is the proposal's
// precision-filtered wrapper over the live /api/discover engine — bodies copied
// unchanged.

import type { ProposalInput, ProposalResearchItem } from "@/types/proposal";
import type { DiscoverItem } from "@/types/discover";
// Relative (not @/) so the pure filter helpers here stay unit-testable under the
// node:test runner, which doesn't resolve the @/ path alias for runtime imports.
import { cleanText } from "../../sanitizeText.ts";

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

// Disease / indication markers. A term carrying one of these names an INDICATION
// (e.g. "pancreatic ductal adenocarcinoma", "glioblastoma") — the disease being
// treated — NOT the molecular focus of the project. We detect these by
// morphology rather than a disease ontology: it's deterministic, dependency-free,
// and covers the oncology-heavy domain plus common indication suffixes. This is
// what lets us subtract the disease even when the researcher writes it into the
// therapeutic_target field ("...inhibitor FOR pancreatic ductal adenocarcinoma").
//
// NB: we deliberately do NOT subtract "any term that also appears in the
// rationale" — a good rationale names the TARGET too ("KRAS G12D is the driver
// in…"), so that rule would wrongly strip the target itself. Morphology
// separates the indication from the target/modality cleanly.
const INDICATION_MARKERS = [
  "cancer", "carcinoma", "adenocarcinoma", "tumor", "tumour", "neoplasm", "neoplasia",
  "sarcoma", "leukemia", "leukaemia", "lymphoma", "melanoma", "glioma", "glioblastoma",
  "myeloma", "blastoma", "metastasis", "metastatic",
  "disease", "syndrome", "disorder",
];

function isIndicationTerm(term: string): boolean {
  const t = term.toLowerCase();
  return INDICATION_MARKERS.some((m) => t.includes(m));
}

// The project's SPECIFIC focus — the TARGET + MODALITY the researcher actually
// has (e.g. "KRAS G12D", "covalent inhibitor", "small molecule"), NOT the disease
// it treats. Derived deterministically in two steps:
//   1. Candidate = extracted terms that appear in the therapeutic_target field
//      (what-they-have), excluding broad disease/context terms that only show up
//      in the rationale.
//   2. Subtract disease/indication terms (by morphology), so a disease name in
//      the target field ("…for pancreatic ductal adenocarcinoma") does NOT count
//      as focus — otherwise disease-only papers satisfy the raised threshold.
// Returns [] when nothing survives (no identifiable molecular focus), the signal
// that paper filtering should degrade to the broad term filter rather than
// pretending the disease is a focus.
export function focusTerms(terms: string[], input: ProposalInput): string[] {
  const target = input.therapeutic_target.toLowerCase();
  const inTarget = terms.filter((t) => target.includes(t.toLowerCase()));
  return inTarget.filter((t) => !isIndicationTerm(t));
}

// Does the item text hit a focus term? True on a full-phrase substring match OR
// when every SIGNIFICANT token of the phrase appears — so "KRAS G12D" also
// matches "KRAS(G12D)" / "KRAS-G12D mutant" (varied phrasing) without loosening
// to a mere disease match (both distinctive tokens must still be present).
function focusHit(hay: string, term: string): boolean {
  const t = term.toLowerCase();
  if (hay.includes(t)) return true;
  const tokens = t.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  return tokens.length > 0 && tokens.every((w) => hay.includes(w));
}

// Count how many of the project's FOCUS terms the item hits (token-aware).
function focusMatchCount(item: DiscoverItem, focus: string[]): number {
  const hay = `${item.title} ${item.description}`.toLowerCase();
  return focus.reduce((n, f) => (focusHit(hay, f) ? n + 1 : n), 0);
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
export function precisionFilter(items: DiscoverItem[], terms: string[]): DiscoverItem[] {
  if (terms.length === 0) return items;
  const onTarget = items
    .map((i) => ({ i, score: termMatchCount(i, terms) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.i);
  return onTarget.length > 0 ? onTarget : items;
}

// STRICTER paper-specific filter (Refinement 1). A paper must hit the project's
// SPECIFIC focus (target/approach/modality), not merely the disease area — so a
// "pancreatic cancer" paper that never mentions KRAS G12D or the drug-design
// approach is dropped. Papers are ranked focus-first, then by total term breadth.
//
// Deliberately NO fallback to the broad filter when the on-focus pool is empty:
// that fallback would silently reintroduce the exact disease-only papers this
// filter exists to drop. If nothing is on-focus we return [] — the phase simply
// shows its (well-targeted) trials/funding and no loose papers, which is the
// honest outcome. Only when we couldn't identify ANY focus term (focus === [])
// do we defer to the broad filter, since we then have no basis to tighten.
export function precisionFilterPapers(
  items: DiscoverItem[],
  terms: string[],
  focus: string[],
): DiscoverItem[] {
  if (focus.length === 0) return precisionFilter(items, terms);
  return items
    .map((i) => ({ i, focusScore: focusMatchCount(i, focus), totalScore: termMatchCount(i, terms) }))
    .filter((x) => x.focusScore > 0) // the raised threshold: must hit the actual focus
    .sort((a, b) => b.focusScore - a.focusScore || b.totalScore - a.totalScore)
    .map((x) => x.i);
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

    // Papers get the stricter focus-weighted filter; trials/grants are UNCHANGED
    // (they were already well-targeted — see the refinement note).
    const focus = focusTerms(terms, input);

    return {
      papers: precisionFilterPapers(rawPapers, terms, focus).map(toResearchItem),
      trials: precisionFilter(rawTrials, terms).map(toResearchItem),
      grants: rawGrants.map(toResearchItem),
    };
  } catch {
    return EMPTY_POOLS;
  }
}
