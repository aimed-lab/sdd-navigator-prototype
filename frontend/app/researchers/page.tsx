"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
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

// ── "Be one of the first" invitation card — real link to /profile/setup ──────────
// Used both as the trailing grid cell and as the empty-directory state (when there
// are zero public researchers). Never seeds fake profiles.

function InvitationCard() {
  return (
    <Link href="/profile/setup" className="h-full">
      <div className="bg-surface-container-highest/30 border-2 border-dashed border-outline-variant rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[320px] h-full hover:bg-surface-container transition-colors">
        <div className="w-16 h-16 rounded-full bg-surface-container-lowest border border-outline-variant flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-primary text-[32px]">person_add</span>
        </div>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Be one of the first</h3>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mb-6">
          Create your researcher profile and help build the network for the future of AI drug discovery.
        </p>
        <span className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
          Get Started
          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
        </span>
      </div>
    </Link>
  );
}

// ── Researchers directory ─────────────────────────────────────────────────────

const AFFILIATION_FILTERS = ["All", "Academic", "Industry", "Student"] as const;
type AffiliationFilter = (typeof AFFILIATION_FILTERS)[number];

function ResearchersTab({ user }: { user: unknown }) {
  const [researchers, setResearchers] = useState<ResearcherCard[]>([]);
  const [workCounts, setWorkCounts] = useState<Map<string, WorkCount>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [affFilter, setAffFilter] = useState<AffiliationFilter>("All");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/researchers");
        const data = await res.json();

        setResearchers(data.researchers ?? []);

        const counts = new Map<string, WorkCount>();
        for (const w of data.works ?? []) {
          if (!counts.has(w.user_id))
            counts.set(w.user_id, { papers: 0, tools: 0, datasets: 0 });
          const c = counts.get(w.user_id)!;
          if (w.type === "paper") c.papers++;
          else if (w.type === "tool") c.tools++;
          else if (w.type === "dataset") c.datasets++;
        }
        setWorkCounts(counts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
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

  const filtersActive = Boolean(search) || affFilter !== "All";

  return (
    <>
      {/* Search & filters */}
      <section className="mb-10 space-y-6">
        <div className="relative max-w-2xl">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, research area, affiliation…"
            className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-outline font-body-md text-body-md"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mr-2">
            Filters:
          </span>
          {AFFILIATION_FILTERS.map((f) => {
            const active = affFilter === f;
            return (
              <button
                key={f}
                // Clicking the active non-"All" chip toggles it back off (design's ✕),
                // preserving the existing single-select semantics.
                onClick={() => setAffFilter(active && f !== "All" ? "All" : f)}
                className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1 transition-colors ${
                  active
                    ? "bg-secondary text-on-secondary shadow-sm"
                    : "border border-outline-variant bg-surface-container-lowest text-on-surface hover:border-primary"
                }`}
              >
                {f}
                {active && f !== "All" && (
                  <span className="material-symbols-outlined text-[16px]">close</span>
                )}
              </button>
            );
          })}
          {filtersActive && (
            <button
              onClick={() => { setSearch(""); setAffFilter("All"); }}
              className="ml-auto text-primary text-sm font-medium hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </section>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 h-[280px] animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        researchers.length === 0 ? (
          // Directory is genuinely empty — honest "be the first", never fake profiles
          <div className="max-w-md mx-auto">
            <InvitationCard />
          </div>
        ) : (
          // Results excluded by the current search/filter
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">
              person_search
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
              No researchers found
            </h3>
            <p className="text-on-surface-variant mb-6">Try adjusting your search or filter.</p>
            <button
              onClick={() => { setSearch(""); setAffFilter("All"); }}
              className="px-8 py-3 bg-primary text-on-primary rounded-full text-sm font-medium shadow-sm hover:opacity-90 transition-all active:scale-95"
            >
              Clear filters
            </button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((r) => {
            const color = researcherAvatarColor(r.name);
            const counts = workCounts.get(r.id) ?? { papers: 0, tools: 0, datasets: 0 };
            const interests = r.interests ?? [];
            return (
              <article
                key={r.id}
                className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:shadow-[0px_8px_24px_rgba(0,0,0,0.08)] transition-all group flex flex-col"
              >
                {/* Header — avatar + name/focus/institution, linking to the profile */}
                <Link href={`/researchers/${r.profile_slug}`} className="flex gap-4 mb-4">
                  <div
                    className={`w-20 h-20 rounded-xl ${color.bg} ${color.text} flex items-center justify-center font-bold font-headline-md text-headline-md flex-shrink-0 border border-outline-variant`}
                  >
                    {researcherInitials(r.name)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors line-clamp-1">
                      {r.name}
                    </h3>
                    {r.research_focus && (
                      <p className="text-sm font-semibold text-primary mb-1 line-clamp-1" title={r.research_focus}>
                        {r.research_focus}
                      </p>
                    )}
                    <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">account_balance</span>
                      <span className="line-clamp-1">
                        {r.institution || r.affiliation || "Independent Researcher"}
                      </span>
                    </p>
                  </div>
                </Link>

                {/* Interest tags */}
                {interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {interests.slice(0, 3).map((interest) => (
                      <span
                        key={interest}
                        className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full font-label-sm text-label-sm"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                )}

                {/* Bio */}
                {r.bio && (
                  <p className="font-body-md text-body-md text-on-surface-variant mb-6 flex-grow line-clamp-3">
                    {r.bio}
                  </p>
                )}

                {/* Real work counts from researcher_works */}
                {(counts.papers > 0 || counts.tools > 0) && (
                  <div className="flex items-center gap-4 mb-4 text-on-surface-variant">
                    {counts.papers > 0 && (
                      <span className="flex items-center gap-1 font-label-sm text-label-sm">
                        <span className="material-symbols-outlined text-[18px]">article</span>
                        {counts.papers} paper{counts.papers !== 1 ? "s" : ""}
                      </span>
                    )}
                    {counts.tools > 0 && (
                      <span className="flex items-center gap-1 font-label-sm text-label-sm">
                        <span className="material-symbols-outlined text-[18px]">build</span>
                        {counts.tools} tool{counts.tools !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}

                {/* Connect — gated: real mailto when logged in, soft prompt when out */}
                <div className="mt-auto">
                  {user ? (
                    <button
                      onClick={() => window.open("mailto:" + r.email)}
                      className="w-full bg-primary text-on-primary px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-container hover:text-on-primary-container transition-colors active:scale-95"
                    >
                      Connect
                    </button>
                  ) : (
                    <Link href="/login?callbackUrl=/researchers" className="block">
                      <button className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-primary/5 transition-colors active:scale-[0.98]">
                        <span
                          className="material-symbols-outlined text-[18px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          lock
                        </span>
                        Log in to connect
                      </button>
                    </Link>
                  )}
                </div>
              </article>
            );
          })}

          {/* Trailing invitation card — encourages setting up a public profile */}
          <InvitationCard />
        </div>
      )}
    </>
  );
}

// ── Route ─────────────────────────────────────────────────────────────────────
//
// Standalone /researchers index route, reskinned to
// /design/researchers-directory-logged-in.html (+ logged-out variant).
// RESTYLE ONLY — all state, fetching, and behavior are unchanged from the
// knowledge-hub extraction, except the (newly added, per design) logged-out
// "Log in to connect" gate. Coexists with app/researchers/[slug]/page.tsx.

export default function ResearchersPage() {
  const { user } = useAuth();

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 w-full max-w-[1280px] mx-auto px-gutter py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-[32px] leading-[40px] font-semibold text-on-surface mb-2">Researchers</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Find collaborators across UAB, SPARC, and beyond
            </p>
          </div>
          <Link href={user ? "/profile/setup" : "/register"} className="shrink-0">
            <button className="bg-primary text-on-primary px-6 py-3 rounded-xl text-sm font-medium hover:opacity-90 transition-all active:scale-95 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">
                {user ? "edit_square" : "person_add"}
              </span>
              {user ? "Edit your profile" : "Create your profile"}
            </button>
          </Link>
        </div>

        {/* Talent Knowledge Graph — honest "coming soon", not a working control */}
        <div className="mb-10 p-4 bg-secondary-container/20 border border-secondary-fixed-dim/50 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
            info
          </span>
          <p className="text-sm text-on-secondary-container">
            Collaborator matching is powered by the Talent Knowledge Graph{" "}
            <span className="font-bold">(coming soon)</span>. For now, browse and connect directly.
          </p>
        </div>

        <ResearchersTab user={user} />
      </main>

      <Footer />
    </div>
  );
}
