import { NextResponse } from "next/server";
import { listEpisodes } from "@/lib/server/wiki";

// GET /api/episodes — public list of all episodes (newest first). Thin wrapper
// over lib/server/wiki.listEpisodes so the client podcast page fetches through
// an API instead of calling Supabase directly. force-dynamic keeps the list
// live on every request, matching the page's prior on-mount fetch.
export const dynamic = "force-dynamic";

export async function GET() {
  const episodes = await listEpisodes();
  return NextResponse.json({ episodes });
}
