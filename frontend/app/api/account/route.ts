import { NextRequest, NextResponse } from "next/server";
import { getAccountSettings, updateProfileFields } from "@/lib/server/account";
import { errorResponse } from "@/lib/server/supabaseServer";

// =============================================================================
// /api/account — read settings + save profile fields for the signed-in user.
// =============================================================================
// Session-scoped: lib/server derives the uid from the validated session and RLS
// enforces ownership. The client never supplies a user id. auth email/password
// changes stay client-side (they operate on the caller's own auth user), and
// delete-account has its own /api/delete-account route — neither lives here.
// =============================================================================

// ── GET: the caller's account settings (null when no row) ────────────────────
export async function GET() {
  try {
    const settings = await getAccountSettings();
    return NextResponse.json({ settings });
  } catch (e) {
    return errorResponse(e, "Could not load your settings.");
  }
}

// ── PUT: save the caller's profile fields (name/affiliation/institution/country)
export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    name?: unknown;
    affiliation?: unknown;
    institution?: unknown;
    country?: unknown;
  } | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, affiliation, institution, country } = body;
  if (
    typeof name !== "string" ||
    typeof affiliation !== "string" ||
    typeof institution !== "string" ||
    typeof country !== "string"
  ) {
    return NextResponse.json(
      { error: "name, affiliation, institution and country are required." },
      { status: 400 },
    );
  }

  try {
    await updateProfileFields({ name, affiliation, institution, country });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, "Could not save your changes.");
  }
}
