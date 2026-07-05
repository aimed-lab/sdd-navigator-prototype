// lib/server/proposal/engine.ts — the proposal orchestrator.
//
// STEP 4a SCAFFOLD: signatures only. Moves here from app/api/generate-proposal/route.ts
// during Phase B: parseInput, buildRecap, runGeneration, PROPOSAL_SYSTEM_PROMPT,
// buildUserMessage, and the phase-assembly loop — wrapped as generateProposal().
// After the move, the route handler becomes: parse body → generateProposal() →
// respond, with the response shape (ProposalDocument) UNCHANGED.

import type { ProposalInput, ProposalDocument } from "@/types/proposal";

const NOT_IMPLEMENTED = "lib/server/proposal/engine: not implemented yet (Step 4a migration pending)";

// Validate + normalize the raw request body into a ProposalInput (null if the
// required science fields are missing).
export function parseInput(_body: Record<string, unknown>): ProposalInput | null {
  throw new Error(NOT_IMPLEMENTED);
}

// Full pipeline: SPARC grounding → LLM generation ‖ research gathering → assemble
// the phased document. `origin` is needed for the internal /api/* sub-fetches.
export async function generateProposal(
  _input: ProposalInput,
  _origin: string,
): Promise<ProposalDocument> {
  throw new Error(NOT_IMPLEMENTED);
}
