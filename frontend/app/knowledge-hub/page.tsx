"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import * as d3 from "d3";
import type { DiscoverItem } from "@/app/api/discover/route";
import { DiscoverCard, SkeletonCard } from "@/components/DiscoverCard";

// ── Types ─────────────────────────────────────────────────────────────────────

type WikiPage = {
  id: string;
  episode_number: number;
  title: string;
  tags: string[];
  description: string;
  slug: string;
  image_url: string | null;
};

type GraphNode = d3.SimulationNodeDatum & {
  id: string;
  label: string;
  type: "episode" | "concept" | "resource";
  description?: string;
};

type GraphEdge = d3.SimulationLinkDatum<GraphNode> & {
  relationship: string;
};

const PODCAST_FILTER_CHIPS = [
  "All",
  "Drug Discovery",
  "AI/ML",
  "Clinical Trials",
  "Biomarkers",
  "Degraders",
];

const NODE_COLOR: Record<string, string> = {
  episode: "#1E6B52",
  concept: "#0d9488",
  resource: "#FFD602",
};

// ── Discover tab constants ────────────────────────────────────────────────────

const DISCOVER_FILTERS = [
  { value: "all",   label: "All" },
  { value: "paper", label: "Papers" },
  { value: "grant", label: "Grants" },
  { value: "trial", label: "Trials" },
  { value: "tool",  label: "Tools" },
] as const;

// Debounce a free-text search query before it triggers a live re-fetch.
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

