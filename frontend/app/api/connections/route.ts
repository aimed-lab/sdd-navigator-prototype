import { NextRequest, NextResponse } from "next/server";
import { parseConnectionInput, createConnectionRequest } from "@/lib/server/connections";
import { errorResponse } from "@/lib/server/supabaseServer";

// =============================================================================
// /api/connections — capture an on-platform "Connect" request (auth-gated).
// =============================================================================
// POST is session-scoped: the requester (user_id) is derived from the validated
// session inside lib/server (requireUser), never from the body, and RLS enforces
// auth.uid() = user_id. We store provider_name, capability, project_id, message,
// status 'new'. No email/external contact is involved — SPARC responds through
// the platform. (Admin/response UI is a later phase; there is no GET here yet.)
// =============================================================================

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const input = parseConnectionInput(body);
  if (!input) {
    return NextResponse.json({ error: "A provider is required." }, { status: 400 });
  }

  try {
    const id = await createConnectionRequest(input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return errorResponse(e, "Could not send your request. Please try again.");
  }
}
