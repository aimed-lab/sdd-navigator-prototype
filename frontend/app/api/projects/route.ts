import { NextRequest, NextResponse } from "next/server";
import { getRouteClient } from "@/lib/supabaseRoute";
import type { ProposalInput, ProposalDocument } from "@/types/proposal";

// =============================================================================
// /api/projects — save (create/update) + list saved Navigator proposals.
// =============================================================================
// All access is session-scoped: the client is built from the caller's cookies
// and every query runs under RLS (projects_*_own → auth.uid() = user_id). The
// owner is ALWAYS taken from the validated session, never from the request body.
// =============================================================================

// ── POST: create a new project, or update an existing one when `id` is given ──
export async function POST(req: NextRequest) {
  const supabase = await getRouteClient();
  if (!supabase) {
    return NextResponse.json({ error: "Server misconfigured." }, { status: 500 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "You must be signed in to save a project." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    id,
    title,
    input_data,
    output_data,
  } = body as {
    id?: unknown;
    title?: unknown;
    input_data?: ProposalInput;
    output_data?: ProposalDocument;
  };

  if (!input_data || typeof input_data !== "object" || !output_data || typeof output_data !== "object") {
    return NextResponse.json(
      { error: "Both input_data and output_data are required." },
      { status: 400 },
    );
  }

  // Title precedence: explicit title → the input's project title → the generated
  // document title → a safe fallback.
  const resolvedTitle =
    (typeof title === "string" && title.trim()) ||
    (typeof input_data.title_and_team === "string" && input_data.title_and_team.trim()) ||
    (typeof output_data.title === "string" && output_data.title.trim()) ||
    "Untitled proposal";

  // create vs update is distinguished purely by whether the body carries an `id`.
  if (typeof id === "string" && id) {
    // UPDATE — the table has no auto-update trigger, so set updated_at here.
    // RLS (USING + WITH CHECK auth.uid() = user_id) guarantees the row is the
    // caller's; a non-owned / non-existent id matches zero rows → 404.
    const { data, error } = await supabase
      .from("projects")
      .update({
        title: resolvedTitle,
        input_data,
        output_data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("projects update failed:", error);
      return NextResponse.json({ error: "Could not save your project." }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ id: data.id });
  }

  // INSERT — owner is the session user, never the client.
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: user.id,
      title: resolvedTitle,
      input_data,
      output_data,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("projects insert failed:", error);
    return NextResponse.json({ error: "Could not save your project." }, { status: 500 });
  }
  return NextResponse.json({ id: data.id }, { status: 201 });
}

// ── GET: list the caller's projects (newest first) for the Hub ────────────────
export async function GET() {
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

  // RLS scopes this to the caller's own rows; select only list-view columns.
  const { data, error } = await supabase
    .from("projects")
    .select("id, title, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("projects list failed:", error);
    return NextResponse.json({ error: "Could not load your projects." }, { status: 500 });
  }
  return NextResponse.json({ projects: data ?? [] });
}
