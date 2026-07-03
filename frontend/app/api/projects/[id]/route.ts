import { NextRequest, NextResponse } from "next/server";
import { getRouteClient } from "@/lib/supabaseRoute";

// =============================================================================
// /api/projects/[id] — load one saved proposal (reopen) + delete.
// =============================================================================
// Session-scoped + RLS: a user can only ever load or delete their OWN project.
// A non-owned or non-existent id simply matches zero rows (RLS), returning 404.
// =============================================================================

// ── GET: full project (input_data + output_data) for reopening ────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await getRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, title, input_data, output_data, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("project load failed:", error);
    return NextResponse.json({ error: "Could not load this project." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ project: data });
}

// ── DELETE: remove one of the caller's projects ───────────────────────────────
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await getRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  // RLS ensures only the owner's row can be deleted. Use a returning select so we
  // can tell "deleted" from "nothing matched" (already gone / not theirs).
  const { data, error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("project delete failed:", error);
    return NextResponse.json({ error: "Could not delete this project." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
