"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import * as d3 from "d3";

// ── Types ─────────────────────────────────────────────────────────────────────

type GraphNode = d3.SimulationNodeDatum & {
  id: string;
  label: string;
  type: "episode" | "concept" | "resource";
  description?: string;
};

type GraphEdge = d3.SimulationLinkDatum<GraphNode> & {
  relationship: string;
};

const NODE_COLOR: Record<string, string> = {
  episode: "#1E6B52",
  concept: "#0d9488",
  resource: "#FFD602",
};

// ── Graph types ───────────────────────────────────────────────────────────────

type GraphWikiPage = {
  id: string;
  title: string;
  slug: string;
  episode_number: number;
  tags: string[];
  description: string;
};

type NodeModal = {
  node: GraphNode & { description?: string };
  wikiPage?: GraphWikiPage | null;
} | null;

// ── Node popup ────────────────────────────────────────────────────────────────

function NodePopup({ modal, onClose }: { modal: NodeModal; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const update = () => setPortalTarget(document.fullscreenElement ?? null);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  if (!modal || !mounted) return null;
  const { node, wikiPage } = modal;

  const accentColor = NODE_COLOR[node.type] || "#888";
  const target = portalTarget ?? document.body;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 999999, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full" style={{ background: accentColor }} />

        <div className="p-8">
          {node.type === "episode" && (
            <div className="flex flex-col gap-5">
              <div className="flex justify-between items-start">
                <div>
                  {wikiPage && (
                    <span
                      className="inline-block px-2 py-0.5 rounded font-label-sm text-label-sm mb-2 text-white uppercase tracking-widest"
                      style={{ background: accentColor }}
                    >
                      Episode #{wikiPage.episode_number}
                    </span>
                  )}
                  <h2 className="font-headline-md text-headline-md text-on-surface leading-tight">
                    {node.label}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-outline hover:text-on-surface transition-colors p-1 shrink-0"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {wikiPage?.tags && wikiPage.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {wikiPage.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full font-label-sm text-label-sm bg-secondary-container text-on-secondary-container"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {wikiPage?.description && (
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {wikiPage.description}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                {wikiPage?.slug ? (
                  <Link
                    href={`/topics/${wikiPage.slug}`}
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white hover:opacity-90 transition-all active:scale-[0.98]"
                    style={{ background: accentColor }}
                  >
                    Open Wiki Page
                    <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  </Link>
                ) : null}
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl font-bold text-sm border border-outline-variant hover:bg-surface-container-low transition-colors text-on-surface-variant"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {node.type === "concept" && (
            <div className="flex flex-col gap-5">
              <div className="flex justify-between items-start">
                <div>
                  <span
                    className="inline-block px-2 py-0.5 rounded font-label-sm text-label-sm mb-2 uppercase tracking-widest text-white"
                    style={{ background: accentColor }}
                  >
                    Concept
                  </span>
                  <h2
                    className="font-headline-md text-headline-md leading-tight"
                    style={{ color: accentColor }}
                  >
                    {node.label}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-outline hover:text-on-surface transition-colors p-1 shrink-0"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {node.description && (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {node.description}
                </p>
              )}

              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl font-bold text-sm border-2 transition-colors hover:text-white"
                style={{ borderColor: accentColor, color: accentColor }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = accentColor;
                  (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = accentColor;
                }}
              >
                Close
              </button>
            </div>
          )}

          {node.type === "resource" && (
            <div className="flex flex-col gap-5">
              <div className="flex justify-between items-start">
                <div>
                  <span
                    className="inline-block px-2 py-0.5 rounded font-label-sm text-label-sm mb-2 uppercase tracking-widest font-bold"
                    style={{ background: "#FFD60222", color: "#b49401" }}
                  >
                    Research Entity
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface leading-tight">
                    {node.label}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-outline hover:text-on-surface transition-colors p-1 shrink-0"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {node.description && (
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {node.description}
                </p>
              )}

              <div className="flex gap-3">
                <a
                  href={`https://pubchem.ncbi.nlm.nih.gov/compound/${encodeURIComponent(node.label)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 transition-colors hover:text-white"
                  style={{ borderColor: accentColor, color: accentColor }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = accentColor;
                    (e.currentTarget as HTMLAnchorElement).style.color = "#181c1a";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                    (e.currentTarget as HTMLAnchorElement).style.color = accentColor;
                  }}
                >
                  <span className="material-symbols-outlined text-[16px]">science</span>
                  Search PubChem
                </a>
                <button
                  onClick={onClose}
                  className="px-6 py-3 rounded-xl font-bold text-sm border border-outline-variant hover:bg-surface-container-low transition-colors text-on-surface-variant"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    target
  );
}

// ── Knowledge Graph Tab ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySelection = any;

function GraphTab({ user }: { user: unknown }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<d3.Selection<SVGSVGElement, unknown, null, undefined> | null>(null);
  const zoomRef      = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodSelRef    = useRef<AnySelection>(null);
  const linkSelRef   = useRef<AnySelection>(null);
  const rawNodesRef  = useRef<(GraphNode & { description?: string })[]>([]);
  const dimsRef      = useRef({ W: 0, H: 0 });
  const searchRef    = useRef("");
  const zoomKRef     = useRef(1);

  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError,   setGraphError]   = useState<string | null>(null);
  const [modal,        setModal]        = useState<NodeModal>(null);
  const [graphSearch,  setGraphSearch]  = useState("");
  const [lodLabel,     setLodLabel]     = useState("Full Detail");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setModal(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const applyVisibility = useCallback((zoomK: number, query: string) => {
    const nodSel  = nodSelRef.current;
    const linkSel = linkSelRef.current;
    if (!nodSel || !linkSel) return;

    if (query) {
      const q        = query.toLowerCase();
      const matchIds = new Set(
        rawNodesRef.current
          .filter((d) => d.label.toLowerCase().includes(q))
          .map((d) => d.id)
      );
      nodSel
        .style("display", null)
        .style("opacity", (d: GraphNode) => (matchIds.has(d.id) ? 1 : 0.06));
      linkSel.style("display", null).style("opacity", 0.03);
      return;
    }

    nodSel
      .style("opacity", 1)
      .style("display", (d: GraphNode) => {
        if (zoomK < 0.5) return d.type === "episode"  ? null : "none";
        if (zoomK < 1.0) return d.type === "resource" ? "none" : null;
        return null;
      });
    linkSel
      .style("opacity", 0.15)
      .style("display", (d: GraphEdge) => {
        const s = d.source as GraphNode;
        const t = d.target as GraphNode;
        if (zoomK < 0.5) return s.type === "episode" && t.type === "episode" ? null : "none";
        if (zoomK < 1.0) return s.type !== "resource" && t.type !== "resource" ? null : "none";
        return null;
      });
  }, []);

  useEffect(() => {
    searchRef.current = graphSearch;
    applyVisibility(zoomKRef.current, graphSearch);

    if (!graphSearch) return;
    const q   = graphSearch.toLowerCase();
    const hit = rawNodesRef.current.find((d) => d.label.toLowerCase().includes(q));
    if (!hit || hit.x == null || hit.y == null) return;

    const { W, H } = dimsRef.current;
    const scale = 2;
    svgRef.current?.transition().duration(700).call(
      zoomRef.current!.transform,
      d3.zoomIdentity.translate(W / 2 - hit.x * scale, H / 2 - hit.y * scale).scale(scale)
    );
  }, [graphSearch, applyVisibility]);

  const initGraph = useCallback(async () => {
    if (!containerRef.current) return;
    setGraphLoading(true);
    setGraphError(null);
    setGraphSearch("");
    searchRef.current = "";

    const [nodesRes, edgesRes, pagesRes] = await Promise.all([
      supabase.from("nodes").select("id,label,type,description"),
      supabase.from("edges").select("source_id,target_id,relationship"),
      supabase.from("wiki_pages").select("id,title,slug,episode_number,tags,description"),
    ]);

    if (nodesRes.error || edgesRes.error) {
      setGraphError("Failed to load graph data.");
      setGraphLoading(false);
      return;
    }

    const rawNodes = (nodesRes.data || []).map((n) => ({
      id: n.id, label: n.label,
      type: n.type as "episode" | "concept" | "resource",
      description: n.description as string | undefined,
    }));
    rawNodesRef.current = rawNodes;

    const wikiByTitle = new Map<string, GraphWikiPage>(
      (pagesRes.data || []).map((p: GraphWikiPage) => [p.title, p])
    );

    const nodeById = new Map(rawNodes.map((n) => [n.id, n]));
    const edgeData = edgesRes.data || [];

    const rawEdges: GraphEdge[] = edgeData
      .filter((e) => nodeById.has(e.source_id) && nodeById.has(e.target_id))
      .map((e) => ({ source: e.source_id, target: e.target_id, relationship: e.relationship }));

    const degree = new Map<string, number>();
    for (const e of edgeData) {
      degree.set(e.source_id, (degree.get(e.source_id) || 0) + 1);
      degree.set(e.target_id, (degree.get(e.target_id) || 0) + 1);
    }

    function nodeRadius(d: GraphNode): number {
      const deg = degree.get(d.id) || 0;
      if (d.type === "episode") return Math.min(18 + deg * 1.5, 36);
      if (d.type === "concept") return Math.min(7  + deg * 1.8, 22);
      return                          Math.min(4  + deg * 0.8, 12);
    }

    const adj = new Map<string, string[]>();
    for (const e of edgeData) {
      if (!adj.has(e.source_id)) adj.set(e.source_id, []);
      if (!adj.has(e.target_id)) adj.set(e.target_id, []);
      adj.get(e.source_id)!.push(e.target_id);
      adj.get(e.target_id)!.push(e.source_id);
    }

    const nodeEpisode = new Map<string, GraphNode & { description?: string }>();
    for (const n of rawNodes) {
      if (n.type === "episode") continue;
      for (const nbrId of adj.get(n.id) || []) {
        const nbr = nodeById.get(nbrId);
        if (nbr?.type === "episode") { nodeEpisode.set(n.id, nbr); break; }
      }
    }

    const container = containerRef.current;
    d3.select(container).selectAll("*").remove();

    const W = container.clientWidth;
    const H = container.clientHeight;
    dimsRef.current = { W, H };

    const svg = d3.select(container)
      .append("svg")
      .attr("width", "100%").attr("height", "100%")
      .style("background", "#111").style("cursor", "grab")
      .style("touch-action", "none");
    svgRef.current = svg;

    const defs   = svg.append("defs");
    const dotPat = defs.append("pattern")
      .attr("id", "hub-dot-grid")
      .attr("width", 40).attr("height", 40)
      .attr("patternUnits", "userSpaceOnUse");
    dotPat.append("circle").attr("cx", 2).attr("cy", 2).attr("r", 1)
      .attr("fill", "rgba(255,255,255,0.07)");
    svg.append("rect").attr("width", "100%").attr("height", "100%")
      .attr("fill", "url(#hub-dot-grid)");

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (e) => {
        g.attr("transform", e.transform.toString());
        svg.style("cursor", e.sourceEvent?.type === "mousedown" ? "grabbing" : "grab");

        const k = e.transform.k;
        zoomKRef.current = k;
        setLodLabel(k < 0.5 ? "Overview" : k < 1 ? "Podcasts + Concepts" : "Full Detail");

        if (!searchRef.current) applyVisibility(k, "");
      });
    svg.call(zoomBehavior);
    zoomRef.current = zoomBehavior;

    svg.on("dblclick.zoom", null);
    svg.on("dblclick", () =>
      svg.transition().duration(500).call(
        zoomBehavior.transform,
        d3.zoomIdentity.translate(W / 2, H / 2).scale(1)
      )
    );
    svg.on("click", () => setModal(null));

    const g = svg.append("g");

    const linkSel = g.append("g")
      .selectAll<SVGLineElement, GraphEdge>("line")
      .data(rawEdges).join("line")
      .attr("stroke", "rgba(255,255,255,0.15)")
      .attr("stroke-width", 1);
    linkSelRef.current = linkSel;

    const nodeSel = g.append("g")
      .selectAll<SVGGElement, GraphNode>("g")
      .data(rawNodes as GraphNode[]).join("g")
      .style("cursor", "pointer");
    nodSelRef.current = nodeSel;

    nodeSel.append("circle")
      .attr("r",      (d) => nodeRadius(d))
      .attr("fill",   (d) => NODE_COLOR[d.type] || "#888")
      .attr("filter", (d) =>
        `drop-shadow(0 0 ${d.type === "episode" ? 10 : 5}px ${NODE_COLOR[d.type]}99)`
      );

    nodeSel.append("text")
      .text((d) => d.label.length > 22 ? d.label.slice(0, 20) + "…" : d.label)
      .attr("y", (d) => nodeRadius(d) + 13)
      .attr("text-anchor", "middle")
      .attr("fill", "#9ca3af")
      .attr("font-size",   (d) => d.type === "episode" ? "10px" : "8px")
      .attr("font-weight", (d) => d.type === "episode" ? "600" : "400")
      .attr("font-family", "Inter, sans-serif")
      .attr("pointer-events", "none");

    nodeSel.on("click", (event, d) => {
      event.stopPropagation();
      const wikiPage = d.type === "episode" ? (wikiByTitle.get(d.label) ?? null) : undefined;
      setModal({ node: d, wikiPage });
    });

    nodeSel.call(
      d3.drag<SVGGElement, GraphNode>()
        .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag",  (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end",   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = d.x; d.fy = d.y; })
    );

    const sim = d3.forceSimulation<GraphNode>(rawNodes)
      .alphaDecay(0.04)
      .force("link",
        d3.forceLink<GraphNode, GraphEdge>(rawEdges)
          .id((d) => d.id)
          .distance((d) => {
            const s = d.source as GraphNode, t = d.target as GraphNode;
            if (s.type === "episode" || t.type === "episode") return 110;
            if (s.type === "concept" && t.type === "concept")  return 200;
            return 60;
          })
          .strength((d) => {
            const s = d.source as GraphNode, t = d.target as GraphNode;
            return (s.type === "episode" || t.type === "episode") ? 0.9 : 0.25;
          })
      )
      .force("charge",
        d3.forceManyBody<GraphNode>().strength((d) =>
          d.type === "episode" ? -2200 : d.type === "concept" ? -180 : -60
        )
      )
      .force("x", d3.forceX<GraphNode>(W / 2).strength(0.04))
      .force("y", d3.forceY<GraphNode>(H / 2).strength(0.04))
      .force("collision",
        d3.forceCollide<GraphNode>().radius((d) => nodeRadius(d) + 14)
      );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sim.force("cluster", ((alpha: number) => {
      for (const node of rawNodes) {
        if (node.type === "episode") continue;
        const parent = nodeEpisode.get(node.id);
        if (!parent) continue;
        const n = node as GraphNode;
        const p = parent as GraphNode;
        const strength = 0.6 * alpha;
        (n as { vx?: number }).vx = ((n as { vx?: number }).vx || 0) + ((p.x ?? 0) - (n.x ?? 0)) * strength;
        (n as { vy?: number }).vy = ((n as { vy?: number }).vy || 0) + ((p.y ?? 0) - (n.y ?? 0)) * strength;
      }
    }) as unknown as d3.Force<GraphNode, GraphEdge>);

    sim.on("tick", () => {
      linkSel
        .attr("x1", (d) => (d.source as GraphNode).x ?? 0)
        .attr("y1", (d) => (d.source as GraphNode).y ?? 0)
        .attr("x2", (d) => (d.target as GraphNode).x ?? 0)
        .attr("y2", (d) => (d.target as GraphNode).y ?? 0);
      nodeSel.attr("transform", (d) =>
        `translate(${(d as GraphNode).x ?? 0},${(d as GraphNode).y ?? 0})`
      );
    });

    sim.on("end", () => {
      rawNodes.forEach((d) => { (d as GraphNode).fx = (d as GraphNode).x; (d as GraphNode).fy = (d as GraphNode).y; });
    });

    svg.call(zoomBehavior.transform, d3.zoomIdentity.translate(W / 2, H / 2).scale(1));
    setGraphLoading(false);
  }, [applyVisibility]);

  useEffect(() => { if (user) initGraph(); }, [user, initGraph]);

  function zoomIn()    { svgRef.current?.transition().duration(300).call(zoomRef.current!.scaleBy, 1.4); }
  function zoomOut()   { svgRef.current?.transition().duration(300).call(zoomRef.current!.scaleBy, 0.7); }
  function fullscreen(){ containerRef.current?.requestFullscreen?.(); }

  if (!user) {
    return (
      <div className="h-[700px] bg-surface-container-low flex flex-col items-center justify-center text-center px-gutter rounded-xl border border-outline-variant">
        <div className="w-24 h-24 bg-primary-container rounded-full flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-white text-5xl">lock</span>
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Deep Discovery Network</h2>
        <p className="text-on-surface-variant font-body-md text-body-md max-w-md mb-8">
          Register your institutional account to explore the interactive relationship graph between podcast
          episodes, clinical concepts, and research papers.
        </p>
        <div className="flex gap-4">
          <Link href="/register">
            <button className="px-8 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary-container transition-all active:scale-95">
              Register for Access
            </button>
          </Link>
          <Link href="/login">
            <button className="px-8 py-3 border border-outline text-primary font-bold rounded-full hover:bg-white transition-all active:scale-95">
              Sign In
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <NodePopup modal={modal} onClose={() => setModal(null)} />

      <div className="h-[450px] md:h-[700px] knowledge-graph-canvas rounded-xl overflow-hidden relative border border-outline-variant">
        <div ref={containerRef} className="absolute inset-0" />

        {graphLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-teal-400 animate-spin" />
          </div>
        )}

        {graphError && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <p className="text-white/60 text-sm">{graphError}</p>
          </div>
        )}

        {!graphLoading && !graphError && (
          <>
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40 text-[16px]">
                  search
                </span>
                <input
                  type="text"
                  value={graphSearch}
                  onChange={(e) => setGraphSearch(e.target.value)}
                  placeholder="Search nodes…"
                  className="w-52 pl-8 pr-8 py-1.5 rounded-lg bg-black/70 backdrop-blur border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-white/30"
                />
                {graphSearch && (
                  <button
                    onClick={() => setGraphSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                )}
              </div>
              <div className="px-2 py-1 bg-black/50 backdrop-blur rounded text-[10px] text-white/35 text-center">
                {lodLabel}
              </div>
            </div>

            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              {[
                { icon: "add",        action: zoomIn,     title: "Zoom in"    },
                { icon: "remove",     action: zoomOut,    title: "Zoom out"   },
                { icon: "fullscreen", action: fullscreen, title: "Fullscreen" },
              ].map((btn) => (
                <button
                  key={btn.icon}
                  onClick={btn.action}
                  title={btn.title}
                  className="w-9 h-9 bg-black/60 backdrop-blur border border-white/10 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-black/80 transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">{btn.icon}</span>
                </button>
              ))}
            </div>

            <div className="absolute bottom-4 left-4 z-10 bg-black/60 backdrop-blur rounded-lg px-3 py-2 flex items-center gap-4 text-xs text-white/60">
              {[
                { color: "#1E6B52", label: "Podcasts" },
                { color: "#0d9488", label: "Concepts" },
                { color: "#FFD602", label: "Resources" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                  {l.label}
                </div>
              ))}
            </div>

            <div className="absolute bottom-4 right-4 z-10 text-[10px] text-white/25">
              Click node • Scroll to zoom • Double-click to reset
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Route ─────────────────────────────────────────────────────────────────────
//
// Standalone /knowledge-graph route. Structurally lifted verbatim from the
// Knowledge Graph tab in /knowledge-hub (which still exists in parallel this
// step). GraphTab keeps its own nodes/edges/wiki_pages fetch (the wiki_pages
// fetch is duplicated with Podcast's parent fetch by design — left as-is). The
// `user` prop is now sourced from a local useAuth() call.

export default function KnowledgeGraphPage() {
  const { user } = useAuth();

  return (
    <div className="bg-background text-on-background min-h-screen">
      <Navbar />

      <main className="min-h-screen">
        {/* Hero */}
        <section className="py-8 md:py-xl px-gutter max-w-[1280px] mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-[28px] md:font-display-lg md:text-display-lg mb-3 md:mb-4 text-primary font-bold">
              Knowledge Graph
            </h1>
            <p className="text-base md:font-body-lg md:text-body-lg text-on-surface-variant leading-relaxed">
              Explore the frontier of pharmaceutical innovation. Discover the latest research, deep-dive into
              podcasts, and visualize the clinical discovery network.
            </p>
          </div>
        </section>

        <div className="px-gutter max-w-[1280px] mx-auto pb-xl">
          <GraphTab user={user} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
