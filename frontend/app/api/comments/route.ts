import { NextRequest, NextResponse } from "next/server";
import { listComments, addComment } from "@/lib/server/comments";
import { errorResponse } from "@/lib/server/supabaseServer";

// =============================================================================
// /api/comments — list (public) + post (auth-gated) comments on a wiki page.
// =============================================================================
// GET is public: the comments SELECT policy is USING (true), so anyone can read
// a page's thread. POST is session-scoped — the author is derived from the
// validated session inside lib/server (requireUser), never from the body, and
// RLS enforces auth.uid() = user_id.
// =============================================================================

// ── GET: a wiki page's comments (newest first) ───────────────────────────────
export async function GET(req: NextRequest) {
  const wikiId = req.nextUrl.searchParams.get("wikiId");
  if (!wikiId) {
    return NextResponse.json({ error: "wikiId is required." }, { status: 400 });
  }

  try {
    const comments = await listComments(wikiId);
    return NextResponse.json({ comments });
  } catch (e) {
    return errorResponse(e, "Could not load comments.");
  }
}

// ── POST: add a comment as the signed-in user ────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const wikiId = (body as { wikiId?: unknown } | null)?.wikiId;
  const content = (body as { content?: unknown } | null)?.content;
  if (typeof wikiId !== "string" || !wikiId || typeof content !== "string" || !content.trim()) {
    return NextResponse.json(
      { error: "wikiId and non-empty content are required." },
      { status: 400 },
    );
  }

  try {
    await addComment(wikiId, content);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, "Failed to post comment.");
  }
}
