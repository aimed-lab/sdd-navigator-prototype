"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

type Researcher = {
  id: string;
  name: string;
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

  const [researcher, setResearcher] = useState<Researcher | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [related, setRelated] = useState<Researcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        const res = await fetch(`/api/researchers/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        const data = await res.json();

        setResearcher(data.profile);
        setWorks(data.works ?? []);

        const myInterests = new Set(
          ((data.profile?.interests ?? []) as string[]).map((i) => i.toLowerCase())
        );
        const sorted = ((data.related ?? []) as Researcher[]).sort((a, b) => {
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
      } catch {
        setNotFound(true);
        setLoading(false);
      }
    }

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-background min-h-screen flex flex-col">
        <Nav />
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !researcher) {
    return (
      <div className="bg-background min-h-screen flex flex-col">
        <Nav />
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center px-gutter">
          <span className="material-symbols-outlined text-6xl text-outline-variant mb-4">
            person_off
          </span>
          <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
            Researcher not found
          </h2>
          <p className="text-on-surface-variant mb-6">
            This profile may be private or does not exist.
          </p>
          <Link href="/researchers">
            <button className="px-8 py-3 bg-primary text-on-primary rounded-full text-sm font-medium hover:bg-primary-container transition-all">
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
  const firstName = researcher.name.split(" ")[0];
  const interests = researcher.interests ?? [];

  // Same works array, grouped by type into the design's separate sections.
  const papers = works.filter((w) => w.type === "paper");
  const tools = works.filter((w) => w.type === "tool");
  const datasets = works.filter((w) => w.type === "dataset");

  return (
    <div className="bg-background text-on-surface min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-gutter py-8 md:py-10">
        {/* Profile header card */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
            <div
              className={`w-28 h-28 md:w-36 md:h-36 rounded-full ${color.bg} ${color.text} flex items-center justify-center font-bold text-4xl md:text-5xl shrink-0 border-4 border-primary-fixed`}
            >
              {getInitials(researcher.name)}
            </div>

            <div className="flex-1 text-center md:text-left min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold text-on-surface mb-1">
                {researcher.name}
              </h1>
              {researcher.research_focus && (
                <p className="font-body-lg text-body-lg text-on-surface-variant mb-1">
                  {researcher.research_focus}
                </p>
              )}
              {titleLine && (
                <div className="flex items-center justify-center md:justify-start gap-1.5 text-sm text-on-surface-variant mb-4">
                  <span className="material-symbols-outlined text-[18px]">account_balance</span>
                  {titleLine}
                </div>
              )}

              {interests.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  {interests.map((interest) => (
                    <span
                      key={interest}
                      className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-label-sm text-label-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Connect — on-platform networking (coming soon) for everyone.
                Auth-independent: logging in shouldn't promise a connect feature
                that isn't built yet. The mailto path was removed with the
                researcher email (PII) it relied on. */}
            <div className="shrink-0">
              <button
                type="button"
                disabled
                title="On-platform networking is coming soon"
                className="bg-surface-container text-on-surface-variant px-6 py-2.5 rounded-xl text-sm font-medium cursor-default opacity-70 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">hourglass_empty</span>
                Connect — coming soon
              </button>
            </div>
          </div>
        </section>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main column */}
          <div className="lg:col-span-8 space-y-8">
            {/* About */}
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">info</span>
                About
              </h2>
              {researcher.bio ? (
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {researcher.bio}
                </p>
              ) : (
                <p className="text-on-surface-variant italic">No biography provided yet.</p>
              )}
            </section>

            {/* Honest single empty state when the researcher has no works at all */}
            {works.length === 0 && (
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-10 text-center">
                <span className="material-symbols-outlined text-5xl text-outline-variant block mb-3">
                  inventory_2
                </span>
                <p className="text-on-surface-variant">No works added yet.</p>
              </div>
            )}

            {/* Publications (papers) */}
            {papers.length > 0 && (
              <section>
                <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">menu_book</span>
                  Publications
                </h2>
                <div className="space-y-4">
                  {papers.map((work) => (
                    <div
                      key={work.id}
                      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)] hover:border-[#D1D5DB] transition-all group"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          {(work.journal || work.year) && (
                            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-widest">
                              {[work.journal, work.year].filter(Boolean).join(" • ")}
                            </span>
                          )}
                          <h3 className="font-headline-md text-[20px] text-on-surface mt-1 group-hover:text-secondary transition-colors leading-snug">
                            {work.title}
                          </h3>
                          {work.description && (
                            <p className="font-body-md text-body-md text-on-surface-variant mt-2 line-clamp-2">
                              {work.description}
                            </p>
                          )}
                        </div>
                        <span className="material-symbols-outlined text-outline-variant group-hover:text-secondary transition-colors shrink-0">
                          arrow_right_alt
                        </span>
                      </div>
                      {work.url && (
                        <a
                          href={work.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-4 text-secondary font-label-sm text-label-sm font-bold hover:underline"
                        >
                          View Paper
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tools & Software */}
            {tools.length > 0 && (
              <section>
                <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">code_blocks</span>
                  Tools &amp; Software
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tools.map((work) => (
                    <div
                      key={work.id}
                      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)] transition-all flex flex-col"
                    >
                      <div className="w-12 h-12 bg-secondary-container rounded-lg flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-secondary text-[28px]">terminal</span>
                      </div>
                      <h3 className="font-headline-md text-[20px] text-on-surface mb-2">{work.title}</h3>
                      {work.description && (
                        <p className="text-on-surface-variant font-body-md text-body-md mb-6 leading-relaxed line-clamp-3 flex-grow">
                          {work.description}
                        </p>
                      )}
                      {work.url && (
                        <a
                          href={work.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-secondary text-sm font-medium hover:underline mt-auto"
                        >
                          <span className="material-symbols-outlined text-[20px]">link</span>
                          View Tool
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Datasets (kept so no real work type is dropped) */}
            {datasets.length > 0 && (
              <section>
                <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">database</span>
                  Datasets
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {datasets.map((work) => (
                    <div
                      key={work.id}
                      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)] transition-all flex flex-col"
                    >
                      <div className="w-12 h-12 bg-secondary-container rounded-lg flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-secondary text-[28px]">database</span>
                      </div>
                      <h3 className="font-headline-md text-[20px] text-on-surface mb-2">{work.title}</h3>
                      {work.description && (
                        <p className="text-on-surface-variant font-body-md text-body-md mb-6 leading-relaxed line-clamp-3 flex-grow">
                          {work.description}
                        </p>
                      )}
                      {work.url && (
                        <a
                          href={work.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-secondary text-sm font-medium hover:underline mt-auto"
                        >
                          <span className="material-symbols-outlined text-[20px]">link</span>
                          Access
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            {(researcher.website_url || researcher.linkedin_url) && (
              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
                <h3 className="font-label-sm text-label-sm uppercase tracking-wider text-outline mb-4">
                  Professional Links
                </h3>
                <div className="space-y-4">
                  {researcher.website_url && (
                    <a
                      href={researcher.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-on-surface-variant hover:text-secondary transition-colors group"
                    >
                      <span className="material-symbols-outlined text-[22px]">language</span>
                      <span className="text-sm font-medium">Lab Website</span>
                      <span className="material-symbols-outlined text-[16px] ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        open_in_new
                      </span>
                    </a>
                  )}
                  {researcher.linkedin_url && (
                    <a
                      href={researcher.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-on-surface-variant hover:text-secondary transition-colors group"
                    >
                      <span className="material-symbols-outlined text-[22px]">link</span>
                      <span className="text-sm font-medium">LinkedIn Profile</span>
                      <span className="material-symbols-outlined text-[16px] ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        open_in_new
                      </span>
                    </a>
                  )}
                </div>
              </section>
            )}

            {/* Connect CTA — gated, honest copy (no invented availability claims) */}
            <section className="bg-primary-container text-on-primary-container rounded-xl p-6 relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
                <span className="material-symbols-outlined text-[120px]">handshake</span>
              </div>
              <h3 className="font-headline-md text-[20px] text-white mb-2 relative z-10">
                Interested in collaborating with {firstName}?
              </h3>
              <p className="font-body-md text-body-md text-on-primary-container opacity-90 mb-6 relative z-10">
                On-platform networking is coming soon.
              </p>
              <button
                type="button"
                disabled
                title="On-platform networking is coming soon"
                className="w-full bg-secondary/60 text-on-secondary px-4 py-3 rounded-xl text-sm font-medium cursor-default opacity-80 flex items-center justify-center gap-2 relative z-10"
              >
                <span className="material-symbols-outlined text-[20px]">hourglass_empty</span>
                On-platform connect coming soon
              </button>
            </section>

            {related.length > 0 && (
              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6">
                <h3 className="font-label-sm text-label-sm uppercase tracking-wider text-outline mb-4">
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
