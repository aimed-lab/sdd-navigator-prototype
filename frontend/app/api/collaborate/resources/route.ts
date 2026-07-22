import { NextRequest, NextResponse } from "next/server";
import { listResources, parseResourceInput, createResource } from "@/lib/server/collaborate";
import { errorResponse } from "@/lib/server/supabaseServer";

// =============================================================================
// /api/collaborate/resources — browse (public) + register (auth-gated).
// =============================================================================
// GET is PUBLIC (no auth): ?q= keyword search against fields->>'name' and
// ?category= filter (omitted = all). The payload carries a joined owner NAME but
// never the owner's email and never contact_info (that lives on the /contact
// route alone). force-dynamic keeps the list live on every request.
//
// POST is AUTH-GATED: lib/server derives owner_id from the validated session and
// RLS enforces auth.uid() = owner_id. The client never supplies an owner id.
// =============================================================================

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || undefined;
  const category = searchParams.get("category")?.trim() || undefined;

  const resources = await listResources({ q, category });
  return NextResponse.json({ resources });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const input = parseResourceInput(body);
  if (!input) {
    return NextResponse.json(
      { error: "A valid category and fields are required." },
      { status: 400 },
    );
  }

  try {
    const id = await createResource(input);
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return errorResponse(e, "Could not register your resource. Please try again.");
  }
}
