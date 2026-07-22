import { NextRequest, NextResponse } from "next/server";
import { getResourceContact } from "@/lib/server/collaborate";
import { errorResponse } from "@/lib/server/supabaseServer";

// =============================================================================
// GET /api/collaborate/resources/[id]/contact — reveal a resource's contact info.
// =============================================================================
// AUTH-GATED: getResourceContact() goes through requireUser(), so an anonymous
// caller gets 401 (mapped by errorResponse). This is the ONLY route that ever
// returns contact_info — the owner-chosen contact text, NOT their account email.
// Returns { contact_info, owner_name }. 404 when the resource doesn't exist.
// force-dynamic keeps the read live.
// =============================================================================

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Reject anything that isn't a UUID before touching the DB.
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const contact = await getResourceContact(id);
    if (!contact) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(contact);
  } catch (e) {
    return errorResponse(e, "Could not load contact info.");
  }
}
