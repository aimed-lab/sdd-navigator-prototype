import { NextRequest, NextResponse } from "next/server";
import { getInterests, setInterests } from "@/lib/server/interests";
import { errorResponse } from "@/lib/server/supabaseServer";

// =============================================================================
// /api/interests — read + persist the signed-in user's discovery interests.
// =============================================================================
// Session-scoped: lib/server derives the uid from the validated session and RLS
// enforces ownership. The client never supplies a user id.
// =============================================================================

// ── GET: the caller's interests ──────────────────────────────────────────────
export async function GET() {
  try {
    const interests = await getInterests();
    return NextResponse.json({ interests });
  } catch (e) {
    return errorResponse(e, "Could not load your interests.");
  }
}

// ── POST: replace the caller's interests ─────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const interests = (body as { interests?: unknown } | null)?.interests;
  if (!Array.isArray(interests) || !interests.every((i) => typeof i === "string")) {
    return NextResponse.json(
      { error: "interests must be an array of strings." },
      { status: 400 },
    );
  }

  try {
    await setInterests(interests);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, "Could not save your interests.");
  }
}
