// lib/server/proposal/grounding.ts — ⚠️ THE SPARC GROUNDING UNIT.
//
// STEP 4a SCAFFOLD: signatures only. This whole cluster moves TOGETHER, verbatim,
// from app/api/generate-proposal/route.ts during Phase B:
//   fetchInternalProviders, collectGrounding, buildSparcGrounding,
//   sanitizeSparcSelection, extractCapabilityHows, buildPhaseProviders, costSymbol
//
// CRITICAL GUARANTEE — "the LLM can never invent providers." sanitizeSparcSelection
// re-validates the model's selection verbatim against the real DB arrays, and
// buildPhaseProviders builds cards ONLY from real DB rows. This behavior MUST be
// pinned by a test and survive the move unchanged. Do not "improve" it here.

import type { InternalProvider, SparcStepContribution } from "@/types/navigator";
import type { ProposalProvider } from "@/types/proposal";

const NOT_IMPLEMENTED = "lib/server/proposal/grounding: not implemented yet (Step 4a migration pending)";

export async function fetchInternalProviders(): Promise<InternalProvider[]> {
  throw new Error(NOT_IMPLEMENTED);
}

export function collectGrounding(_providers: InternalProvider[]): {
  capabilities: string[];
  tools: string[];
} {
  throw new Error(NOT_IMPLEMENTED);
}

export function buildSparcGrounding(_caps: string[], _tools: string[]): string {
  throw new Error(NOT_IMPLEMENTED);
}

export function sanitizeSparcSelection(
  _raw: unknown,
  _allowedCaps: string[],
  _allowedTools: string[],
): SparcStepContribution {
  throw new Error(NOT_IMPLEMENTED);
}

export function extractCapabilityHows(
  _rawSparc: unknown,
  _allowedCaps: string[],
): Map<string, string> {
  throw new Error(NOT_IMPLEMENTED);
}

export function buildPhaseProviders(
  _contribution: SparcStepContribution,
  _providers: InternalProvider[],
  _capabilityHows: Map<string, string>,
): ProposalProvider[] {
  throw new Error(NOT_IMPLEMENTED);
}

export function costSymbol(_cost: string | null | undefined): string | null {
  throw new Error(NOT_IMPLEMENTED);
}
