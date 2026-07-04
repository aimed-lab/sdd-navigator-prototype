"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import * as d3 from "d3";

// ── Types ─────────────────────────────────────────────────────────────────────

type NodeType = "episode" | "concept" | "resource";

interface RawNode {
  id: string;
  label: string;
  type: NodeType;
  description: string;
}

interface RawEdge {
  id: string;
  source_id: string;
  target_id: string;
  relationship: string;
}

interface WikiPage {
  id: string;
  title: string;
  slug: string;
  episode_number: number;
  tags: string[] | null;
  description: string | null;
}

interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: NodeType;
  description: string;
}

interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  relationship: string;
}

interface ModalState {
  type: NodeType;
  label: string;
  episodeNumber?: number;
  slug?: string;
  tags?: string[];
  description?: string;
  episodeCount?: number;
  relatedEpisodes?: Array<{ label: string; slug: string }>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const NODE_RADIUS: Record<NodeType, number> = {
  episode: 20,
  concept: 12,
  resource: 8,
};

const NODE_COLOR: Record<NodeType, string> = {
  episode: "#1E6B52",
  concept: "#0d9488",
  resource: "#FFD602",
};

const NODE_GLOW: Record<NodeType, string> = {
  episode: "rgba(30,107,82,0.8)",
  concept: "rgba(13,148,136,0.6)",
  resource: "rgba(255,214,2,0.5)",
};

function edgeColor(srcType: NodeType, tgtType: NodeType): string {
  if (srcType === "episode" && tgtType === "concept") return "#1E6B52";
  if (srcType === "concept" && tgtType === "concept") return "#4B5563";
  if (srcType === "episode" && tgtType === "resource") return "#FFD602";
  return "#4B5563";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GraphPage() {
  const { user, loading: authLoading } = useAuth();
  const graphContainerRef = useRef<HTMLDivElement>(null);

  const [modal, setModal] = useState<ModalState | null>(null);
  const [fsTarget, setFsTarget] = useState<Element | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Set<NodeType>>(
    new Set(["episode", "concept", "resource"])
  );
  const [stats, setStats] = useState({ episodes: 0, concepts: 0, resources: 0 });
  const [dataLoading, setDataLoading] = useState(true);
  const [graphError, setGraphError] = useState<string | null>(null);

  const d3SearchRef = useRef<((q: string) => void) | null>(null);
  const d3FilterRef = useRef<((types: Set<NodeType>) => void) | null>(null);
  const d3ZoomInRef = useRef<(() => void) | null>(null);
  const d3ZoomOutRef = useRef<(() => void) | null>(null);
  const d3ResetRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const update = () => setFsTarget(document.fullscreenElement ?? null);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  const toggleFilter = useCallback((type: NodeType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type) && next.size > 1) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  // Propagate React filter/search state into D3
  useEffect(() => {
    d3SearchRef.current?.(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    d3FilterRef.current?.(activeFilters);
  }, [activeFilters]);

  // ── D3 graph init ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !graphContainerRef.current) return;

    const container = graphContainerRef.current;
    let cancelled = false;

    async function init() {
      try {
        setDataLoading(true);
        setGraphError(null);

        const [nodesRes, edgesRes, pagesRes] = await Promise.all([
          supabase.from("nodes").select("id,label,type,description"),
          supabase.from("edges").select("id,source_id,target_id,relationship"),
          supabase
            .from("wiki_pages")
            .select("id,title,slug,episode_number,tags,description"),
        ]);

        if (cancelled) return;

        const rawNodes: RawNode[] = (nodesRes.data as RawNode[]) || [];
        const rawEdges: RawEdge[] = (edgesRes.data as RawEdge[]) || [];
        const wikiPages: WikiPage[] = (pagesRes.data as WikiPage[]) || [];

        if (rawNodes.length === 0) {
          setDataLoading(false);
          setGraphError(
            "No graph data yet. Run the backend pipeline to generate knowledge graph data."
          );
          return;
        }

        // Build lookup maps
        const nodeById = new Map<string, RawNode>(rawNodes.map((n) => [n.id, n]));
        const pageByTitle = new Map<string, WikiPage>(wikiPages.map((p) => [p.title, p]));

        // concept node id → [{label, slug}] from episode→concept edges
        const conceptToEpisodes = new Map<string, Array<{ label: string; slug: string }>>();
        for (const edge of rawEdges) {
          const src = nodeById.get(edge.source_id);
          const tgt = nodeById.get(edge.target_id);
          if (src?.type === "episode" && tgt?.type === "concept") {
            const page = pageByTitle.get(src.label);
            const list = conceptToEpisodes.get(tgt.id) || [];
            list.push({ label: src.label, slug: page?.slug || "" });
            conceptToEpisodes.set(tgt.id, list);
          }
        }

        setStats({
          episodes: rawNodes.filter((n) => n.type === "episode").length,
          concepts: rawNodes.filter((n) => n.type === "concept").length,
          resources: rawNodes.filter((n) => n.type === "resource").length,
        });

        const d3Nodes: D3Node[] = rawNodes.map((n) => ({
          id: n.id,
          label: n.label,
          type: n.type,
          description: n.description,
        }));

        const d3Links: D3Link[] = rawEdges
          .filter((e) => nodeById.has(e.source_id) && nodeById.has(e.target_id))
          .map((e) => ({
            source: e.source_id,
            target: e.target_id,
            relationship: e.relationship,
          }));

        // ── Build D3 scene ─────────────────────────────────────────────────
        d3.select(container).selectAll("*").remove();

        const width = container.clientWidth;
        const height = container.clientHeight;

        const svg = d3
          .select(container)
          .append("svg")
          .attr("width", "100%")
          .attr("height", "100%")
          .style("background", "#0f0f0f")
          .style("cursor", "grab");

        // Dot grid
        const defs = svg.append("defs");
        const dotPat = defs
          .append("pattern")
          .attr("id", "dot-grid-g")
          .attr("x", 0).attr("y", 0)
          .attr("width", 40).attr("height", 40)
          .attr("patternUnits", "userSpaceOnUse");
        dotPat.append("circle")
          .attr("cx", 1).attr("cy", 1).attr("r", 1)
          .attr("fill", "rgba(255,255,255,0.06)");

        svg.append("rect")
          .attr("width", "100%").attr("height", "100%")
          .attr("fill", "url(#dot-grid-g)");

        // Glow filters per node type
        for (const [type] of Object.entries(NODE_COLOR)) {
          const filt = defs.append("filter").attr("id", `glow-${type}`);
          filt.append("feGaussianBlur")
            .attr("stdDeviation", "5").attr("result", "blur");
          const merge = filt.append("feMerge");
          merge.append("feMergeNode").attr("in", "blur");
          merge.append("feMergeNode").attr("in", "SourceGraphic");
        }

        // Zoom/pan group
        const g = svg.append("g").attr("class", "graph-root");

        const zoomBehavior = d3
          .zoom<SVGSVGElement, unknown>()
          .scaleExtent([0.05, 5])
          .on("zoom", (event) => {
            g.attr("transform", event.transform.toString());
            svg.style("cursor", event.sourceEvent?.type === "mousedown" ? "grabbing" : "grab");
          });

        svg.call(zoomBehavior);
        // Start centered
        svg.call(
          zoomBehavior.transform,
          d3.zoomIdentity.translate(width / 2, height / 2)
        );

        d3ZoomInRef.current = () =>
          svg.transition().duration(300).call(zoomBehavior.scaleBy, 1.4);
        d3ZoomOutRef.current = () =>
          svg.transition().duration(300).call(zoomBehavior.scaleBy, 0.7);
        d3ResetRef.current = () =>
          svg.transition().duration(500).call(
            zoomBehavior.transform,
            d3.zoomIdentity.translate(width / 2, height / 2)
          );

        // ── Links ──────────────────────────────────────────────────────────
        const linkG = g.append("g").attr("class", "links");
        const linkSel = linkG
          .selectAll<SVGLineElement, D3Link>("line")
          .data(d3Links)
          .join("line")
          .attr("stroke-width", 1.5)
          .attr("stroke-opacity", 0.4)
          .attr("stroke-dasharray", "5,10");

        // ── Nodes ──────────────────────────────────────────────────────────
        const nodeG = g.append("g").attr("class", "nodes");
        const nodeSel = nodeG
          .selectAll<SVGGElement, D3Node>("g.node-grp")
          .data(d3Nodes)
          .join("g")
          .attr("class", (d) => `node-grp node-${d.type}`)
          .style("cursor", "pointer");

        nodeSel
          .append("circle")
          .attr("r", (d) => NODE_RADIUS[d.type])
          .attr("fill", (d) => NODE_COLOR[d.type])
          .attr("filter", (d) => `url(#glow-${d.type})`);

        nodeSel
          .append("text")
          .text((d) =>
            d.label.length > 22 ? d.label.slice(0, 20) + "…" : d.label
          )
          .attr("text-anchor", "middle")
          .attr("y", (d) => NODE_RADIUS[d.type] + 14)
          .attr("fill", "#9ca3af")
          .attr("font-size", "10px")
          .attr("font-family", "Inter, sans-serif")
          .attr("pointer-events", "none");

        // ── Click handler ──────────────────────────────────────────────────
        nodeSel.on("click", (event, d) => {
          event.stopPropagation();
          if (d.type === "episode") {
            const page = pageByTitle.get(d.label);
            setModal({
              type: "episode",
              label: d.label,
              episodeNumber: page?.episode_number,
              slug: page?.slug,
              tags: page?.tags || [],
              description: page?.description || d.description || "",
            });
          } else if (d.type === "concept") {
            const eps = conceptToEpisodes.get(d.id) || [];
            setModal({
              type: "concept",
              label: d.label,
              episodeCount: eps.length,
              relatedEpisodes: eps,
            });
          } else {
            setModal({
              type: "resource",
              label: d.label,
              description: d.description || "",
            });
          }
        });

        svg.on("click", () => setModal(null));

        // ── Drag ───────────────────────────────────────────────────────────
        const drag = d3
          .drag<SVGGElement, D3Node>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          });

        nodeSel.call(drag);

        // ── Force simulation ───────────────────────────────────────────────
        const simulation = d3
          .forceSimulation<D3Node>(d3Nodes)
          .force(
            "link",
            d3
              .forceLink<D3Node, D3Link>(d3Links)
              .id((d) => d.id)
              .distance((d) => {
                const s = d.source as D3Node;
                const t = d.target as D3Node;
                if (s.type === "episode" && t.type === "episode") return 250;
                if (s.type === "episode" || t.type === "episode") return 160;
                return 100;
              })
          )
          .force(
            "charge",
            d3.forceManyBody<D3Node>().strength((d) => {
              if (d.type === "episode") return -500;
              if (d.type === "concept") return -200;
              return -80;
            })
          )
          .force("center", d3.forceCenter(0, 0))
          .force(
            "collision",
            d3
              .forceCollide<D3Node>()
              .radius((d) => NODE_RADIUS[d.type] + 18)
          )
          .alphaDecay(0.04);

        simulation.on("tick", () => {
          linkSel
            .attr("stroke", (d) => {
              const s = d.source as D3Node;
              const t = d.target as D3Node;
              return edgeColor(s.type, t.type);
            })
            .attr("x1", (d) => (d.source as D3Node).x ?? 0)
            .attr("y1", (d) => (d.source as D3Node).y ?? 0)
            .attr("x2", (d) => (d.target as D3Node).x ?? 0)
            .attr("y2", (d) => (d.target as D3Node).y ?? 0);

          nodeSel.attr(
            "transform",
            (d) => `translate(${d.x ?? 0},${d.y ?? 0})`
          );
        });

        // ── D3 search / filter functions exposed to React ──────────────────
        d3SearchRef.current = (query: string) => {
          const q = query.toLowerCase().trim();
          if (!q) {
            nodeSel.style("opacity", 1);
            linkSel.style("opacity", 0.4);
          } else {
            nodeSel.style("opacity", (d) =>
              d.label.toLowerCase().includes(q) ? 1 : 0.08
            );
            linkSel.style("opacity", (d) => {
              const s = d.source as D3Node;
              const t = d.target as D3Node;
              return s.label.toLowerCase().includes(q) ||
                t.label.toLowerCase().includes(q)
                ? 0.4
                : 0.03;
            });
          }
        };

        d3FilterRef.current = (types: Set<NodeType>) => {
          nodeSel.style("display", (d) =>
            types.has(d.type) ? null : "none"
          );
          linkSel.style("display", (d) => {
            const s = d.source as D3Node;
            const t = d.target as D3Node;
            return types.has(s.type) && types.has(t.type) ? null : "none";
          });
        };

        setDataLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error("Graph init error:", err);
          setGraphError("Failed to load graph data. Check your connection.");
          setDataLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      d3SearchRef.current = null;
      d3FilterRef.current = null;
      d3ZoomInRef.current = null;
      d3ZoomOutRef.current = null;
      d3ResetRef.current = null;
    };
  }, [user]);

