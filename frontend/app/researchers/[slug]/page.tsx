"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

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

type ProfileTab = "about" | "papers" | "tools" | "datasets";

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
  const [activeTab, setActiveTab] = useState<ProfileTab>("about");
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
      <div className="bg-surface min-h-screen">
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
      <div className="bg-surface min-h-screen">
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
  const papers = works.filter((w) => w.type === "paper");
  const tools = works.filter((w) => w.type === "tool");
  const datasets = works.filter((w) => w.type === "dataset");

  const TAB_LABELS: { key: ProfileTab; label: string; count?: number }[] = [
    { key: "about", label: "About" },
    { key: "papers", label: "Papers", count: papers.length },
    { key: "tools", label: "Tools", count: tools.length },
    { key: "datasets", label: "Datasets", count: datasets.length },
  ];

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      <Navbar />
      <main className="max-w-[1280px] mx-auto px-gutter py-lg">
        <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-lg items-start">

          {/* Left: Profile Card */}
          <aside>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm">
              <div className="flex flex-col items-center text-center space-y-md">
                {/* Avatar */}
                <div
                  className={`w-32 h-32 rounded-full ${color.bg} ${color.text} flex items-center justify-center font-bold text-4xl border-4 border-surface`}
                >
                  {getInitials(researcher.name)}
                </div>

                <div>
                  <h1 className="font-headline-md text-headline-md text-on-surface">
                    {researcher.name}
                  </h1>
                  <div className="mt-xs inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm uppercase tracking-wider">
                    Researcher
                  </div>
                </div>

                <div className="space-y-sm w-full pt-sm border-t border-outline-variant">
                  {(researcher.institution || researcher.affiliation) && (
                    <div className="flex items-center justify-center gap-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-primary text-xl">
                        school
                      </span>
                      <span className="font-medium text-sm">
                        {researcher.institution || researcher.affiliation}
                      </span>
                    </div>
                  )}
                  {researcher.bio && (
                    <p className="italic text-on-surface-variant text-sm px-2 leading-relaxed">
                      &ldquo;
                      {researcher.bio.length > 140
                        ? researcher.bio.slice(0, 137) + "…"
                        : researcher.bio}
                      &rdquo;
                    </p>
                  )}
                </div>

                {/* Interest pills */}
                {(researcher.interests?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    {(researcher.interests ?? []).slice(0, 4).map((interest) => (
                      <span
                        key={interest}
                        className="px-3 py-1 bg-surface-container text-on-surface-variant rounded-full font-label-sm text-label-sm"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                )}

                {/* CTAs */}
                <div className="flex flex-col w-full gap-3 pt-md">
                  <button
                    onClick={() => window.open("mailto:" + researcher.email)}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-primary-container text-on-primary-container rounded-lg font-semibold hover:opacity-90 transition-all"
                  >
                    <span className="material-symbols-outlined">mail</span>
                    Connect via Email
                  </button>
                  {researcher.linkedin_url && (
                    <a
                      href={researcher.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <button className="flex items-center justify-center gap-2 w-full py-3 border-2 border-outline-variant text-on-surface rounded-lg font-semibold hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined">link</span>
                        LinkedIn
                      </button>
                    </a>
                  )}
                  {researcher.website_url && (
                    <a
                      href={researcher.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <button className="flex items-center justify-center gap-2 w-full py-3 border-2 border-outline-variant text-on-surface rounded-lg font-semibold hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined">science</span>
                        Lab Website
                      </button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </aside>

          {/* Right: Tabs + Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-md">

            {/* Main content */}
            <section className="space-y-md">
              {/* Tab nav */}
              <div className="flex border-b border-outline-variant overflow-x-auto">
                {TAB_LABELS.map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`px-6 py-4 font-body-md whitespace-nowrap transition-all ${
                      activeTab === key
                        ? "text-primary border-b-2 border-primary font-semibold"
                        : "text-on-surface-variant hover:text-primary"
                    }`}
                  >
                    {label}
                    {count !== undefined && count > 0 && (
                      <span className="ml-1 text-xs opacity-60">({count})</span>
                    )}
                  </button>
                ))}
              </div>

              {/* About */}
              {activeTab === "about" && (
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm space-y-lg">
                  <div>
                    <h2 className="font-headline-md text-headline-md text-primary mb-md">
                      Professional Biography
                    </h2>
                    {researcher.bio ? (
                      <p className="text-on-surface-variant leading-relaxed">
                        {researcher.bio}
                      </p>
                    ) : (
                      <p className="text-on-surface-variant italic">
                        No biography provided yet.
                      </p>
                    )}
                  </div>

                  {researcher.research_focus && (
                    <div>
                      <h3 className="font-body-lg font-bold text-on-surface mb-sm">
                        Research Focus
                      </h3>
                      <p className="text-on-surface-variant">
                        {researcher.research_focus}
                      </p>
                    </div>
                  )}

                  {(researcher.interests?.length ?? 0) > 0 && (
                    <div>
                      <h3 className="font-body-lg font-bold text-on-surface mb-sm">
                        Research Interests
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {(researcher.interests ?? []).map((interest) => (
                          <span
                            key={interest}
                            className="px-4 py-2 bg-secondary-container text-on-secondary-container rounded-lg font-medium text-sm"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Papers */}
              {activeTab === "papers" && (
                <div className="space-y-md">
                  {papers.length === 0 ? (
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg text-center">
                      <span className="material-symbols-outlined text-5xl text-outline-variant block mb-3">
                        article
                      </span>
                      <p className="text-on-surface-variant">No papers added yet.</p>
                    </div>
                  ) : (
                    papers.map((paper) => (
                      <div
                        key={paper.id}
                        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm hover:border-primary transition-all"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-body-lg font-bold text-primary leading-snug">
                              {paper.title}
                            </h4>
                            {(paper.journal || paper.year) && (
                              <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                                {[paper.journal, paper.year].filter(Boolean).join(" | ")}
                              </p>
                            )}
                            {paper.description && (
                              <p className="mt-3 text-on-surface-variant text-sm line-clamp-2">
                                {paper.description}
                              </p>
                            )}
                          </div>
                          {paper.url && (
                            <a
                              href={paper.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0"
                            >
                              <button className="font-label-sm bg-primary text-on-primary px-4 py-2 rounded-lg hover:opacity-90">
                                Read
                              </button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tools */}
              {activeTab === "tools" && (
                <div className="space-y-md">
                  {tools.length === 0 ? (
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg text-center">
                      <span className="material-symbols-outlined text-5xl text-outline-variant block mb-3">
                        construction
                      </span>
                      <p className="text-on-surface-variant">No tools added yet.</p>
                    </div>
                  ) : (
                    tools.map((tool) => (
                      <div
                        key={tool.id}
                        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-body-lg font-bold text-on-surface">
                              {tool.title}
                            </h4>
                            {tool.description && (
                              <p className="mt-2 text-on-surface-variant text-sm">
                                {tool.description}
                              </p>
                            )}
                          </div>
                          {tool.url && (
                            <a
                              href={tool.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0"
                            >
                              <button className="font-label-sm bg-secondary-container text-on-secondary-container px-4 py-2 rounded-lg hover:opacity-90">
                                View
                              </button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Datasets */}
              {activeTab === "datasets" && (
                <div className="space-y-md">
                  {datasets.length === 0 ? (
                    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg text-center">
                      <span className="material-symbols-outlined text-5xl text-outline-variant block mb-3">
                        database
                      </span>
                      <p className="text-on-surface-variant">No datasets added yet.</p>
                    </div>
                  ) : (
                    datasets.map((ds) => (
                      <div
                        key={ds.id}
                        className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md shadow-sm"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-body-lg font-bold text-on-surface">
                              {ds.title}
                            </h4>
                            {ds.description && (
                              <p className="mt-2 text-on-surface-variant text-sm">
                                {ds.description}
                              </p>
                            )}
                          </div>
                          {ds.url && (
                            <a
                              href={ds.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0"
                            >
                              <button className="font-label-sm bg-secondary-container text-on-secondary-container px-4 py-2 rounded-lg hover:opacity-90">
                                Access
                              </button>
                            </a>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>

            {/* Sidebar */}
            {related.length > 0 && (
              <aside className="space-y-lg" style={{ position: "sticky", top: "104px" }}>
                <section className="space-y-sm">
                  <h3 className="font-label-sm text-label-sm text-outline font-bold uppercase tracking-widest">
                    Related Researchers
                  </h3>
                  {related.map((r) => {
                    const rc = avatarColor(r.name);
                    return (
                      <Link key={r.id} href={`/researchers/${r.profile_slug}`}>
                        <div className="flex items-center gap-3 p-2 hover:bg-surface-container rounded-lg transition-all cursor-pointer">
                          <div
                            className={`w-10 h-10 rounded-full ${rc.bg} ${rc.text} flex items-center justify-center font-bold text-sm shrink-0`}
                          >
                            {getInitials(r.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-on-surface truncate">
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
                </section>
              </aside>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
