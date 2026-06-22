"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type Researcher = {
  id: string;
  name: string;
  email: string;
  affiliation: string | null;
  institution: string | null;
  country: string | null;
  bio: string | null;
  research_focus: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  interests: string[] | null;
  is_public: boolean;
  profile_slug: string | null;
};

type Work = {
  id: string;
  user_id: string;
  type: "paper" | "tool" | "dataset";
  title: string;
  journal: string | null;
  year: number | null;
  url: string | null;
  description: string | null;
  created_at: string;
};

const AVATAR_COLORS = [
  { bg: "bg-primary-container", text: "text-on-primary-container" },
  { bg: "bg-secondary-container", text: "text-on-secondary-container" },
  { bg: "bg-tertiary-container", text: "text-on-tertiary-container" },
  { bg: "bg-surface-container-high", text: "text-on-surface-variant" },
];

const WORK_TYPE_META: Record<
  Work["type"],
  { icon: string; iconColor: string; badgeBg: string; badgeText: string; label: string; ctaLabel: string }
> = {
  paper: {
    icon: "description",
    iconColor: "text-primary",
    badgeBg: "bg-secondary-container",
    badgeText: "text-on-secondary-container",
    label: "Paper",
    ctaLabel: "Read",
  },
  tool: {
    icon: "terminal",
    iconColor: "text-secondary",
    badgeBg: "bg-tertiary-container",
    badgeText: "text-on-tertiary-container",
    label: "Tool",
    ctaLabel: "View",
  },
  dataset: {
    icon: "database",
    iconColor: "text-on-tertiary-container",
    badgeBg: "bg-primary-fixed",
    badgeText: "text-on-primary-fixed-variant",
    label: "Dataset",
    ctaLabel: "Access",
  },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export default function ResearcherProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { user, loading: authLoading } = useAuth();

  const [researcher, setResearcher] = useState<Researcher | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [related, setRelated] = useState<Researcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data, error } = await supabase
        .from("users")
        .select(
          "id, name, email, affiliation, institution, country, bio, research_focus, linkedin_url, website_url, interests, is_public, profile_slug"
        )
        .eq("profile_slug", slug)
        .eq("is_public", true)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setResearcher(data);

      const [worksRes, relatedRes] = await Promise.all([
        supabase
          .from("researcher_works")
          .select("*")
          .eq("user_id", data.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("users")
          .select(
            "id, name, affiliation, institution, research_focus, profile_slug, interests"
          )
          .eq("is_public", true)
          .neq("id", data.id)
          .limit(10),
      ]);

      setWorks(worksRes.data ?? []);

      const myInterests = new Set(
        (data.interests ?? []).map((i: string) => i.toLowerCase())
      );
      const sorted = ((relatedRes.data ?? []) as Researcher[]).sort((a, b) => {
        const aScore = (a.interests ?? []).filter((i) =>
          myInterests.has(i.toLowerCase())
        ).length;
        const bScore = (b.interests ?? []).filter((i) =>
          myInterests.has(i.toLowerCase())
        ).length;
        return bScore - aScore;
      });
      setRelated(sorted.slice(0, 3));
      setLoading(false);
    }

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-background min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !researcher) {
    return (
      <div className="bg-background min-h-screen">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-gutter">
          <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">
            person_off
          </span>
          <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
            Researcher not found
          </h2>
          <p className="text-on-surface-variant mb-6">
            This profile may be private or does not exist.
          </p>
          <Link href="/knowledge-hub?tab=researchers">
            <button className="px-8 py-3 bg-primary text-white rounded-full font-bold hover:bg-primary-container transition-all">
              Browse Researchers
            </button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const color = avatarColor(researcher.name);
  const titleLine = [researcher.affiliation, researcher.institution]
    .filter(Boolean)
    .join(" | ");

  return (
    <div className="bg-background text-on-surface min-h-screen">
      <Navbar />
      <main className="max-w-[1280px] mx-auto px-gutter py-md">
        {/* Profile Header Card */}
        <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 md:p-md shadow-sm mb-gutter">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-md">
            <div
              className={`w-32 h-32 md:w-40 md:h-40 rounded-full ${color.bg} ${color.text} flex items-center justify-center font-bold text-4xl md:text-5xl shrink-0`}
            >
              {getInitials(researcher.name)}
            </div>

            <div className="flex-grow text-center md:text-left">
              <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-2">
                {researcher.name}
              </h1>
              {titleLine && (
                <p className="font-body-lg text-body-lg text-on-surface-variant mb-4">
                  {titleLine}
                </p>
              )}

              <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                {!authLoading && user ? (
                  <button
                    onClick={() => window.open("mailto:" + researcher.email)}
                    className="bg-secondary text-on-secondary px-6 py-2.5 rounded-lg font-label-sm text-label-sm flex items-center gap-2 hover:opacity-90 transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">mail</span>
                    Connect via Email
                  </button>
                ) : (
                  <>
                    <Link
                      href={`/login?callbackUrl=${encodeURIComponent(
                        `/researchers/${slug}`
                      )}`}
                    >
                      <button className="bg-secondary/40 text-on-secondary px-6 py-2.5 rounded-lg font-label-sm text-label-sm flex items-center gap-2 opacity-80 hover:opacity-100 transition-all">
                        <span className="material-symbols-outlined text-[18px]">mail</span>
                        Connect via Email
                      </button>
                    </Link>
                    <span className="text-xs italic text-on-surface-variant">
                      Sign in to connect with this researcher
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-gutter">
            {/* Bio & Focus */}
            <article className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 md:p-md">
              <h2 className="font-headline-md text-headline-md mb-4 border-b border-outline-variant pb-3">
                Biography
              </h2>
              {researcher.bio ? (
                <p className="font-body-md text-body-md text-on-surface-variant mb-6 leading-relaxed">
                  {researcher.bio}
                </p>
              ) : (
                <p className="text-on-surface-variant italic mb-6">
                  No biography provided yet.
                </p>
              )}

              {researcher.research_focus && (
                <>
                  <h3 className="font-bold text-lg text-on-surface mb-2">
                    Research Focus
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-6 leading-relaxed">
                    {researcher.research_focus}
                  </p>
                </>
              )}

              {(researcher.interests?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2">
                  {(researcher.interests ?? []).map((interest) => (
                    <span
                      key={interest}
                      className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-label-sm text-label-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </article>

            {/* Works */}
            <section>
              <h2 className="font-headline-md text-headline-md mb-4">
                Selected Works
              </h2>
              {works.length === 0 ? (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-10 text-center">
                  <span className="material-symbols-outlined text-5xl text-outline-variant block mb-3">
                    inventory_2
                  </span>
                  <p className="text-on-surface-variant">No works added yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {works.map((work) => {
                    const meta = WORK_TYPE_META[work.type];
                    return (
                      <div
                        key={work.id}
                        className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6 flex gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                      >
                        <div className="shrink-0 pt-1">
                          <span
                            className={`material-symbols-outlined text-3xl ${meta.iconColor}`}
                          >
                            {meta.icon}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-3 mb-1">
                            <h4 className="font-bold text-on-surface leading-snug">
                              {work.title}
                            </h4>
                            <span
                              className={`shrink-0 ${meta.badgeBg} ${meta.badgeText} px-2 py-1 rounded font-label-sm text-label-sm uppercase tracking-wider`}
                            >
                              {meta.label}
                            </span>
                          </div>
                          {(work.journal || work.year) && (
                            <p className="font-label-sm text-label-sm text-on-surface-variant mb-2">
                              {[work.journal, work.year].filter(Boolean).join(" • ")}
                            </p>
                          )}
                          {work.description && (
                            <p className="text-on-surface-variant text-sm line-clamp-2">
                              {work.description}
                            </p>
                          )}
                          {work.url && (
                            <a
                              href={work.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block mt-3 font-label-sm text-label-sm text-primary font-semibold hover:underline"
                            >
                              {meta.ctaLabel} →
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-gutter">
            {(researcher.website_url || researcher.linkedin_url) && (
              <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
                <h3 className="font-bold text-lg text-on-surface mb-4">
                  Professional Presence
                </h3>
                <div className="space-y-2">
                  {researcher.website_url && (
                    <a
                      href={researcher.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors group"
                    >
                      <span className="flex items-center gap-2 font-body-md text-body-md text-on-surface">
                        <span className="material-symbols-outlined text-primary">
                          language
                        </span>
                        Lab Website
                      </span>
                      <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </a>
                  )}
                  {researcher.linkedin_url && (
                    <a
                      href={researcher.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors group"
                    >
                      <span className="flex items-center gap-2 font-body-md text-body-md text-on-surface">
                        <span className="material-symbols-outlined text-primary">
                          link
                        </span>
                        LinkedIn Profile
                      </span>
                      <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </a>
                  )}
                </div>
              </section>
            )}

            {related.length > 0 && (
              <section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-6">
                <h3 className="font-bold text-lg text-on-surface mb-4">
                  Related Researchers
                </h3>
                <div className="space-y-4">
                  {related.map((r) => {
                    const rc = avatarColor(r.name);
                    return (
                      <Link key={r.id} href={`/researchers/${r.profile_slug}`}>
                        <div className="flex items-center gap-3 p-2 -m-2 hover:bg-surface-container-low rounded-lg transition-all cursor-pointer">
                          <div
                            className={`w-12 h-12 rounded-full ${rc.bg} ${rc.text} flex items-center justify-center font-bold text-sm shrink-0`}
                          >
                            {getInitials(r.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-label-sm text-label-sm text-on-surface truncate">
                              {r.name}
                            </p>
                            <p className="text-xs text-on-surface-variant truncate">
                              {r.research_focus || r.affiliation || "Researcher"}
                            </p>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  );
}
