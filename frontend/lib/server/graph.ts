// lib/server/graph.ts — knowledge-graph reads (public, anon).
//
// getGraphData is the verbatim move of the three parallel reads from
// knowledge-graph/page.tsx (nodes, edges, wiki_pages). All three tables have
// public-read RLS (nodes_select_public / edges_select_public /
// wiki_pages_select_public), so the anon server client is correct. Only the
// DB access moves here — every bit of D3 processing stays in the page.

import { getAnonServerClient } from "@/lib/server/supabaseServer";

// Raw node row (nodes.select("id,label,type,description")).
export type GraphNodeRow = {
  id: string;
  label: string;
  type: string;
  description: string | null;
};

// Raw edge row (edges.select("source_id,target_id,relationship")).
export type GraphEdgeRow = {
  source_id: string;
  target_id: string;
  relationship: string;
};

// Raw wiki page row for episode popups
// (wiki_pages.select("id,title,slug,episode_number,tags,description")).
export type GraphWikiPageRow = {
  id: string;
  title: string;
  slug: string;
  episode_number: number;
  tags: string[];
  description: string;
};

export type GraphData = {
  nodes: GraphNodeRow[];
  edges: GraphEdgeRow[];
  pages: GraphWikiPageRow[];
};

// PostgREST caps every read at `db-max-rows` (1000 on this project). The edges
// table already exceeds it (2442 rows), so a plain select silently returns only
// the first 1000 and the D3 graph loses ~60% of its links. Nodes (582) and
// wiki_pages (64) are safely under the cap and stay single reads.
const EDGE_PAGE_SIZE = 1000;

type EdgesResult = { data: GraphEdgeRow[]; error: unknown };

// Fetch ALL edges by paging with .range() until a short page signals the end.
// The edges table has NO single-column primary key exposed (columns are only
// source_id/target_id/relationship), so we impose a deterministic total order
// across all three columns — that keeps the .range() windows stable (no overlap
// / no gaps) across requests. Exact-duplicate rows are interchangeable, so paging
// still returns the correct set. Returns the first error encountered so the
// caller can fail exactly as the single-read version did.
async function fetchAllEdges(
  supabase: NonNullable<ReturnType<typeof getAnonServerClient>>,
): Promise<EdgesResult> {
  const all: GraphEdgeRow[] = [];
  for (let from = 0; ; from += EDGE_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("edges")
      .select("source_id,target_id,relationship")
      .order("source_id", { ascending: true })
      .order("target_id", { ascending: true })
      .order("relationship", { ascending: true })
      .range(from, from + EDGE_PAGE_SIZE - 1);

    if (error) return { data: [], error };

    const batch = (data ?? []) as GraphEdgeRow[];
    all.push(...batch);
    // A page smaller than the window means we've reached the last one. (An exact
    // multiple of the page size does one extra empty request, then stops.)
    if (batch.length < EDGE_PAGE_SIZE) break;
  }
  return { data: all, error: null };
}

// Fetch nodes + edges + wiki_pages in parallel — same columns as the page did.
// Edges are now paginated (see fetchAllEdges) so all 2442+ are returned, not the
// first 1000. Returns null when the nodes OR edges read errors (mirrors the
// page's `nodesRes.error || edgesRes.error` failure check); a wiki_pages error is
// non-fatal (pages just come back empty, exactly as the page's `pagesRes.data ||
// []` handled it).
export async function getGraphData(): Promise<GraphData | null> {
  const supabase = getAnonServerClient();
  if (!supabase) return null;

  const [nodesRes, edgesRes, pagesRes] = await Promise.all([
    supabase.from("nodes").select("id,label,type,description"),
    fetchAllEdges(supabase),
    supabase.from("wiki_pages").select("id,title,slug,episode_number,tags,description"),
  ]);

  if (nodesRes.error || edgesRes.error) return null;

  return {
    nodes: (nodesRes.data ?? []) as GraphNodeRow[],
    edges: edgesRes.data,
    pages: (pagesRes.data ?? []) as GraphWikiPageRow[],
  };
}
