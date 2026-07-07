import { NextRequest, NextResponse } from "next/server";
import { toggleNotification } from "@/lib/server/account";
import { errorResponse } from "@/lib/server/supabaseServer";

// =============================================================================
// /api/account/notifications — toggle a single notification preference for the
// signed-in user. Session-scoped via lib/server (requireUser); the uid is never
// supplied by the client and RLS enforces ownership.
// =============================================================================

const FIELDS = ["notify_weekly", "notify_daily"] as const;
type NotifyField = (typeof FIELDS)[number];

// ── PUT: set one preference to a boolean value ───────────────────────────────
export async function PUT(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    field?: unknown;
    value?: unknown;
  } | null;
  const field = body?.field;
  const value = body?.value;
  if (typeof field !== "string" || !FIELDS.includes(field as NotifyField) || typeof value !== "boolean") {
    return NextResponse.json(
      { error: "field must be notify_weekly|notify_daily and value must be a boolean." },
      { status: 400 },
    );
  }

  try {
    await toggleNotification(field as NotifyField, value);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, "Could not save your preference.");
  }
}
