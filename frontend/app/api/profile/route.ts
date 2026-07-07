import { NextRequest, NextResponse } from "next/server";
import { getProfile, updateProfile, replaceResearcherWorks } from "@/lib/server/profile";
import type { ResearcherWork } from "@/lib/server/profile";
import { errorResponse } from "@/lib/server/supabaseServer";

// =============================================================================
// /api/profile — read + save the signed-in user's researcher profile + works.
// =============================================================================
// Session-scoped: lib/server derives the uid from the validated session and RLS
// enforces ownership. The client never supplies a user id. The works reconcile
// (delete-then-reinsert) is scoped to the session user, so a caller can only
// ever touch their own profile and works.
// =============================================================================

// ── GET: the caller's profile + works ────────────────────────────────────────
export async function GET() {
  try {
    const data = await getProfile();
    return NextResponse.json(data);
  } catch (e) {
    return errorResponse(e, "Could not load your profile.");
  }
}

// ── PUT: save profile fields, then reconcile works (same order as before) ─────
export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    profile?: unknown;
    works?: unknown;
  } | null;

  if (!body || typeof body.profile !== "object" || body.profile === null || !Array.isArray(body.works)) {
    return NextResponse.json({ error: "profile (object) and works (array) are required." }, { status: 400 });
  }

  const profile = body.profile as Record<string, unknown>;
  const works = body.works as ResearcherWork[];

  try {
    // users.update FIRST, then delete-and-reinsert works — preserving the
    // original ordering so a profile save never leaves works half-reconciled
    // ahead of the profile row.
    await updateProfile(profile);
    await replaceResearcherWorks(works);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, "Failed to save profile.");
  }
}
