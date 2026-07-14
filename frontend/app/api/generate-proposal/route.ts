import { NextRequest, NextResponse } from "next/server";
import { parseInput, generateProposal } from "@/lib/server/proposal/engine";
import { requireUser, errorResponse } from "@/lib/server/supabaseServer";

// =============================================================================
// /api/generate-proposal — unified Navigator proposal engine (thin handler).
// =============================================================================
// AUTH-GATED (requireUser → 401): this Groq-backed endpoint is reached only from
// the middleware-protected /navigator/new form. Gating it stops anonymous callers
// from burning Groq budget + external API quota.
//
// Validates the request, then delegates to lib/server/proposal:
//   • parseInput        — normalize + require the 3 core science fields
//   • generateProposal  — SPARC grounding → LLM generation ‖ research → assembly
//
// The whole engine (incl. the SPARC grounding "can't-invent-providers" guarantee)
// lives in lib/server/proposal/{grounding,research,engine}.ts. Research runs
// fully in-process now (no /api/discover or /api/extract-interests self-fetch).
// Same input contract, same ProposalDocument output, same status codes as before.
// =============================================================================

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch (e) {
    return errorResponse(e, "You must be signed in.");
  }

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

  const result = await generateProposal(input);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.document);
}
