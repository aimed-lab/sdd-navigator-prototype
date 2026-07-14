import { NextRequest, NextResponse } from "next/server";
import { requireUser, errorResponse } from "@/lib/server/supabaseServer";
import { extractInterestKeywords } from "@/lib/server/extractInterests";

// =============================================================================
// /api/extract-interests — turn a researcher's answers into search keywords.
// =============================================================================
// AUTH-GATED (requireUser → 401): this is a Groq-backed compute endpoint reached
// only from the logged-in "Personalize your feed" modal on /discovery. The
// extraction logic lives in lib/server/extractInterests so the proposal research
// pipeline can call it in-process (no HTTP self-fetch). Same input contract and
// status codes as before (400 no input, 500 missing key, 502 AI failure).
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

  const { field, working, topics } = body as {
    field?: string;
    working?: string;
    topics?: string;
  };

  const result = await extractInterestKeywords({ field, working, topics });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ keywords: result.keywords });
}