  // ── Auth states ────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#0f0f0f" }}
      >
        <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  // Lock screen — show instead of redirect
  if (!user) {
    return (
      <div
        className="h-screen flex flex-col overflow-hidden"
        style={{ background: "#0f0f0f" }}
      >
        <style>{graphCss}</style>
        <Navbar />
        <main className="relative flex-1 overflow-hidden">
          {/* Blurred static graph silhouette */}
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <svg className="w-full h-full">
              <defs>
                <pattern id="dot-lock" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.06)" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dot-lock)" />
              {/* decorative static nodes */}
              {[
                [50, 40, 20, "#1E6B52"], [30, 60, 12, "#0d9488"], [70, 55, 12, "#0d9488"],
                [20, 30, 8, "#FFD602"], [80, 35, 8, "#FFD602"], [55, 75, 12, "#0d9488"],
              ].map(([cx, cy, r, fill], i) => (
                <circle
                  key={i}
                  cx={`${cx}%`} cy={`${cy}%`} r={r as number}
                  fill={fill as string}
                  style={{ filter: `drop-shadow(0 0 10px ${fill}aa)` }}
                />
              ))}
            </svg>
          </div>
          <div
            className="absolute inset-0"
            style={{ backdropFilter: "blur(6px)", background: "rgba(0,0,0,0.55)" }}
          />
          {/* Lock card */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="relative z-10 max-w-md w-full text-center flex flex-col items-center gap-8 bg-black/80 backdrop-blur p-10 rounded-2xl border border-white/10">
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(30,107,82,0.15)" }}
              >
                <span
                  className="material-symbols-outlined text-4xl"
                  style={{
                    color: "#1E6B52",
                    fontVariationSettings: "'FILL' 1",
                  }}
                >
                  lock
                </span>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-white">
                  Restricted Access
                </h2>
                <p className="text-sm text-white/50 leading-relaxed">
                  Join researchers already mapping their path to discovery.
                  <br />
                  Register free to explore the full knowledge graph.
                </p>
              </div>
              <div className="flex flex-col w-full gap-4">
                <Link
                  href="/login?callbackUrl=/graph"
                  className="w-full py-3.5 rounded-lg font-semibold flex items-center justify-center gap-2 hover:brightness-110 transition-all"
                  style={{ background: "#1E6B52", color: "#fff" }}
                >
                  <span className="material-symbols-outlined text-xl">login</span>
                  Sign In to Continue
                </Link>
                <p className="text-sm text-white/40">
                  New to SDD Navigator?{" "}
                  <Link
                    href="/register"
                    className="font-semibold hover:underline ml-1"
                    style={{ color: "#0d9488" }}
                  >
                    Register for an account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Main authenticated view ────────────────────────────────────────────────

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: "#0f0f0f" }}
    >
      <style>{graphCss}</style>
      <Navbar />

