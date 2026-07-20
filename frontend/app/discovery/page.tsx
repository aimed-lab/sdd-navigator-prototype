"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { FeedCard, FeedSkeleton } from "@/components/FeedCard";
import type { DiscoverItem } from "@/types/discover";

// ── Discover tab constants ────────────────────────────────────────────────────

// Labeled feed sections (in fixed display order). Grouping by these replaces the
// old flat list + type-filter pills — each `type` matches the item's DiscoverItem.type.
const FEED_SECTIONS = [
  { type: "paper", label: "Scientific Knowledge", anchor: "sec-scientific" },
  { type: "trial", label: "Clinical Landscape",   anchor: "sec-clinical" },
  { type: "grant", label: "Funding Landscape",    anchor: "sec-funding" },
  { type: "tool",  label: "Computational",        anchor: "sec-computational" },
] as const;

// Clinical Landscape sub-groups. Trial status is ClinicalTrials.gov's overallStatus,
// which fetchClinicalTrials already carries as tags[1] (tags[0] is always "Trial") —
// so no new fetch/field is needed; we derive the bucket from what's already parsed.
const TRIAL_BUCKETS = [
  { key: "active",    label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "other",     label: "Other / Unknown" },
] as const;

type TrialBucketKey = (typeof TRIAL_BUCKETS)[number]["key"];

function trialBucket(item: DiscoverItem): TrialBucketKey {
  const status = (item.tags?.[1] ?? "").toUpperCase();
  if (/RECRUIT|ACTIVE|ENROLL|AVAILABLE/.test(status)) return "active";
  if (/COMPLETED/.test(status)) return "completed";
  return "other"; // TERMINATED / WITHDRAWN / SUSPENDED / UNKNOWN / fallback "Clinical Trial"
}

