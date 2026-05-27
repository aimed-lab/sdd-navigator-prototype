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
  concepts: string[];
  slug: string;
};

function episodeIcon(tags: string[]): string {
  const lower = tags.map((t) => t.toLowerCase());
  if (lower.some((t) => t.includes("ai") || t.includes("ml"))) return "psychology";
  if (lower.some((t) => t.includes("clinical"))) return "biotech";
  if (lower.some((t) => t.includes("data"))) return "database";
  if (lower.some((t) => t.includes("pharma") || t.includes("drug"))) return "medication";
  if (lower.some((t) => t.includes("graph") || t.includes("network"))) return "hub";
  return "science";
}

export default function KnowledgeHubPage() {
  const [episodes, setEpisodes] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("wiki_pages")
        .select("id, episode_number, title, tags, concepts, slug")
        .order("episode_number", { ascending: true });

      if (error) console.error("Supabase fetch error:", error.message);
      setEpisodes(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = episodes.filter((ep) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      ep.title.toLowerCase().includes(q) ||
      ep.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <>
      <div className="dna-grid fixed inset-0 pointer-events-none -z-10" />
      <Navbar />

      <main className="pt-32 pb-20 px-4 md:px-16 max-w-[1440px] mx-auto min-h-screen">
        {/* Hero / Search */}
        <section className="mb-16 text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative flex items-center justify-center w-3 h-3">
              <div className="absolute w-full h-full bg-status-pulse rounded-full opacity-50" />
              <div className="absolute w-full h-full bg-status-pulse rounded-full status-pulse-ring" />
            </div>
            <span className="font-data-label text-data-label text-status-pulse tracking-widest uppercase">
              Live Knowledge Database
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg md:font-display-lg md:text-display-lg text-primary mb-8 tracking-tight">
            Knowledge Hub
          </h1>
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-on-surface-variant">
                search
              </span>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-container-low border-b border-[rgba(255,255,255,0.1)] py-5 pl-14 pr-6 text-on-surface focus:outline-none focus:border-primary transition-all duration-300 placeholder:text-on-surface-variant/50 font-body-md"
              placeholder="Search clinical papers, wiki episodes, or target insights..."
            />
            <div className="absolute inset-y-0 right-4 flex items-center gap-2">
              <span className="font-data-label text-data-label text-on-surface-variant/40 border border-[rgba(255,255,255,0.1)] px-2 py-1 rounded">
                ⌘ K
              </span>
            </div>
          </div>
        </section>

        {/* Loading spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <span className="font-data-label text-data-label text-on-surface-variant tracking-widest">
              LOADING EPISODES…
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
            {search.trim() && (
              <button
                onClick={() => setSearch("")}
                className="text-primary font-data-label text-data-label border-b border-primary/50 hover:border-primary transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        )}

        {/* Cards Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((ep) => {
              const num = String(ep.episode_number).padStart(3, "0");
              const summary =
                ep.concepts.length > 0
                  ? ep.concepts.join(" · ").slice(0, 150) +
                    (ep.concepts.join(" · ").length > 150 ? "…" : "")
                  : "No summary available.";

              return (
                <article
                  key={ep.id}
                  className="glass-card p-6 flex flex-col group transition-all duration-300 hover:border-[rgba(0,245,255,0.4)] hover:shadow-[0_0_20px_rgba(0,245,255,0.15)]"
                >
                  <div className="flex justify-between items-start mb-6">
                    <span className="font-data-label text-data-label text-data-mono">
                      EPISODE #{num}
                    </span>
                    <span className="material-symbols-outlined text-primary/40 group-hover:text-primary transition-colors">
                      {episodeIcon(ep.tags)}
                    </span>
                  </div>
                  <h3 className="font-headline-lg text-headline-lg text-primary mb-3 leading-tight">
                    {ep.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {ep.tags.map((tag) => (
                      <span
                        key={tag}
                        className="font-data-label text-[10px] px-2 py-1 bg-surface-container-highest text-primary border border-[rgba(255,255,255,0.1)] rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="font-body-md text-on-surface-variant mb-8 flex-grow">
                    {summary}
                  </p>
                  <Link href={`/topics/${ep.slug}`}>
                    <button className="w-full py-3 bg-transparent border border-primary text-primary font-bold hover:bg-primary/10 transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]">
                      Read Wiki{" "}
                      <span className="material-symbols-outlined text-sm">
                        arrow_forward
                      </span>
                    </button>
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
