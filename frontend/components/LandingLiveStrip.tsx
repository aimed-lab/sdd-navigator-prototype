"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DiscoverCard, SkeletonCard } from "@/components/DiscoverCard";
import type { DiscoverItem } from "@/app/api/discover/route";

// Landing "Latest in drug discovery" strip. Wired to the REAL /api/discover
// aggregator (PubMed + OpenAlex + Crossref + Grants.gov + ClinicalTrials.gov +
// GitHub) — the same live source the Discover tab and Navigator radar use. No
// hardcoded papers: while loading it shows skeletons, and on empty/error it
// degrades to an honest message + a link to the full Discovery feed.
export default function LandingLiveStrip() {
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/discover")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { items?: DiscoverItem[] }) => {
        if (cancelled) return;
        setItems((data.items ?? []).slice(0, 4));
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="py-16 md:py-xl px-gutter bg-surface-container-low">
      <div className="max-w-[1280px] mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <h2 className="font-headline-md text-headline-md text-primary">Latest in drug discovery</h2>
          <Link
            href="/discovery"
            className="flex items-center gap-1 text-primary font-semibold font-label-sm text-label-sm hover:underline"
          >
            View all
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </Link>
        </div>

        {status === "loading" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {status === "ready" && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {items.map((item) => (
              <DiscoverCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {(status === "error" || (status === "ready" && items.length === 0)) && (
          <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">travel_explore</span>
            <p className="text-on-surface-variant font-body-md text-body-md mb-4">
              Live research signals aren&apos;t available right now.
            </p>
            <Link
              href="/discovery"
              className="inline-flex items-center gap-1 text-primary font-semibold font-label-sm text-label-sm hover:underline"
            >
              Browse the Discovery feed
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