// Optional one-tap fills for the "What's your field?" question in the modal.
// Purely a convenience — clicking one just sets the existing `field` state.
const FIELD_SUGGESTIONS = [
  "Computational Biology",
  "Medicinal Chemistry",
  "Structural Biology",
  "Drug Repurposing",
  "Immunology",
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
  const [sortBy, setSortBy]           = useState<"relevance" | "recent">("relevance");
  const [search, setSearch]           = useState("");
  const [interests, setInterests]     = useState<string[]>([]);
  const [personalized, setPersonalized] = useState(false);
  const [fromCache, setFromCache]     = useState(false);
  const [cachedAt, setCachedAt]       = useState<number | null>(null);
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [newChip, setNewChip]         = useState("");
  const [savedIds, setSavedIds]       = useState<Set<string>>(new Set());
  const [savedItems, setSavedItems]   = useState<DiscoverItem[]>([]);

  const debouncedSearch = useDebouncedValue(search, 500);

  // Pull the signed-in user's interests so the live fetch can scope to them.
  // Reads through /api/interests — a session-scoped route where RLS ties the
  // result to the caller (the uid is derived server-side, never sent up).
  useEffect(() => {
    if (!user) {
      setInterests([]);
      return;
    }
    fetch("/api/interests")
      .then((r) => (r.ok ? r.json() : { interests: [] }))
      .then((data: { interests?: string[] }) => setInterests(data.interests ?? []))
      .catch(() => {});
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
    fetch("/api/saved-items")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data: { items?: { item_id: string; item_data: DiscoverItem }[] }) => {
        const rows = data.items ?? [];
        setSavedIds(new Set(rows.map((r) => r.item_id)));
        setSavedItems(rows.map((r) => r.item_data).filter(Boolean));
      })
      .catch(() => {});
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


  // Persist the user's interests to users.interests and re-scope the feed.
  // Clearing search makes the interest-driven (multi-term) feed the active
  // scope so the change is immediately visible; setInterests re-fires loadFeed.
  const saveInterests = useCallback((next: string[]) => {
    setInterests(next);
    setSearch("");
    if (!user) return;
    // Fire-and-forget: the feed already re-scoped locally; a failed write just
    // means it won't persist across reloads, which isn't worth blocking the UI.
    // The route is session-scoped — no uid is sent; RLS ties it to the caller.
    fetch("/api/interests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interests: next }),
    }).catch(() => {});
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
  // API write (session-scoped, RLS) persists it.
  const toggleSave = useCallback((item: DiscoverItem) => {
    if (!user) return;
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

    // Fire-and-forget through the session-scoped route (RLS ties writes to the
    // caller; no uid is sent). The unique (user_id, item_id) constraint keeps a
    // duplicate insert a harmless no-op, swallowed server-side.
    if (isSaved) {
      fetch(`/api/saved-items?item_id=${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      }).catch(() => {});
    } else {
      fetch("/api/saved-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item }),
      }).catch(() => {});
    }
  }, [user, savedIds]);

  // "Saved" shows the user's bookmarked items straight from saved_items (no live
  // fetch). Otherwise the type pills are a fast client-side filter over whatever
  // the live fetch returned.
  const savedView = filter === "saved";
  const baseList = savedView ? savedItems : items;

  // Client-side ordering for the Sort control, applied to the WHOLE list BEFORE
  // grouping so search + sort work across every section (not per-section).
  // Relevance reproduces the server's relevance-then-recency order; Recent sorts
  // purely by date.
  const ordered = [...baseList].sort((a, b) =>
    sortBy === "recent"
      ? new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
      : b.relevance - a.relevance || new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime(),
  );

  // Group the sorted list into the labeled feed sections by item type. Grouping
  // (not pill-filtering) is how the feed is now organized; sort order is preserved
  // within each section.
  const grouped: Record<string, DiscoverItem[]> = { paper: [], trial: [], grant: [], tool: [] };
  for (const item of ordered) {
    (grouped[item.type] ??= []).push(item);
  }

  // The live-fetch skeleton only applies to live views, never the saved list.
  const viewLoading = loading && !savedView;

  const toggleBtn = (active: boolean) =>
    `px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
      active
        ? "bg-secondary-container text-on-secondary-container font-semibold"
        : "text-on-surface-variant hover:text-on-surface"
    }`;

  const sortBtn = (active: boolean) =>
    `px-3 py-1 rounded-md text-sm font-medium transition-all ${
      active
        ? "bg-white text-primary font-semibold shadow-sm"
        : "text-on-surface-variant hover:text-on-surface"
    }`;

  return (
    <>
      {/* Control bar: Feed / Saved toggle + AI-curated marker */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <div className="inline-flex bg-surface-container rounded-lg p-1">
          <button
            onClick={() => { if (savedView) setFilter("all"); }}
            className={toggleBtn(!savedView)}
          >
            Feed
          </button>
          <button onClick={() => setFilter("saved")} className={toggleBtn(savedView)}>
            Saved{savedIds.size > 0 ? ` (${savedIds.size})` : ""}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">auto_awesome</span>
          <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
            AI-curated insights
          </span>
        </div>
      </div>

      {/* Personalization zone */}
      {!user ? (
        // Logged-out: soft "log in to personalize" prompt (no chips, no % match)
        <div className="mb-8 bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
              <span className="material-symbols-outlined text-[24px]">person_add</span>
            </div>
            <div>
              <h2 className="font-headline-md text-[18px] text-primary">Log in to personalize your feed</h2>
              <p className="text-body-md text-on-surface-variant">
                See papers, grants, and tools matched to your research
              </p>
            </div>
          </div>
          <Link href="/login?callbackUrl=/discovery" className="shrink-0">
            <button className="px-8 py-2 bg-primary text-on-primary text-sm font-medium rounded-full hover:opacity-90 transition-all active:scale-95">
              Log in
            </button>
          </Link>
        </div>
      ) : (
        // Logged-in: editable interest chips (drive the multi-term feed)
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-label-sm font-label-sm text-on-surface-variant tracking-wider uppercase">
              My Discovery Interests
            </h2>
            <button
              onClick={() => setShowPersonalize(true)}
              className="text-label-sm font-label-sm text-primary hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              Edit interests
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {interests.map((kw) => (
              <span
                key={kw}
                className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-secondary-fixed text-on-secondary-container rounded-full text-sm font-medium border border-secondary-fixed"
              >
                {kw}
                <button
                  onClick={() => removeInterest(kw)}
                  aria-label={`Remove ${kw}`}
                  className="flex items-center"
                >
                  <span className="material-symbols-outlined text-[16px] hover:text-error transition-colors">
                    close
                  </span>
                </button>
              </span>
            ))}
            {/* Add-your-own — dashed pill wrapping the live input (preserves addInterest) */}
            <div className="flex-shrink-0 flex items-center gap-1 pl-3 pr-2 py-1.5 border-2 border-dashed border-outline-variant rounded-full focus-within:border-primary transition-all">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">add</span>
              <input
                type="text"
                value={newChip}
                onChange={(e) => setNewChip(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInterest(newChip); } }}
                placeholder="Add"
                aria-label="Add an interest"
                className="bg-transparent outline-none text-sm w-20 placeholder:text-on-surface-variant"
              />
            </div>
          </div>
          {interests.length === 0 && (
            <p className="text-body-md text-on-surface-variant mt-3">
              Add interests above, or{" "}
              <button onClick={() => setShowPersonalize(true)} className="text-primary font-semibold hover:underline">
                let AI build them
              </button>{" "}
              to personalize your feed.
            </p>
          )}
        </div>
      )}

      {/* Weekly research digest — honest "coming soon", not a working control */}
      {user && (
        <div className="mb-8 p-4 rounded-xl bg-[#b4ecd3]/20 border border-secondary-fixed/30 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary-fixed/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#00523c]">mail</span>
          </div>
          <div className="flex-grow">
            <h4 className="font-semibold text-on-surface text-[16px]">Weekly research digest</h4>
            <p className="text-on-surface-variant text-[14px] font-body-md">
              Get your matched papers, grants, and trials delivered to your inbox every week.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="px-3 py-1 rounded-full bg-surface-container-highest text-on-surface-variant text-[11px] font-bold uppercase tracking-wider">
              Coming soon
            </span>
            <button
              type="button"
              disabled
              title="Coming soon"
              className="px-4 py-1.5 border border-outline-variant rounded-lg text-label-sm font-label-sm text-on-surface-variant cursor-default opacity-70"
            >
              Notify me
            </button>
          </div>
        </div>
      )}

      {/* Global controls — Sort + Search sit above ALL sections and apply across
          the whole list (the section grouping below replaces the old type pills;
          there is no horizontal filter bar anymore). */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
        <div className="flex items-center gap-3 lg:ml-auto flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider hidden sm:inline">
              Sort by:
            </span>
            <div className="inline-flex bg-surface-container rounded-lg p-1">
              <button onClick={() => setSortBy("relevance")} className={sortBtn(sortBy === "relevance")}>
                Relevance
              </button>
              <button onClick={() => setSortBy("recent")} className={sortBtn(sortBy === "recent")}>
                Recent
              </button>
            </div>
          </div>

          <div className="relative min-w-[240px] flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search papers, grants, trials, tools..."
              className="w-full pl-10 pr-9 py-2 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary-fixed focus:border-primary transition-all outline-none font-body-md text-body-md"
            />
            {loading && (
              <span className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            )}
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feed state indicators + manual refresh */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
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
          <span className={`material-symbols-outlined text-[14px] ${refreshing ? "animate-spin" : ""}`}>
            refresh
          </span>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Feed grid */}
      {viewLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <FeedSkeleton key={i} />
          ))}
        </div>
      )}

      {!viewLoading && ordered.length === 0 && (
        savedView ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[32px] text-on-surface-variant">bookmark</span>
            </div>
            <h3 className="text-headline-md font-headline-md text-on-surface mb-2">Nothing saved yet</h3>
            <p className="text-body-md font-body-md text-on-surface-variant max-w-xs mx-auto mb-6">
              Bookmark items from your feed to see them here and access them quickly later.
            </p>
            <button
              onClick={() => setFilter("all")}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-full text-sm font-medium hover:opacity-90 transition-all active:scale-95"
            >
              Browse feed
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">search_off</span>
            <h3 className="text-headline-md font-headline-md text-on-surface mb-2">No results found</h3>
            <p className="text-body-md text-on-surface-variant mb-6">
              Try a different search term.
            </p>
            <button
              onClick={() => setSearch("")}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-full text-sm font-medium hover:opacity-90 transition-all active:scale-95"
            >
              Clear search
            </button>
          </div>
        )
      )}

      {/* Grouped feed — one labeled section per type, in fixed order. Empty
          sections are skipped so the page never shows a bare header. */}
      {!viewLoading && ordered.length > 0 && (
        <div className="space-y-12">
          {FEED_SECTIONS.map((section) => {
            const sectionItems = grouped[section.type] ?? [];
            if (sectionItems.length === 0) return null;

            return (
              <section key={section.type} id={section.anchor} className="scroll-mt-24">
                <div className="flex items-baseline gap-2 mb-5 pb-2 border-b border-outline-variant">
                  <h2 className="text-headline-md font-headline-md text-on-surface">{section.label}</h2>
                  <span className="text-body-md text-on-surface-variant">({sectionItems.length})</span>
                </div>

                {section.type === "trial" ? (
                  // Clinical Landscape — sub-grouped by trial status (from tags[1]).
                  <div className="space-y-8">
                    {TRIAL_BUCKETS.map((bucket) => {
                      const bucketItems = sectionItems.filter((it) => trialBucket(it) === bucket.key);
                      if (bucketItems.length === 0) return null;
                      return (
                        <div key={bucket.key}>
                          <h3 className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-3">
                            {bucket.label}{" "}
                            <span className="text-on-surface-variant/60">({bucketItems.length})</span>
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {bucketItems.map((item) => (
                              <FeedCard
                                key={item.id}
                                item={item}
                                canSave={Boolean(user)}
                                showMatch={Boolean(user)}
                                saved={savedIds.has(item.id)}
                                onToggleSave={toggleSave}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sectionItems.map((item) => (
                      <FeedCard
                        key={item.id}
                        item={item}
                        canSave={Boolean(user)}
                        showMatch={Boolean(user)}
                        saved={savedIds.has(item.id)}
                        onToggleSave={toggleSave}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

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
      className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="bg-white w-full max-w-[600px] rounded-xl border border-outline-variant shadow-[0px_4px_32px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 relative border-b border-outline-variant/50">
          <button
            onClick={onClose}
            disabled={submitting}
            className="absolute top-4 right-4 text-outline hover:text-on-surface transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <div className="flex items-center gap-3 mb-2">
            <span
              className="material-symbols-outlined text-primary text-2xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
            <h1 className="font-headline-md text-headline-md text-on-surface">Personalize your feed</h1>
          </div>
          <p className="font-body-md text-on-surface-variant leading-relaxed">
            Answer a few questions — AI turns them into search keywords that scope your Discover feed.
          </p>
        </div>

        {/* Form content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-8">
            {/* Question 1 */}
            <div className="space-y-3">
              <label htmlFor="field_input" className="block text-sm font-medium text-on-surface">
                What&apos;s your field?
              </label>
              <input
                id="field_input"
                type="text"
                value={field}
                onChange={(e) => setField(e.target.value)}
                placeholder="e.g. computational biology, medicinal chemistry"
                className="w-full h-12 px-4 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {FIELD_SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setField(s)}
                    className="px-3 py-1.5 rounded-full border border-[#b4ecd3] bg-[#b4ecd3]/10 text-primary text-label-sm hover:bg-[#b4ecd3]/20 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 2 */}
            <div className="space-y-3">
              <label htmlFor="working_on" className="block text-sm font-medium text-on-surface">
                What are you working on right now?
              </label>
              <textarea
                id="working_on"
                value={working}
                onChange={(e) => setWorking(e.target.value)}
                placeholder="e.g. finding inhibitors for PHGDH in Alzheimer's disease"
                className="w-full min-h-[100px] p-4 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md resize-none"
              />
            </div>

            {/* Question 3 */}
            <div className="space-y-3">
              <label htmlFor="topics" className="block text-sm font-medium text-on-surface">
                Any specific topics you want to follow?{" "}
                <span className="font-normal text-on-surface-variant">(optional)</span>
              </label>
              <textarea
                id="topics"
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="e.g. protein aggregation, tau phosphorylation, CRISPR screens"
                className="w-full min-h-[100px] p-4 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-error flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-surface-container-lowest border-t border-outline-variant/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-5 h-11 rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="bg-primary-container text-white text-sm font-medium px-6 h-11 rounded-lg hover:shadow-lg active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                Generating…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_awesome
                </span>
                Generate my feed
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── Route ─────────────────────────────────────────────────────────────────────
//
// Standalone /discovery route, reskinned to /design/discovery-logged-in.html.
// RESTYLE ONLY — all state, fetching, and behavior are unchanged from the
// knowledge-hub extraction. The `user` prop is sourced from a local useAuth().

export default function DiscoveryPage() {
  const { user } = useAuth();

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 w-full max-w-[1100px] mx-auto px-gutter py-8">
        <DiscoverTab user={user} />
      </main>
      <Footer />
    </div>
  );
}
