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

// Fetch nodes + edges + wiki_pages in parallel — same three queries, same
// columns as the page did. Returns null when the nodes OR edges read errors
// (mirrors the page's `nodesRes.error || edgesRes.error` failure check); a
// wiki_pages error is non-fatal (pages just come back empty, exactly as the
// page's `pagesRes.data || []` handled it).
export async function getGraphData(): Promise<GraphData | null> {
  const supabase = getAnonServerClient();
  if (!supabase) return null;

  const [nodesRes, edgesRes, pagesRes] = await Promise.all([
    supabase.from("nodes").select("id,label,type,description"),
    supabase.from("edges").select("source_id,target_id,relationship"),
    supabase.from("wiki_pages").select("id,title,slug,episode_number,tags,description"),
  ]);

  if (nodesRes.error || edgesRes.error) return null;

  return {
    nodes: (nodesRes.data ?? []) as GraphNodeRow[],
    edges: (edgesRes.data ?? []) as GraphEdgeRow[],
    pages: (pagesRes.data ?? []) as GraphWikiPageRow[],
  };
}
