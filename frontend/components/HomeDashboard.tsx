"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { DiscoverCard, SkeletonCard } from "@/components/DiscoverCard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { DiscoverItem } from "@/app/api/discover/route";

// Logged-in home / dashboard (ports design/home-logged-in.html) — rendered by
// app/page.tsx only when the visitor is authenticated. Every card reflects real
// data or an honest empty/coming-soon state:
//   • Welcome     → real display name from auth.
//   • Recent proj → honest empty state (no documented projects table yet).
//   • Feed        → real personalized /api/discover (users.interests), or an
//                   honest "personalize your feed" prompt when interests are empty.
//   • Podcast     → newest real episode from wiki_pages, if any.

type LatestEpisode = { slug: string; title: string; episode_number: number };

export default function HomeDashboard() {
  const { user, loading, displayName } = useAuth();
  const name = displayName || "Researcher";

  const [interests, setInterests] = useState<string[] | null>(null); // null = not loaded yet
  const [feedItems, setFeedItems] = useState<DiscoverItem[]>([]);
  const [feedStatus, setFeedStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [latestEp, setLatestEp] = useState<LatestEpisode | null>(null);

  // Load the user's saved interests + newest podcast episode.
  useEffect(() => {
    if (loading) return;
    if (!user) return;
    const uid = user.id;

    supabase
      .from("users")
      .select("interests")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => setInterests(data?.interests ?? []));

    supabase
      .from("wiki_pages")
      .select("slug, title, episode_number")
      .order("episode_number", { ascending: false })
      .limit(1)
      .then(({ data }) => setLatestEp(data?.[0] ?? null));
  }, [user, loading]);

  // Once interests are known, pull the real personalized feed (only if there
  // are interests to scope by — otherwise we show the personalize prompt).
  useEffect(() => {
    if (interests === null) return;
    if (interests.length === 0) return;
    let cancelled = false;
    setFeedStatus("loading");
    fetch(`/api/discover?interests=${encodeURIComponent(interests.join(","))}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { items?: DiscoverItem[] }) => {
        if (cancelled) return;
        setFeedItems((data.items ?? []).slice(0, 6));
        setFeedStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setFeedStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [interests]);

  const hasInterests = interests !== null && interests.length > 0;

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col">
      <Nav />

      <main className="flex-grow w-full max-w-[1280px] mx-auto px-gutter py-10">
        {/* ── Welcome header ─────────────────────────────────────── */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface text-[28px]">
              Welcome back, {name}
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Pick up where you left off or start a new discovery phase.
            </p>
          </div>
          <Link href="/navigator" className="shrink-0">
            <button className="bg-primary hover:bg-primary-container text-on-primary font-label-sm text-label-sm px-6 py-3 rounded-xl transition-all flex items-center gap-2 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">add</span>
              Start a new proposal
            </button>
          </Link>
        </section>

        {/* ── Quick-access row ───────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Projects — honest empty state (no documented projects data yet) */}
          <Link
            href="/navigator"
            className="bg-white border border-outline-variant rounded-xl p-6 hover:shadow-md transition-all group flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-secondary-container p-2 rounded-lg">
                <span className="material-symbols-outlined text-on-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                  rocket_launch
                </span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all">
                arrow_forward
              </span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Your projects</p>
            <h3 className="font-headline-md text-headline-md text-on-surface text-[20px]">Start your first proposal</h3>
          </Link>

          {/* Discovery feed */}
          <Link
            href="/knowledge-hub"
            className="bg-white border border-outline-variant rounded-xl p-6 hover:shadow-md transition-all group flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-secondary-container p-2 rounded-lg">
                <span className="material-symbols-outlined text-on-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                  radar
                </span>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all">
                arrow_forward
              </span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Jump into Discovery</p>
            <h3 className="font-headline-md text-headline-md text-on-surface text-[20px]">Your personalized research feed</h3>
          </Link>

          {/* Podcast — newest real episode if available */}
          <Link
            href={latestEp ? `/topics/${latestEp.slug}` : "/podcast"}
            className="bg-white border border-outline-variant rounded-xl p-6 hover:shadow-md transition-all group flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="bg-surface-container p-2 rounded-lg">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                  play_circle
                </span>
              </div>
              {latestEp && (
                <span className="text-primary font-label-sm text-label-sm">Latest episode</span>
              )}
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mb-1 uppercase tracking-wider">Podcast</p>
            <h3 className="font-headline-md text-headline-md text-on-surface text-[20px] line-clamp-2">
              {latestEp ? latestEp.title : "Drug Discovery AI Talk"}
            </h3>
          </Link>
        </section>

        {/* ── Latest in your areas (real personalized feed) ──────── */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6 gap-4">
            <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
              Latest in your areas
              <span className="material-symbols-outlined text-primary">auto_awesome</span>
            </h2>
            <Link href="/knowledge-hub" className="text-primary font-label-sm text-label-sm hover:underline shrink-0">
              Manage interests
            </Link>
          </div>

          {/* No interests yet → honest personalize prompt */}
          {interests !== null && !hasInterests && (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-primary mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>
                auto_awesome
              </span>
              <h3 className="font-headline-md text-headline-md text-on-surface text-[20px] mb-2">Personalize your feed</h3>
              <p className="text-on-surface-variant font-body-md text-body-md mb-4 max-w-md mx-auto">
                Add your research interests and we&apos;ll surface the papers, grants, and trials that match.
              </p>
              <Link
                href="/knowledge-hub"
                className="inline-flex items-center gap-1 px-6 py-3 bg-primary text-on-primary rounded-xl font-label-sm text-label-sm hover:bg-primary-container transition-all"
              >
                Set your interests
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          )}

          {/* Interests set → live feed states */}
          {hasInterests && (feedStatus === "loading" || feedStatus === "idle") && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {hasInterests && feedStatus === "ready" && feedItems.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feedItems.map((item) => (
                <DiscoverCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {hasInterests && (feedStatus === "error" || (feedStatus === "ready" && feedItems.length === 0)) && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">travel_explore</span>
              <p className="text-on-surface-variant font-body-md text-body-md mb-4">
                Live research signals aren&apos;t available right now.
              </p>
              <Link href="/knowledge-hub" className="inline-flex items-center gap-1 text-primary font-semibold font-label-sm text-label-sm hover:underline">
                Open the Discovery feed
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </Link>
            </div>
          )}
        </section>

        {/* ── Recent proposals — honest empty state ──────────────── */}
        <section>
          <h2 className="font-headline-md text-headline-md text-on-surface mb-4">Recent proposals</h2>
          <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">description</span>
            <p className="text-on-surface-variant font-body-md text-body-md mb-4">
              You haven&apos;t created any proposals yet.
            </p>
            <Link
              href="/navigator"
              className="inline-flex items-center gap-1 px-6 py-3 bg-primary text-on-primary rounded-xl font-label-sm text-label-sm hover:bg-primary-container transition-all"
            >
              Start a proposal
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
