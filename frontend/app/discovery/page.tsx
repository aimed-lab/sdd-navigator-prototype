"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { DiscoverItem } from "@/app/api/discover/route";
import { DiscoverCard, SkeletonCard } from "@/components/DiscoverCard";

// ── Discover tab constants ────────────────────────────────────────────────────

const DISCOVER_FILTERS = [
  { value: "all",   label: "All" },
  { value: "paper", label: "Papers" },
  { value: "grant", label: "Grants" },
  { value: "trial", label: "Trials" },
  { value: "tool",  label: "Tools" },
] as const;

// Curated drug-discovery topics offered as one-click feed scopes. Each value is
// passed verbatim as the `q` scope to /api/discover, so they read as real search
// terms. Merged at render time with the signed-in user's saved interests.
const DISCOVER_TOPICS = [
  "PHGDH inhibitors",
  "Alzheimer's disease",
  "Oncology targets",
  "ADMET / pharmacokinetics",
  "CRISPR screens",
  "Protein-protein interactions",
  "Antibody design",
  "Multi-omics biomarkers",
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
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [page, setPage]               = useState(1);
  const [interests, setInterests]     = useState<string[]>([]);
  const [personalized, setPersonalized] = useState(false);
  const [fromCache, setFromCache]     = useState(false);
  const [cachedAt, setCachedAt]       = useState<number | null>(null);
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [newChip, setNewChip]         = useState("");
  const [savedIds, setSavedIds]       = useState<Set<string>>(new Set());
  const [savedItems, setSavedItems]   = useState<DiscoverItem[]>([]);
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

  // Load the user's saved items once so bookmark state is correct across
  // sessions and the "Saved" view can render straight from stored item_data
  // (no re-fetch of the live sources). Cleared on logout.
  useEffect(() => {
    if (!user) {
      setSavedIds(new Set());
      setSavedItems([]);
      return;
    }
    const uid = (user as { id: string }).id;
    supabase
      .from("saved_items")
      .select("item_id, item_data")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as { item_id: string; item_data: DiscoverItem }[];
        setSavedIds(new Set(rows.map((r) => r.item_id)));
        setSavedItems(rows.map((r) => r.item_data).filter(Boolean));
      });
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
    } else if (activeTopic) {
      params.set("q", activeTopic);
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
  }, [debouncedSearch, activeTopic, interests]);

  useEffect(() => { loadFeed(false); }, [loadFeed]);

  // Reset pagination whenever a new result set comes in or the type filter changes
  useEffect(() => { setPage(1); }, [filter, debouncedSearch, activeTopic]);

  // Persist the user's interests to users.interests and re-scope the feed.
  // Clearing search/topic makes the interest-driven (multi-term) feed the active
  // scope so the change is immediately visible; setInterests re-fires loadFeed.
  const saveInterests = useCallback((next: string[]) => {
    setInterests(next);
    setActiveTopic(null);
    setSearch("");
    if (!user) return;
    const uid = (user as { id: string }).id;
    // Fire-and-forget: the feed already re-scoped locally; a failed write just
    // means it won't persist across reloads, which isn't worth blocking the UI.
    supabase.from("users").update({ interests: next }).eq("id", uid).then(() => {});
  }, [user]);

  const addInterest = (raw: string) => {
    const kw = raw.trim();
    if (!kw) return;
    if (interests.some((i) => i.toLowerCase() === kw.toLowerCase())) { setNewChip(""); return; }
    saveInterests([...interests, kw]);
    setNewChip("");
  };

  const removeInterest = (kw: string) => {
    saveInterests(interests.filter((i) => i !== kw));
  };

  // Optimistic, fire-and-forget bookmark toggle. UI updates immediately; the
  // Supabase write persists it. The unique (user_id, item_id) constraint makes
  // a duplicate insert a no-op-level error we can safely ignore.
  const toggleSave = useCallback((item: DiscoverItem) => {
    if (!user) return;
    const uid = (user as { id: string }).id;
    const isSaved = savedIds.has(item.id);

    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
    setSavedItems((prev) =>
      isSaved
        ? prev.filter((i) => i.id !== item.id)
        : prev.some((i) => i.id === item.id) ? prev : [item, ...prev],
    );

    if (isSaved) {
      supabase.from("saved_items").delete().eq("user_id", uid).eq("item_id", item.id).then(() => {});
    } else {
      supabase.from("saved_items").insert({ user_id: uid, item_id: item.id, item_data: item }).then(() => {});
    }
  }, [user, savedIds]);

  // One-click curated scopes. The signed-in user's own interests are managed
  // separately as editable chips (see "Your interests" below), so they're no
  // longer merged in here — this list stays the fixed "explore more" set.
  const topicChips = DISCOVER_TOPICS;

  // Clicking a topic sets it as the feed scope; clicking the active one again
  // deselects (back to interest-scoped / default). Picking a topic clears any
  // typed search so precedence (search > topic > interests) stays unambiguous.
  const onTopicClick = (topic: string) => {
    setActiveTopic((current) => (current === topic ? null : topic));
    setSearch("");
  };

  // "Saved" is a special pill that shows the user's bookmarked items straight
  // from saved_items (no live fetch). Otherwise the type pills are a fast,
  // client-side filter over whatever the live fetch returned.
  const savedView = filter === "saved";
  const filtered = savedView
    ? savedItems
    : items.filter((item) => filter === "all" || item.type === filter);

  const shown   = filtered.slice(0, page * PAGE_SIZE);
  const hasMore  = shown.length < filtered.length;
  // The live-fetch skeleton only applies to live views, never the saved list.
  const viewLoading = loading && !savedView;

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

      {/* Personalization prompt — signed-in users who haven't set interests yet */}
      {user && interests.length === 0 && (
        <section className="px-gutter max-w-[1280px] mx-auto mb-8">
          <div className="bg-primary p-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-6 shadow-md">
            <div className="text-white text-center md:text-left">
              <h2 className="font-headline-md text-headline-md mb-1">Personalize your feed</h2>
              <p className="font-body-md text-body-md opacity-90">
                Answer three quick questions and we&apos;ll tune your Discover feed to your research with AI.
              </p>
            </div>
            <button
              onClick={() => setShowPersonalize(true)}
              className="shrink-0 whitespace-nowrap px-8 py-3 bg-white text-primary font-bold rounded-lg hover:bg-surface-container-low transition-colors shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              Personalize your feed
            </button>
          </div>
        </section>
      )}

      {/* Editable interest chips — the user's saved interests that drive the
          multi-term feed. Remove one or add your own; both re-scope instantly. */}
      {user && interests.length > 0 && (
        <section className="px-gutter max-w-[1280px] mx-auto mb-8">
          <div className="bg-secondary-container/40 border border-secondary-container rounded-xl p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">auto_awesome</span>
                <h3 className="font-bold text-on-surface text-body-md">Your interests</h3>
                <span className="text-[11px] text-on-surface-variant">— your feed blends these</span>
              </div>
              <button
                onClick={() => setShowPersonalize(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary text-primary text-[11px] font-bold hover:bg-primary/5 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                Redo with AI
              </button>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {interests.map((kw) => (
                <span
                  key={kw}
                  className="flex items-center gap-1.5 pl-4 pr-2 py-2 rounded-full bg-primary text-white font-medium font-label-sm text-label-sm shadow-sm"
                >
                  {kw}
                  <button
                    onClick={() => removeInterest(kw)}
                    aria-label={`Remove ${kw}`}
                    className="flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </span>
              ))}
              {/* Add-your-own input */}
              <div className="flex items-center gap-1 rounded-full border border-outline-variant bg-surface-container-lowest pl-3 pr-1 py-1">
                <input
                  type="text"
                  value={newChip}
                  onChange={(e) => setNewChip(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInterest(newChip); } }}
                  placeholder="Add a topic…"
                  className="bg-transparent outline-none text-label-sm w-32 placeholder:text-on-surface-variant"
                />
                <button
                  onClick={() => addInterest(newChip)}
                  disabled={!newChip.trim()}
                  aria-label="Add topic"
                  className="flex items-center justify-center w-7 h-7 rounded-full text-primary hover:bg-primary/10 transition-colors disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
            </div>
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
              onChange={(e) => {
                setSearch(e.target.value);
                // Typing a free-text search takes precedence over a picked topic;
                // clear the topic so the active scope is unambiguous.
                if (e.target.value.trim()) setActiveTopic(null);
              }}
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

          {/* Topic chips — pick a topic to scope the live feed (search > topic > interests) */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant mb-2">
              Explore more topics
            </p>
            <div className="flex flex-wrap gap-2">
              {topicChips.map((topic) => {
                const selected = activeTopic === topic;
                return (
                  <button
                    key={topic}
                    onClick={() => onTopicClick(topic)}
                    aria-pressed={selected}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full font-medium font-label-sm text-label-sm transition-all ${
                      selected
                        ? "bg-primary text-white border border-primary shadow-sm"
                        : "border border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {selected && (
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    )}
                    {topic}
                  </button>
                );
              })}
            </div>
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
            {/* Saved view — logged-in only; renders bookmarked items from the DB */}
            {Boolean(user) && (
              <button
                onClick={() => setFilter("saved")}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full font-medium font-label-sm text-label-sm transition-all ${
                  savedView
                    ? "bg-primary text-white shadow-sm"
                    : "border border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <span
                  className="material-symbols-outlined text-[16px]"
                  style={{ fontVariationSettings: savedView ? "'FILL' 1" : "'FILL' 0" }}
                >
                  bookmark
                </span>
                Saved{savedIds.size > 0 ? ` (${savedIds.size})` : ""}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Discovery grid */}
      <section className="px-gutter max-w-[1280px] mx-auto pb-xl">
        {/* Loading skeletons */}
        {viewLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* No results */}
        {!viewLoading && shown.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">
              {savedView ? "bookmark" : "search_off"}
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
              {savedView ? "No saved items yet" : "No results found"}
            </h3>
            <p className="text-on-surface-variant mb-6">
              {savedView
                ? "Tap the bookmark on any card to save it here for later."
                : "Try adjusting your filters or search keywords."}
            </p>
            <button
              onClick={() => { setFilter("all"); setSearch(""); }}
              className="px-8 py-3 bg-primary text-white rounded-full font-bold shadow-sm hover:bg-primary-container transition-all"
            >
              {savedView ? "Back to feed" : "Clear all filters"}
            </button>
          </div>
        )}

        {/* Cards */}
        {!viewLoading && shown.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shown.map((item) => (
                <DiscoverCard
                  key={item.id}
                  item={item}
                  canSave={Boolean(user)}
                  saved={savedIds.has(item.id)}
                  onToggleSave={toggleSave}
                />
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

      {/* Guided AI personalization form */}
      {showPersonalize && (
        <PersonalizeModal
          onClose={() => setShowPersonalize(false)}
          onSaved={(keywords) => {
            saveInterests(keywords); // replace with the freshly extracted set + re-scope
            setShowPersonalize(false);
          }}
        />
      )}
    </>
  );
}

// ── Guided personalization modal ────────────────────────────────────────────────
//
// Three short questions → /api/extract-interests (Groq) → clean keyword array.
// It's a form, not a chatbot: the parent saves the result to users.interests and
// the existing multi-term feed engine re-scopes automatically.

function PersonalizeModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (keywords: string[]) => void;
}) {
  const [mounted, setMounted]       = useState(false);
  const [field, setField]           = useState("");
  const [working, setWorking]       = useState("");
  const [topics, setTopics]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const canSubmit = Boolean(field.trim() || working.trim() || topics.trim());

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/extract-interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: field.trim(), working: working.trim(), topics: topics.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { keywords?: string[]; error?: string };
      if (!res.ok || !Array.isArray(data.keywords) || data.keywords.length === 0) {
        throw new Error(data.error || "Couldn't extract keywords. Please try again.");
      }
      onSaved(data.keywords);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 999999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-primary" />
        <div className="p-8">
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">auto_awesome</span>
              <h2 className="font-headline-md text-headline-md text-on-surface leading-tight">
                Personalize your feed
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={submitting}
              className="text-outline hover:text-on-surface transition-colors p-1 shrink-0 disabled:opacity-40"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant mb-6">
            Answer a few questions — AI turns them into search keywords that scope your Discover feed.
          </p>

          <div className="space-y-5">
            <div>
              <label className="block text-label-sm font-bold text-on-surface mb-1.5">
                What&apos;s your field?
              </label>
              <input
                type="text"
                value={field}
                onChange={(e) => setField(e.target.value)}
                placeholder="e.g. computational biology, medicinal chemistry"
                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md"
              />
            </div>
            <div>
              <label className="block text-label-sm font-bold text-on-surface mb-1.5">
                What are you working on right now?
              </label>
              <textarea
                value={working}
                onChange={(e) => setWorking(e.target.value)}
                rows={2}
                placeholder="e.g. finding inhibitors for PHGDH in Alzheimer's disease"
                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md resize-none"
              />
            </div>
            <div>
              <label className="block text-label-sm font-bold text-on-surface mb-1.5">
                Any specific topics you want to follow? <span className="font-normal text-on-surface-variant">(optional)</span>
              </label>
              <textarea
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                rows={2}
                placeholder="e.g. protein aggregation, tau phosphorylation, CRISPR screens"
                className="w-full px-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md resize-none"
              />
            </div>
          </div>

          {error && (
            <p className="mt-4 text-body-sm text-error flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-6">
            <button
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-primary text-white hover:bg-primary-container transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Extracting keywords…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                  Generate my feed
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-3 rounded-xl font-bold text-sm border border-outline-variant hover:bg-surface-container-low transition-colors text-on-surface-variant disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Route ─────────────────────────────────────────────────────────────────────
//
// Standalone /discovery route. Structurally lifted verbatim from the Discover tab
// in /knowledge-hub (which still exists in parallel this step). The `user` prop is
// now sourced from a local useAuth() call instead of being passed down by the hub.

export default function DiscoveryPage() {
  const { user } = useAuth();

  return (
    <div className="bg-background text-on-background min-h-screen">
      <Navbar />

      <main className="min-h-screen">
        {/* Hero */}
        <section className="py-8 md:py-xl px-gutter max-w-[1280px] mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-[28px] md:font-display-lg md:text-display-lg mb-3 md:mb-4 text-primary font-bold">
              Discovery
            </h1>
            <p className="text-base md:font-body-lg md:text-body-lg text-on-surface-variant leading-relaxed">
              Explore the frontier of pharmaceutical innovation. Discover the latest research, deep-dive into
              podcasts, and visualize the clinical discovery network.
            </p>
          </div>
        </section>

        <DiscoverTab user={user} />
      </main>

      <Footer />
    </div>
  );
}