function formatCacheAge(cachedAt: number | null): string | null {
  if (!cachedAt) return null;
  const minutes = Math.floor((Date.now() - cachedAt) / 60_000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `Updated ${hours}h ago`;
}

// ── Discover tab ──────────────────────────────────────────────────────────────

function DiscoverTab({ user }: { user: unknown }) {
  const [items, setItems]             = useState<DiscoverItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [filter, setFilter]           = useState("all");
  const [search, setSearch]           = useState("");
  const [page, setPage]               = useState(1);
  const [interests, setInterests]     = useState<string[]>([]);
  const [personalized, setPersonalized] = useState(false);
  const [fromCache, setFromCache]     = useState(false);
  const [cachedAt, setCachedAt]       = useState<number | null>(null);
  const PAGE_SIZE = 9;

  const debouncedSearch = useDebouncedValue(search, 500);

  // Pull the signed-in user's interests so the live fetch can scope to them.
  useEffect(() => {
    if (!user) {
      setInterests([]);
      return;
    }
    const uid = (user as { id: string }).id;
    supabase
      .from("users")
      .select("interests")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => setInterests(data?.interests ?? []));
  }, [user]);

  // Guards against out-of-order responses clobbering newer ones — e.g. React
  // Strict Mode double-invokes the mount effect below in dev, firing two
  // default (non-refresh) requests, and either can still be in flight when
  // the user clicks Refresh. Each call gets the next sequence number; only
  // the response matching the *current* (most recently dispatched) number is
  // ever committed to state, so a slower, older request can never overwrite
  // a newer one — including an explicit Refresh — no matter which resolves last.
  const requestSeqRef = useRef(0);

  // Live fetch, with a short server-side cache per scope (see /api/discover) so
  // reloading the tab shows the same feed instead of refetching every time.
  // A typed search term overrides interest-scoping for this query; an empty
  // search falls back to interest-scoped (logged in) or general (anonymous).
  const loadFeed = useCallback((force: boolean) => {
    const seq = ++requestSeqRef.current;
    if (force) setRefreshing(true);
    else setLoading(true);

    const params = new URLSearchParams();
    if (debouncedSearch.trim()) {
      params.set("q", debouncedSearch.trim());
    } else if (interests.length > 0) {
      params.set("interests", interests.join(","));
    }
    if (force) params.set("refresh", "1");
    const qs = params.toString();

    fetch(`/api/discover${qs ? `?${qs}` : ""}`)
      .then((r) => r.json())
      .then((data: { items: DiscoverItem[]; personalized?: boolean; fromCache?: boolean; cachedAt?: number }) => {
        if (seq !== requestSeqRef.current) return; // superseded by a newer request — discard
        setItems(data.items ?? []);
        setPersonalized(Boolean(data.personalized));
        setFromCache(Boolean(data.fromCache));
        setCachedAt(data.cachedAt ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (force) setRefreshing(false);
        else setLoading(false);
      });
  }, [debouncedSearch, interests]);

  useEffect(() => { loadFeed(false); }, [loadFeed]);

  // Reset pagination whenever a new result set comes in or the type filter changes
  useEffect(() => { setPage(1); }, [filter, debouncedSearch]);

  // Search already drives the live query above — the type pills are a fast,
  // client-side filter over whatever the live fetch returned.
  const filtered = items.filter((item) => filter === "all" || item.type === filter);

  const shown   = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = shown.length < filtered.length;

  return (
    <>
      {/* Personalization banner — logged-out users only */}
      {!user && (
        <section className="px-gutter max-w-[1280px] mx-auto mb-8">
          <div className="bg-primary p-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-md">
            <div className="text-white text-center md:text-left">
              <h2 className="font-headline-md text-headline-md mb-1">Tailor your research experience</h2>
              <p className="font-body-md text-body-md opacity-90">
                Sign in to personalize your feed and get research recommendations based on your profile.
              </p>
            </div>
            <Link href="/login?callbackUrl=/knowledge-hub" className="shrink-0">
              <button className="whitespace-nowrap px-8 py-3 bg-white text-primary font-bold rounded-lg hover:bg-surface-container-low transition-colors shadow-sm">
                Sign in to personalize
              </button>
            </Link>
          </div>
        </section>
      )}

      {/* Search & filters */}
      <section className="px-gutter max-w-[1280px] mx-auto mb-8">
        <div className="space-y-4 md:space-y-6">
          {/* Personalization + cache-age indicators, and a manual refresh control */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {personalized && (
                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-[14px] text-primary">auto_awesome</span>
                  <span className="text-[11px] font-bold text-primary">Personalized to your interests</span>
                </div>
              )}
              {fromCache && formatCacheAge(cachedAt) && (
                <span className="text-[11px] text-on-surface-variant">
                  {formatCacheAge(cachedAt)} · showing cached results
                </span>
              )}
            </div>
            <button
              onClick={() => loadFeed(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-outline-variant text-on-surface-variant text-[11px] font-bold hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            >
              <span
                className={`material-symbols-outlined text-[14px] ${refreshing ? "animate-spin" : ""}`}
              >
                refresh
              </span>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search papers, grants, trials, tools..."
              className="w-full pl-12 pr-12 py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm font-body-md text-body-md"
            />
            {loading && (
              <span className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            )}
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap gap-2">
            {DISCOVER_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-5 py-2 rounded-full font-medium font-label-sm text-label-sm transition-all ${
                  filter === f.value
                    ? "bg-primary text-white shadow-sm"
                    : "border border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Discovery grid */}
      <section className="px-gutter max-w-[1280px] mx-auto pb-xl">
        {/* Loading skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && shown.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">
              search_off
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
              No results found
            </h3>
            <p className="text-on-surface-variant mb-6">
              Try adjusting your filters or search keywords.
            </p>
            <button
              onClick={() => { setFilter("all"); setSearch(""); }}
              className="px-8 py-3 bg-primary text-white rounded-full font-bold shadow-sm hover:bg-primary-container transition-all"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Cards */}
        {!loading && shown.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shown.map((item) => (
                <DiscoverCard key={item.id} item={item} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-12 flex justify-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="px-10 py-3 border-2 border-primary text-primary font-bold rounded-full hover:bg-primary/5 transition-all"
                >
                  Load More Resources
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

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

// ── Researcher types ──────────────────────────────────────────────────────────

type ResearcherCard = {
  id: string;
  name: string;
  email: string;
  affiliation: string | null;
  institution: string | null;
  bio: string | null;
  research_focus: string | null;
  interests: string[] | null;
  is_public: boolean;
  profile_slug: string | null;
};

type WorkCount = { papers: number; tools: number; datasets: number };

const RESEARCHER_AVATAR_COLORS = [
  { bg: "bg-primary-container", text: "text-on-primary-container" },
  { bg: "bg-secondary-container", text: "text-on-secondary-container" },
  { bg: "bg-tertiary-container", text: "text-on-tertiary-container" },
  { bg: "bg-surface-container-high", text: "text-on-surface-variant" },
];

function researcherInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function researcherAvatarColor(name: string) {
  return RESEARCHER_AVATAR_COLORS[name.charCodeAt(0) % RESEARCHER_AVATAR_COLORS.length];
}

// ── Profile banner ────────────────────────────────────────────────────────────

function ProfileBanner({ user }: { user: unknown }) {
  const [isPublic, setIsPublic] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    const uid = (user as { id: string }).id;
    supabase
      .from("users")
      .select("is_public")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => {
        setIsPublic(data?.is_public ?? false);
      });
  }, [user]);

  if (!user || isPublic === null || isPublic === true) return null;

  return (
    <section className="px-gutter max-w-[1280px] mx-auto mb-6">
      <div className="flex items-center justify-between gap-4 px-5 py-3 bg-secondary-container/30 border border-secondary-container rounded-xl">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">person_search</span>
          <p className="text-sm text-on-surface font-medium">
            Want other researchers to find you?{" "}
            <span className="text-on-surface-variant">Complete your researcher profile.</span>
          </p>
        </div>
        <Link href="/profile/setup">
          <button className="shrink-0 px-4 py-2 bg-primary text-white text-xs font-bold rounded-full hover:opacity-90 transition-all">
            Set up profile →
          </button>
        </Link>
      </div>
    </section>
  );
}

// ── Researchers Tab ───────────────────────────────────────────────────────────

const AFFILIATION_FILTERS = ["All", "Academic", "Industry", "Student"] as const;
type AffiliationFilter = (typeof AFFILIATION_FILTERS)[number];

function ResearchersTab() {
  const [researchers, setResearchers] = useState<ResearcherCard[]>([]);
  const [workCounts, setWorkCounts] = useState<Map<string, WorkCount>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [affFilter, setAffFilter] = useState<AffiliationFilter>("All");

  useEffect(() => {
    async function load() {
      const [resRes, worksRes] = await Promise.all([
        supabase
          .from("users")
          .select(
            "id, name, email, affiliation, institution, bio, research_focus, interests, is_public, profile_slug"
          )
          .eq("is_public", true)
          .order("name"),
        supabase
          .from("researcher_works")
          .select("user_id, type"),
      ]);

      setResearchers(resRes.data ?? []);

      const counts = new Map<string, WorkCount>();
      for (const w of worksRes.data ?? []) {
        if (!counts.has(w.user_id))
          counts.set(w.user_id, { papers: 0, tools: 0, datasets: 0 });
        const c = counts.get(w.user_id)!;
        if (w.type === "paper") c.papers++;
        else if (w.type === "tool") c.tools++;
        else if (w.type === "dataset") c.datasets++;
      }
      setWorkCounts(counts);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = researchers.filter((r) => {
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      (r.institution ?? "").toLowerCase().includes(q) ||
      (r.research_focus ?? "").toLowerCase().includes(q) ||
      (r.interests ?? []).some((i) => i.toLowerCase().includes(q));

    const matchAff =
      affFilter === "All" ||
      (r.affiliation ?? "").toLowerCase().includes(affFilter.toLowerCase());

    return matchSearch && matchAff;
  });

  if (loading) {
    return (
      <section className="px-gutter max-w-[1280px] mx-auto pb-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-outline-variant/40 p-lg animate-pulse h-64"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Search + filter bar */}
      <section className="px-gutter max-w-[1280px] mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-md">
          <div className="relative w-full md:max-w-xl">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, institution, or research area…"
              className="w-full pl-12 pr-4 py-3 bg-white border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {AFFILIATION_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setAffFilter(f)}
                className={`shrink-0 px-4 py-1.5 rounded-full font-label-sm text-label-sm border transition-all ${
                  affFilter === f
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-on-surface-variant border-outline-variant hover:border-primary hover:text-primary"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="px-gutter max-w-[1280px] mx-auto pb-xl">
        {filtered.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">
              person_search
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
              No researchers found
            </h3>
            <p className="text-on-surface-variant mb-6">
              Try adjusting your search or filter.
            </p>
            <button
              onClick={() => { setSearch(""); setAffFilter("All"); }}
              className="px-8 py-3 bg-primary text-white rounded-full font-bold shadow-sm hover:opacity-90"
            >
              Clear filters
            </button>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {filtered.map((r) => {
              const color = researcherAvatarColor(r.name);
              const counts = workCounts.get(r.id) ?? { papers: 0, tools: 0, datasets: 0 };
              return (
                <div
                  key={r.id}
                  className="bg-white border border-outline-variant/40 rounded-xl p-lg flex flex-col transition-all duration-300 hover:shadow-md hover:border-primary"
                >
                  <div className="flex items-start justify-between mb-md">
                    <div
                      className={`w-16 h-16 rounded-full ${color.bg} ${color.text} flex items-center justify-center font-bold text-headline-md font-headline-md ring-4 ring-primary-fixed/20`}
                    >
                      {researcherInitials(r.name)}
                    </div>
                  </div>

                  <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">
                    {r.name}
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-md leading-snug">
                    {r.institution || r.affiliation || "Independent Researcher"}
                  </p>

                  {r.research_focus && (
                    <div className="mb-md">
                      <p className="font-label-sm text-label-sm text-primary uppercase tracking-wider mb-xs">
                        Research Focus
                      </p>
                      <p
                        className="font-body-md text-body-md text-on-surface font-medium line-clamp-2"
                        title={r.research_focus ?? undefined}
                      >
                        {r.research_focus}
                      </p>
                    </div>
                  )}

                  {(r.interests?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-xs mb-lg">
                      {(r.interests ?? []).slice(0, 3).map((interest) => (
                        <span
                          key={interest}
                          className="px-3 py-1 rounded bg-secondary-fixed-dim/20 text-secondary font-label-sm text-label-sm"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  )}

                  {(counts.papers > 0 || counts.tools > 0) && (
                    <div className="flex items-center gap-md border-t border-outline-variant/30 pt-md mb-lg">
                      {counts.papers > 0 && (
                        <div className="flex items-center gap-xs">
                          <span className="material-symbols-outlined text-outline text-[18px]">
                            article
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                            {counts.papers} paper{counts.papers !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      {counts.tools > 0 && (
                        <div className="flex items-center gap-xs">
                          <span className="material-symbols-outlined text-outline text-[18px]">
                            build
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                            {counts.tools} tool{counts.tools !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-auto grid grid-cols-2 gap-sm">
                    <Link href={`/researchers/${r.profile_slug}`}>
                      <button className="w-full py-2.5 border border-primary text-primary rounded-lg font-bold font-label-sm text-label-sm hover:bg-primary/5 transition-colors">
                        View Profile
                      </button>
                    </Link>
                    <button
                      onClick={() => window.open("mailto:" + r.email)}
                      className="w-full py-2.5 bg-primary text-on-primary rounded-lg font-bold font-label-sm text-label-sm shadow-sm hover:opacity-90 transition-opacity"
                    >
                      Connect
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Sparse-state CTA — encourages researchers to set up a public profile */}
            <Link href="/profile/setup">
              <div className="bg-surface-container-low border border-dashed border-outline-variant rounded-xl p-lg flex flex-col items-center justify-center text-center h-full hover:bg-surface-container transition-colors">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-md shadow-sm">
                  <span className="material-symbols-outlined text-primary">add</span>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Are you a researcher?</h3>
                <p className="font-body-md text-body-md text-on-surface-variant mb-lg max-w-[240px]">
                  Create your public profile to connect with peers and showcase your latest findings.
                </p>
                <button className="px-6 py-2 rounded-full bg-white border border-outline-variant text-primary font-label-sm text-label-sm hover:border-primary transition-all">
                  Get Started
                </button>
              </div>
            </Link>
          </div>
        )}
      </section>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

function KnowledgeHubInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"discover" | "podcast" | "researchers" | "graph">(
    searchParams.get("tab") === "graph"
      ? "graph"
      : searchParams.get("tab") === "podcast"
      ? "podcast"
      : searchParams.get("tab") === "researchers"
      ? "researchers"
      : "discover"
  );

  const [episodes,     setEpisodes]     = useState<WikiPage[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("wiki_pages")
        .select("id, slug, title, episode_number, description, tags, image_url")
        .order("episode_number", { ascending: false });
      if (error) console.error(error.message);
      setEpisodes(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = episodes.filter((ep) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      ep.title.toLowerCase().includes(q) ||
      ep.tags.some((t) => t.toLowerCase().includes(q));
    const matchesFilter =
      activeFilter === "All" ||
      ep.tags.some((t) =>
        t.toLowerCase().includes(activeFilter.toLowerCase().replace("/", ""))
      );
    return matchesSearch && matchesFilter;
  });

  const TABS = [
    { key: "discover"    as const, label: "Discover" },
    { key: "podcast"     as const, label: "Podcast" },
    { key: "researchers" as const, label: "Researchers" },
    { key: "graph"       as const, label: "Knowledge Graph" },
  ];

  return (
    <div className="bg-background text-on-background min-h-screen">
      <Navbar />

      <main className="min-h-screen">
        {/* Hero */}
        <section className="py-8 md:py-xl px-gutter max-w-[1280px] mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-[28px] md:font-display-lg md:text-display-lg mb-3 md:mb-4 text-primary font-bold">
              Knowledge Hub
            </h1>
            <p className="text-base md:font-body-lg md:text-body-lg text-on-surface-variant leading-relaxed">
              Explore the frontier of pharmaceutical innovation. Discover the latest research, deep-dive into
              podcasts, and visualize the clinical discovery network.
            </p>
          </div>
        </section>

        {/* Profile setup banner — only for logged-in users without a public profile */}
        <ProfileBanner user={user} />

        {/* Tabs */}
        <section className="px-gutter max-w-[1280px] mx-auto mb-6 md:mb-10">
          <div className="flex gap-6 md:gap-10 border-b border-outline-variant overflow-x-auto scrollbar-hide">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`shrink-0 pb-4 min-h-[48px] font-semibold transition-colors text-sm md:text-base whitespace-nowrap ${
                  activeTab === tab.key
                    ? "text-primary border-b-2 border-primary"
                    : "text-on-surface-variant hover:text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* ── Discover Tab ─────────────────────────────────────── */}
        {activeTab === "discover" && <DiscoverTab user={user} />}

        {/* ── Podcast Tab ───────────────────────────────────────── */}
        {activeTab === "podcast" && (
          <div className="block">
            {/* Filters */}
            <section className="px-gutter max-w-[1280px] mx-auto mb-8 md:mb-12">
              {/* Mobile search */}
              <div className="relative mb-4 md:hidden">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  search
                </span>
                <input
                  className="w-full pl-12 pr-4 py-3 min-h-[48px] bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                  placeholder="Search podcast episodes..."
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Mobile filter chips */}
              <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide md:hidden">
                {PODCAST_FILTER_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => setActiveFilter(chip)}
                    className={`px-4 py-2 min-h-[40px] rounded-full font-medium font-label-sm text-label-sm transition-all whitespace-nowrap shrink-0 ${
                      activeFilter === chip
                        ? "bg-primary text-white shadow-sm"
                        : "bg-surface-container-high text-on-surface-variant"
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Desktop layout */}
              <div className="hidden md:flex md:items-center justify-between gap-6">
                <div className="relative w-96">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    search
                  </span>
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md"
                    placeholder="Search podcast episodes, speakers, or topics..."
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {PODCAST_FILTER_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => setActiveFilter(chip)}
                      className={`px-5 py-2 rounded-full font-medium font-label-sm text-label-sm transition-all ${
                        activeFilter === chip
                          ? "bg-primary text-white shadow-sm"
                          : "bg-surface-container-high text-on-surface-variant hover:bg-outline-variant"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Episode grid */}
            <section className="px-gutter max-w-[1280px] mx-auto pb-xl">
              {loading && (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
                    Loading Podcast…
                  </span>
                </div>
              )}

              {!loading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                  <span className="material-symbols-outlined text-5xl text-on-surface-variant">
                    search_off
                  </span>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    No podcast episodes found.
                  </p>
                  <button
                    onClick={() => { setSearch(""); setActiveFilter("All"); }}
                    className="text-primary font-label-sm text-label-sm border-b border-primary/50"
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {!loading && filtered.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                  {filtered.map((ep) => (
                    <Link key={ep.id} href={`/topics/${ep.slug}`}>
                      <div className="group bg-white rounded-xl border border-surface-container-high overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer h-full flex flex-col">
                        <div className="relative h-56 overflow-hidden flex items-center justify-center">
                          <div
                            className="absolute inset-0 transition-transform duration-500 group-hover:scale-110"
                            style={{
                              background:
                                "linear-gradient(135deg, #00523c 0%, #1e6b52 60%, #0d9488 100%)",
                            }}
                          />
                          <span className="material-symbols-outlined text-white/20 text-8xl relative">
                            science
                          </span>
                          {ep.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ep.image_url}
                              alt={ep.title}
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                              onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                          )}
                          <div className="absolute top-4 left-4 bg-primary/90 text-white px-3 py-1 rounded text-[11px] font-bold tracking-widest uppercase">
                            Episode {ep.episode_number}
                          </div>
                        </div>
                        <div className="p-6 flex flex-col flex-1">
                          <div className="flex gap-2 mb-3 flex-wrap">
                            {ep.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container text-[11px] font-bold uppercase tracking-tight"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <h3 className="font-headline-md text-headline-md text-primary mb-2 leading-snug line-clamp-2">
                            {ep.title}
                          </h3>
                          <p className="text-on-surface-variant font-body-md text-body-md line-clamp-2 mb-6 flex-1">
                            {ep.description || "Explore this episode's key concepts and research insights."}
                          </p>
                          <div className="flex items-center justify-between pt-4 border-t border-surface-container">
                            <span className="text-primary font-label-sm text-label-sm hover:underline flex items-center gap-1">
                              Read wiki
                              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                            </span>
                            <div
                              className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center group-hover:scale-110 transition-transform"
                              title="Open episode wiki"
                            >
                              <span
                                className="material-symbols-outlined"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                play_arrow
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── Researchers Tab ───────────────────────────────────── */}
        {activeTab === "researchers" && <ResearchersTab />}

        {/* ── Knowledge Graph Tab ───────────────────────────────── */}
        {activeTab === "graph" && (
          <div className="px-gutter max-w-[1280px] mx-auto pb-xl">
            <GraphTab user={user} />
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default function KnowledgeHubPage() {
  return (
    <Suspense>
      <KnowledgeHubInner />
    </Suspense>
  );
}
