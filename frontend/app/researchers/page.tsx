"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

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

// ── Route ─────────────────────────────────────────────────────────────────────
//
// Standalone /researchers index route. Structurally lifted verbatim from the
// Researchers tab in /knowledge-hub (which still exists in parallel this step).
// Coexists with the dynamic app/researchers/[slug]/page.tsx profile pages — the
// index (page.tsx) serves /researchers, [slug] serves /researchers/<slug>.
// The `user` prop for ProfileBanner is sourced from a local useAuth() call.

export default function ResearchersPage() {
  const { user } = useAuth();

  return (
    <div className="bg-background text-on-background min-h-screen">
      <Navbar />

      <main className="min-h-screen">
        {/* Hero */}
        <section className="py-8 md:py-xl px-gutter max-w-[1280px] mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-[28px] md:font-display-lg md:text-display-lg mb-3 md:mb-4 text-primary font-bold">
              Researchers
            </h1>
            <p className="text-base md:font-body-lg md:text-body-lg text-on-surface-variant leading-relaxed">
              Explore the frontier of pharmaceutical innovation. Discover the latest research, deep-dive into
              podcasts, and visualize the clinical discovery network.
            </p>
          </div>
        </section>

        {/* Profile setup banner — only for logged-in users without a public profile */}
        <ProfileBanner user={user} />

        <ResearchersTab />
      </main>

      <Footer />
    </div>
  );
}
