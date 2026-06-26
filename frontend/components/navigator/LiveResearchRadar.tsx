"use client";

import { useEffect, useRef, useState } from "react";
import { DiscoverCard, SkeletonCard } from "@/components/DiscoverCard";
import { fetchRadar } from "@/lib/navigatorRadar";
import type { DiscoverItem } from "@/app/api/discover/route";

type RadarState = "loading" | "ready" | "empty" | "error";

// Fires its own live /api/discover pull scoped to `query`, independent of
// roadmap generation — the roadmap renders immediately and this panel loads
// in beside it. A request-sequence guard discards any response superseded
// by a newer query (e.g. the user starts over with a different target)
// before it can land, and a failed/slow source degrades to a clean empty
// state rather than a broken panel.
export default function LiveResearchRadar({
  query,
  title = "Live Research Radar",
  maxItems = 6,
}: {
  query: string;
  title?: string;
  maxItems?: number;
}) {
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [state, setState] = useState<RadarState>("loading");
  const requestSeqRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setState("empty");
      setItems([]);
      return;
    }

    const seq = ++requestSeqRef.current;
    setState("loading");
    const controller = new AbortController();

    fetchRadar(trimmed, controller.signal)
      .then((result) => {
        if (seq !== requestSeqRef.current) return; // superseded by a newer query
        setItems(result.items.slice(0, maxItems));
        setState(result.items.length > 0 ? "ready" : "empty");
      })
      .catch(() => {
        if (seq !== requestSeqRef.current) return;
        setState("error");
      });

    return () => controller.abort();
  }, [query, maxItems]);

  return (
    <section className="bg-white rounded-xl shadow-sm border border-outline-variant p-lg sm:p-xl">
      <div className="flex items-center gap-3 mb-1 flex-wrap">
        <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
        <div className="flex items-center gap-2 bg-primary/10 px-2 py-1 rounded">
          <span className="pulse-dot" />
          <span className="text-[10px] font-bold text-primary">LIVE</span>
        </div>
      </div>
      <p className="text-on-surface-variant text-sm mb-5">
        Latest papers, grants, trials, and tools for &quot;{query}&quot;
      </p>

      {state === "loading" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {state === "error" && (
        <div className="py-10 flex flex-col items-center text-center gap-2">
          <span className="material-symbols-outlined text-3xl text-outline-variant">cloud_off</span>
          <p className="text-on-surface-variant text-sm">
            Live sources are temporarily unavailable — your roadmap above is unaffected.
          </p>
        </div>
      )}

      {state === "empty" && (
        <div className="py-10 flex flex-col items-center text-center gap-2">
          <span className="material-symbols-outlined text-3xl text-outline-variant">manage_search</span>
          <p className="text-on-surface-variant text-sm">No recent results found for this target yet.</p>
        </div>
      )}

      {state === "ready" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {items.map((item) => (
            <DiscoverCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
