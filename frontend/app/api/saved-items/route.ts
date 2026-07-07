import { NextRequest, NextResponse } from "next/server";
import { listSavedItems, addSavedItem, removeSavedItem } from "@/lib/server/savedItems";
import { errorResponse } from "@/lib/server/supabaseServer";
import type { DiscoverItem } from "@/types/discover";

// =============================================================================
// /api/saved-items — list / add / remove the signed-in user's bookmarks.
// =============================================================================
// Session-scoped: lib/server derives the uid from the validated session and RLS
// enforces ownership. The client never supplies a user id.
// =============================================================================

// ── GET: the caller's saved items (newest first) ─────────────────────────────
export async function GET() {
  try {
    const items = await listSavedItems();
    return NextResponse.json({ items });
  } catch (e) {
    return errorResponse(e, "Could not load your saved items.");
  }
}

// ── POST: bookmark an item ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const item = (body as { item?: unknown } | null)?.item as DiscoverItem | undefined;
  if (!item || typeof item !== "object" || typeof item.id !== "string") {
    return NextResponse.json({ error: "A valid item is required." }, { status: 400 });
  }

  try {
    await addSavedItem(item);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, "Could not save that item.");
  }
}

// ── DELETE: remove a bookmark by item id (?item_id=…) ─────────────────────────
export async function DELETE(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get("item_id");
  if (!itemId) {
    return NextResponse.json({ error: "item_id is required." }, { status: 400 });
  }

  try {
    await removeSavedItem(itemId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e, "Could not remove that item.");
  }
}
