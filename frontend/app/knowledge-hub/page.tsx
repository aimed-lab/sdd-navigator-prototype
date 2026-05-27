"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

type WikiPage = {
  id: string;
  episode_number: number;
  title: string;
  tags: string[];
  description: string;
  slug: string;
};

const FILTER_CHIPS = ["All", "Drug Discovery", "AI/ML", "Clinical Trials", "Biomarkers", "Target ID"];

// Spotify SVG icon
function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.491 17.293c-.215.353-.675.464-1.025.249-2.813-1.722-6.353-2.112-10.523-1.158-.403.093-.81-.158-.903-.561-.093-.403.158-.81.561-.903 4.569-1.044 8.47-.599 11.64 1.342.35.215.462.674.25 1.031zm1.465-3.267c-.27.439-.844.58-1.282.31-3.222-1.98-8.134-2.553-11.944-1.396-.496.15-1.022-.128-1.173-.624-.15-.496.128-1.022.624-1.173 4.356-1.322 9.775-.68 13.465 1.586.438.27.579.843.31 1.297zm.126-3.415c-3.86-2.293-10.228-2.504-13.921-1.382-.592.18-1.22-.154-1.4-.746-.18-.592.154-1.221.746-1.4 4.252-1.291 11.287-1.039 15.714 1.59.533.317.707 1.005.39 1.538-.316.533-1.005.706-1.53.39z" />
    </svg>
  );
}

export default function KnowledgeHubPage() {
  const [episodes, setEpisodes] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("wiki_pages")
        .select("id, episode_number, title, tags, description, slug")
        .order("episode_number", { ascending: true });

      if (error) console.error("Supabase fetch error:", error.message);
      setEpisodes(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = episodes.filter((ep) => {
    // Search filter
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      ep.title.toLowerCase().includes(q) ||
      ep.tags.some((t) => t.toLowerCase().includes(q));

    // Category filter
    const matchesFilter =
      activeFilter === "All" ||
      ep.tags.some((t) =>
        t.toLowerCase().includes(activeFilter.toLowerCase().replace("/", ""))
      );

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="bg-background text-on-surface min-h-screen">
      <Navbar />

      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-stack-lg">
        {/* ── Page Header ──────────────────────────────────────── */}
        <section className="mb-stack-lg border-b border-outline-variant pb-8">
          <div className="max-w-4xl mb-stack-lg">
            <h1 className="text-4xl font-bold text-on-surface mb-4">
              Knowledge Hub
            </h1>
            <p className="text-lg text-on-surface-variant leading-relaxed">
              Explore AI-powered wiki pages from Jake Chen&apos;s Drug Discovery
              AI Talk podcast. Each episode becomes a structured knowledge page
              with live literature and researcher discussions.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 items-center">
            <button className="pb-3 border-b-2 border-primary text-primary font-bold text-title-md">
              Podcast Episodes
            </button>
            <Link href="/graph">
              <button className="pb-3 border-b-2 border-transparent text-on-surface-variant hover:text-primary transition-colors font-medium text-title-md flex items-center gap-2">
                Knowledge Graph
                <span className="material-symbols-outlined text-[18px]">
                  open_in_new
                </span>
              </button>
            </Link>
          </div>
        </section>

        {/* ── Search & Filters ─────────────────────────────────── */}
        <section>
          <div className="flex flex-col md:flex-row gap-gutter items-center mb-stack-lg">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-6 py-3.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-body-md focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                placeholder="Search episodes..."
              />
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap gap-2 justify-start md:justify-end">
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setActiveFilter(chip)}
                  className={`px-4 py-1.5 rounded-full font-label-md text-label-md transition-all ${
                    activeFilter === chip
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-highest text-on-surface-variant hover:bg-outline-variant"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Loading spinner */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <span className="font-label-md text-label-md text-on-surface-variant tracking-widest uppercase">
                Loading Episodes…
              </span>
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant">
                search_off
              </span>
              <p className="font-body-md text-on-surface-variant">
                {search.trim()
                  ? `No episodes found for "${search}".`
                  : "No episodes found."}
              </p>
              {(search.trim() || activeFilter !== "All") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setActiveFilter("All");
                  }}
                  className="text-primary font-label-md text-label-md border-b border-primary/50 hover:border-primary transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Episode Grid */}
          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
              {filtered.map((ep) => {
                const num = String(ep.episode_number).padStart(3, "0");
                const summary = ep.description
                  ? ep.description.slice(0, 140) +
                    (ep.description.length > 140 ? "…" : "")
                  : "No summary available.";

                return (
                  <article
                    key={ep.id}
                    className="academic-card bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden flex flex-col p-6"
                  >
                    {/* Card header */}
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-2.5 py-1 rounded-sm bg-[#1E6B52] text-white font-bold text-[11px] tracking-wider uppercase">
                        EP {num}
                      </span>
                      <span className="text-[#1DB954]">
                        <SpotifyIcon className="w-6 h-6" />
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-xl text-[#144B39] mb-3 leading-tight">
                      {ep.title}
                    </h3>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {ep.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded bg-[#b4ecd3]/50 text-[#144B39] text-[10px] font-bold uppercase"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Summary */}
                    <p className="text-on-surface-variant text-body-sm line-clamp-2 mb-6 flex-1">
                      {summary}
                    </p>

                    {/* CTA */}
                    <Link href={`/topics/${ep.slug}`}>
                      <button className="w-full py-2.5 bg-primary text-white rounded-lg font-bold text-label-md hover:bg-primary-container transition-all flex items-center justify-center gap-2">
                        Read Wiki
                        <span className="material-symbols-outlined text-[16px]">
                          arrow_forward
                        </span>
                      </button>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
