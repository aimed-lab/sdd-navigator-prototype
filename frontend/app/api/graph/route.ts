import { NextResponse } from "next/server";
import { getGraphData } from "@/lib/server/graph";

// GET /api/graph — knowledge-graph data (nodes + edges + wiki_pages). Thin
// wrapper over lib/server/graph.getGraphData so the client D3 page fetches
// through an API instead of calling Supabase directly. Returns 500 when the
// nodes/edges read fails, matching the page's prior "Failed to load graph data."
// path. force-dynamic keeps the read live.
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getGraphData();
  if (!data) {
    return NextResponse.json({ error: "Failed to load graph data." }, { status: 500 });
  }
  return NextResponse.json(data);
}
