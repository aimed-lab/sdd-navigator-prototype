// lib/server/proposal/research.ts — proposal-specific relevant-research gathering.
//
// STEP 4a SCAFFOLD: signatures only. Moves here from app/api/generate-proposal/route.ts
// during Phase B: extractSearchTerms, termMatchCount, toResearchItem, precisionFilter,
// gatherResearch. This is the proposal's precision-filtered wrapper over the discover
// engine — kept separate from lib/server/discovery.ts because the filtering is
// proposal-coupled.

import type { ProposalInput, ProposalResearchItem } from "@/types/proposal";

const NOT_IMPLEMENTED = "lib/server/proposal/research: not implemented yet (Step 4a migration pending)";

export type ResearchPools = {
  papers: ProposalResearchItem[];
  trials: ProposalResearchItem[];
  grants: ProposalResearchItem[];
};

export async function gatherResearch(_origin: string, _input: ProposalInput): Promise<ResearchPools> {
  throw new Error(NOT_IMPLEMENTED);
}
