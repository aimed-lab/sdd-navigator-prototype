import { NextRequest, NextResponse } from "next/server";
import { parseInput, generateProposal } from "@/lib/server/proposal/engine";

// =============================================================================
// /api/generate-proposal — unified Navigator proposal engine (thin handler).
// =============================================================================
// Validates the request, then delegates to lib/server/proposal:
//   • parseInput        — normalize + require the 3 core science fields
//   • generateProposal  — SPARC grounding → LLM generation ‖ research → assembly
//
// The whole engine (incl. the SPARC grounding "can't-invent-providers" guarantee)
// lives in lib/server/proposal/{grounding,research,engine}.ts. Same input
// contract, same ProposalDocument output, same status codes as before.
// =============================================================================

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const input = parseInput(body as Record<string, unknown>);
  if (!input) {
    return NextResponse.json(
      { error: "Missing required fields: title, therapeutic target, and scientific rationale." },
      { status: 400 },
    );
  }

  const result = await generateProposal(input, req.nextUrl.origin);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.document);
}