      <main className="relative flex-1 overflow-hidden">
        {/* D3 graph mounts here */}
        <div ref={graphContainerRef} className="absolute inset-0" />

        {/* Loading overlay */}
        {dataLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-white/10 border-t-teal-400 animate-spin" />
            <span className="text-white/40 text-sm">Loading knowledge graph…</span>
          </div>
        )}

        {/* Error state */}
        {graphError && !dataLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
            <div className="bg-black/60 border border-white/10 rounded-xl p-8 text-center max-w-sm">
              <span className="material-symbols-outlined text-5xl text-white/20 mb-4 block">
                hub
              </span>
              <p className="text-white/50 text-sm">{graphError}</p>
            </div>
          </div>
        )}

        {/* Left Sidebar */}
        {!dataLoading && !graphError && (
          <aside className="absolute left-6 top-6 bottom-6 w-72 z-30 flex flex-col gap-4 pointer-events-none">
            {/* Search + Filters card */}
            <div className="bg-black/70 backdrop-blur-sm border border-white/10 p-4 rounded-xl flex flex-col gap-4 pointer-events-auto">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search graph…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-white/30 mb-2">
                  Filters
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["episode", "concept", "resource"] as NodeType[]).map(
                    (type) => (
                      <button
                        key={type}
                        onClick={() => toggleFilter(type)}
                        className="px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border transition-all"
                        style={{
                          borderColor: activeFilters.has(type)
                            ? NODE_COLOR[type]
                            : "rgba(255,255,255,0.1)",
                          background: activeFilters.has(type)
                            ? `${NODE_COLOR[type]}22`
                            : "transparent",
                          color: activeFilters.has(type)
                            ? NODE_COLOR[type]
                            : "rgba(255,255,255,0.35)",
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: NODE_COLOR[type] }}
                        />
                        {type.charAt(0).toUpperCase() + type.slice(1)}s
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="bg-black/70 backdrop-blur-sm border border-white/10 p-4 rounded-xl pointer-events-auto">
              <p className="text-[11px] uppercase tracking-widest text-white/30 mb-3">
                Graph Legend
              </p>
              <ul className="space-y-2.5">
                {[
                  { type: "episode" as NodeType, label: "Episode", sz: "w-4 h-4" },
                  { type: "concept" as NodeType, label: "Core Concept", sz: "w-3 h-3" },
                  { type: "resource" as NodeType, label: "Entity / Resource", sz: "w-2.5 h-2.5" },
                ].map((item) => (
                  <li key={item.type} className="flex items-center gap-3">
                    <span
                      className={`${item.sz} rounded-full shrink-0`}
                      style={{
                        background: NODE_COLOR[item.type],
                        boxShadow: `0 0 8px ${NODE_GLOW[item.type]}`,
                      }}
                    />
                    <span className="text-sm text-white/55">{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stats */}
            <div className="mt-auto bg-black/60 backdrop-blur-sm border border-white/10 p-4 rounded-xl pointer-events-auto">
              <p className="text-[11px] uppercase tracking-widest text-white/30 mb-3">
                Atlas Inventory
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: stats.episodes, label: "Episodes", color: "#1E6B52" },
                  { val: stats.concepts, label: "Concepts", color: "#0d9488" },
                  { val: stats.resources, label: "Resources", color: "#FFD602" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="text-center p-2 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <p className="text-xl font-bold" style={{ color: s.color }}>
                      {s.val}
                    </p>
                    <p className="text-[10px] text-white/35 uppercase mt-0.5">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Live indicator (top-right of graph area) */}
        {!dataLoading && !graphError && (
          <div className="absolute top-6 right-6 z-30 flex items-center gap-2 pointer-events-none">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
            >
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: "#1E6B52" }}
              />
              <span className="text-[11px] uppercase tracking-widest text-white/40">
                Live Graph
              </span>
            </div>
          </div>
        )}

        {/* Zoom controls (bottom-right) */}
        {!dataLoading && !graphError && (
          <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2">
            {[
              { icon: "add", action: () => d3ZoomInRef.current?.(), title: "Zoom In" },
              { icon: "remove", action: () => d3ZoomOutRef.current?.(), title: "Zoom Out" },
              { icon: "restart_alt", action: () => d3ResetRef.current?.(), title: "Reset View" },
            ].map((btn) => (
              <button
                key={btn.icon}
                onClick={btn.action}
                title={btn.title}
                className="p-3 rounded-lg border border-white/10 transition-all hover:border-teal-500/40"
                style={{
                  background: "rgba(0,0,0,0.7)",
                  color: "rgba(255,255,255,0.55)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span className="material-symbols-outlined">{btn.icon}</span>
              </button>
            ))}
          </div>
        )}

        {/* Modal overlay */}
        {modal && createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{
              zIndex: 999999,
              background: "rgba(0,0,0,0.78)",
              backdropFilter: "blur(10px)",
            }}
            onClick={closeModal}
          >
            <div
              className="w-full max-w-lg rounded-2xl p-8 relative overflow-hidden border border-white/10"
              style={{ background: "#1a1a1a" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Type accent bar */}
              <div
                className="absolute top-0 left-0 w-full h-1"
                style={{ background: NODE_COLOR[modal.type] }}
              />

              {/* ── Episode modal ── */}
              {modal.type === "episode" && (
                <div className="flex flex-col gap-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className="text-[11px] px-2 py-1 rounded mb-2 inline-block uppercase font-semibold tracking-widest"
                        style={{
                          color: "#9ee9c9",
                          background: "rgba(30,107,82,0.15)",
                        }}
                      >
                        {modal.episodeNumber
                          ? `Episode #${modal.episodeNumber}`
                          : "Episode"}
                      </span>
                      <h2
                        className="text-xl font-semibold leading-tight"
                        style={{ color: "#9ee9c9" }}
                      >
                        {modal.label}
                      </h2>
                    </div>
                    <button
                      onClick={closeModal}
                      className="hover:opacity-70 transition-opacity"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {modal.tags && modal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {modal.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 rounded-full text-xs border border-white/10"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            color: "rgba(255,255,255,0.65)",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {modal.description && (
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                      {modal.description}
                    </p>
                  )}

                  <div className="flex gap-3 mt-2">
                    {modal.slug ? (
                      <Link
                        href={`/topics/${modal.slug}`}
                        onClick={closeModal}
                        className="flex-grow text-sm font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all"
                        style={{ background: "#1E6B52", color: "#fff" }}
                      >
                        Open Wiki Page
                        <span className="material-symbols-outlined text-[18px]">
                          open_in_new
                        </span>
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="flex-grow text-sm font-bold py-3 rounded-lg"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.3)",
                        }}
                      >
                        No Wiki Page
                      </button>
                    )}
                    <button
                      onClick={closeModal}
                      className="px-6 py-3 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition-colors"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* ── Concept modal ── */}
              {modal.type === "concept" && (
                <div className="flex flex-col gap-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className="text-[11px] px-2 py-1 rounded mb-2 inline-block uppercase font-semibold tracking-widest"
                        style={{
                          color: "#0d9488",
                          background: "rgba(13,148,136,0.12)",
                        }}
                      >
                        Scientific Concept
                      </span>
                      <h2
                        className="text-xl font-semibold leading-tight"
                        style={{ color: "#0d9488" }}
                      >
                        {modal.label}
                      </h2>
                    </div>
                    <button
                      onClick={closeModal}
                      className="hover:opacity-70 transition-opacity"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  <p
                    className="text-sm"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    Appears in{" "}
                    <span className="font-bold" style={{ color: "#0d9488" }}>
                      {modal.episodeCount ?? 0} episode
                      {(modal.episodeCount ?? 0) !== 1 ? "s" : ""}
                    </span>
                  </p>

                  {modal.relatedEpisodes && modal.relatedEpisodes.length > 0 && (
                    <div>
                      <p className="text-[11px] uppercase tracking-widest text-white/30 mb-2">
                        Related Episodes
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {modal.relatedEpisodes.map((ep) =>
                          ep.slug ? (
                            <Link
                              key={ep.slug}
                              href={`/topics/${ep.slug}`}
                              onClick={closeModal}
                              className="px-3 py-1.5 rounded-lg text-xs border border-white/10 hover:border-teal-500/40 hover:bg-teal-500/5 transition-colors"
                              style={{ color: "rgba(255,255,255,0.65)" }}
                            >
                              {ep.label}
                            </Link>
                          ) : (
                            <span
                              key={ep.label}
                              className="px-3 py-1.5 rounded-lg text-xs border border-white/10"
                              style={{ color: "rgba(255,255,255,0.45)" }}
                            >
                              {ep.label}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={closeModal}
                      className="flex-grow text-sm font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all border"
                      style={{
                        color: "#0d9488",
                        borderColor: "rgba(13,148,136,0.3)",
                        background: "rgba(13,148,136,0.1)",
                      }}
                    >
                      View Related Episodes
                      <span className="material-symbols-outlined text-[18px]">hub</span>
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-6 py-3 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition-colors"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {/* ── Resource modal ── */}
              {modal.type === "resource" && (
                <div className="flex flex-col gap-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className="text-[11px] px-2 py-1 rounded mb-2 inline-block uppercase font-semibold tracking-widest"
                        style={{
                          color: "#FFD602",
                          background: "rgba(255,214,2,0.1)",
                        }}
                      >
                        Research Entity
                      </span>
                      <h2
                        className="text-xl font-semibold leading-tight"
                        style={{ color: "rgba(255,255,255,0.9)" }}
                      >
                        {modal.label}
                      </h2>
                    </div>
                    <button
                      onClick={closeModal}
                      className="hover:opacity-70 transition-opacity"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {modal.description && (
                    <p
                      className="text-sm leading-relaxed"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                      {modal.description}
                    </p>
                  )}

                  <div className="flex gap-3 mt-2">
                    <a
                      href={`https://pubchem.ncbi.nlm.nih.gov/compound/${encodeURIComponent(modal.label)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-grow text-sm font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all border"
                      style={{
                        color: "#FFD602",
                        borderColor: "rgba(255,214,2,0.3)",
                        background: "rgba(255,214,2,0.08)",
                      }}
                    >
                      Read Full Paper
                      <span className="material-symbols-outlined text-[18px]">
                        article
                      </span>
                    </a>
                    <button
                      onClick={closeModal}
                      className="px-6 py-3 rounded-lg text-sm border border-white/10 hover:bg-white/5 transition-colors"
                      style={{ color: "rgba(255,255,255,0.55)" }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          fsTarget ?? document.body
        )}
      </main>
    </div>
  );
}

// ── Injected CSS ───────────────────────────────────────────────────────────────

const graphCss = `
@keyframes node-breathe {
  0%, 100% { opacity: 0.88; }
  50%       { opacity: 1; }
}
@keyframes edge-flow {
  from { stroke-dashoffset: 200; }
  to   { stroke-dashoffset: 0; }
}
.node-episode circle { animation: node-breathe 4s ease-in-out infinite; }
.node-concept  circle { animation: node-breathe 4s ease-in-out infinite 1.3s; }
.node-resource circle { animation: node-breathe 4s ease-in-out infinite 2.6s; }
.links line { animation: edge-flow 20s linear infinite; }
.node-grp:hover circle { opacity: 1 !important; }
`;
