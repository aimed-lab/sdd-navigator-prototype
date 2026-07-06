"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

// ── Route ─────────────────────────────────────────────────────────────────────
//
// Standalone /podcast route, reskinned to a stacked layout (hero row →
// listen-on badges → full-width episodes grid). RESTYLE + LAYOUT ONLY — the
// episodes/loading/search/activeFilter state, the wiki_pages fetch, filtered
// logic, and the /topics/[slug] card links are unchanged. Coexists with the
// still-intact Podcast tab in knowledge-hub (parallel).
//
// HONESTY: Apple + Amazon "Listen on" links are the podcast's REAL URLs.
// Spotify + RSS are placeholders (href="#") pending real URLs — flagged, not
// faked. Host bio copy is verbatim as supplied. Episode count and cards come
// from real wiki_pages data.

type WikiPage = {
  id: string;
  episode_number: number;
  title: string;
  tags: string[];
  description: string;
  slug: string;
  image_url: string | null;
};

const PODCAST_FILTER_CHIPS = [
  "All",
  "Drug Discovery",
  "AI/ML",
  "Clinical Trials",
  "Biomarkers",
  "Degraders",
];

// Real consumer listening destinations only. (The anchor.fm RSS feed is the
// raw XML the backend pipeline ingests — not a user-facing listen link — so
// it's intentionally not shown here.) Spotify show URL from
// backend/agent/transcribe.py (SPOTIFY_SHOW_URL).
const LISTEN_LINKS = [
  { label: "Spotify", icon: "podcasts", href: "https://open.spotify.com/show/50grwY6FX198o7BoYlRH6D" },
  {
    label: "Apple",
    icon: "keyboard_voice",
    href: "https://podcasts.apple.com/ug/podcast/drug-discovery-ai-talk/id1812272629",
  },
  {
    label: "Amazon",
    icon: "music_note",
    href: "https://music.amazon.com/podcasts/61fe5f18-5dd6-4579-bcb1-ec6a3e622112/drug-discovery-ai-talk",
  },
];

export default function PodcastPage() {
  const [episodes, setEpisodes] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/episodes");
        const data = await res.json();
        setEpisodes(data.episodes ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = episodes.filter((ep) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      ep.title.toLowerCase().includes(q) ||
      ep.tags.some((t) => t.toLowerCase().includes(q));
    const matchesFilter =
      activeFilter === "All" ||
      ep.tags.some((t) =>
        t.toLowerCase().includes(activeFilter.toLowerCase().replace("/", ""))
      );
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 w-full max-w-[1280px] mx-auto px-gutter py-8 md:py-xl">

        {/* ── Hero row: photo left + story right ─────────────────────── */}
        <section className="flex flex-col md:flex-row gap-8 md:gap-10 mb-10">
          {/* Photo — TEMPORARY: neutral default avatar shown pending Prof. Chen's
              approval to use his real photo publicly. The real image file is kept
              in public/jake-chen.jpg. To restore once approved, swap this
              placeholder div back for:
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/jake-chen.jpg" alt="Prof. Jake Y. Chen, Ph.D."
                  className="w-[200px] h-[260px] object-cover object-top rounded-xl border border-outline-variant shadow-sm" /> */}
          <div className="shrink-0">
            <div className="w-[200px] h-[260px] rounded-xl bg-surface-container-high text-on-surface-variant flex items-center justify-center border border-outline-variant shadow-sm">
              <span className="material-symbols-outlined text-[96px]" aria-label="Default avatar">
                person
              </span>
            </div>
          </div>

          {/* Story */}
          <div className="flex-1 min-w-0">
            <h1 className="font-display-lg text-[32px] leading-[40px] md:text-display-lg text-primary font-bold tracking-tight mb-2">
              Drug Discovery AI Talk
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant font-medium mb-5">
              Hosted by Prof. Jake Y. Chen, Ph.D. · UAB School of Medicine
            </p>
            <div className="space-y-4 font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
              <p>
                Prof. Chen is the Triton Endowed Professor of Biomedical Informatics and Data
                Science and founding director of UAB&apos;s Systems Pharmacology AI Research Center
                (SPARC). Over 25+ years he&apos;s helped shape AI-driven drug discovery — systems
                pharmacology, multi-omics AI, and digital-twin simulation for precision medicine —
                with 200+ publications and $100M+ in grants behind the work.
              </p>
              <p>
                This is a technical, bite-sized show on how AI is actually changing drug discovery —
                practical science over hype, from someone building the tools, not just talking about
                them.
              </p>
            </div>
          </div>
        </section>

        {/* ── Listen on ──────────────────────────────────────────────── */}
        <section className="mb-12 md:mb-16">
          <span className="block font-label-sm text-label-sm text-outline uppercase tracking-widest mb-3">
            Listen On
          </span>
          <div className="flex flex-wrap gap-3">
            {LISTEN_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-outline-variant bg-surface-container hover:bg-surface-container-high transition-colors text-sm font-medium text-on-surface"
              >
                <span className="material-symbols-outlined text-[18px]">{link.icon}</span>
                {link.label}
              </a>
            ))}
          </div>
        </section>

        {/* ── Episodes ───────────────────────────────────────────────── */}
        <section>
          <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
            <h2 className="text-2xl md:text-[28px] md:leading-9 font-bold text-on-surface">
              Episodes
            </h2>
            {!loading && (
              <span className="text-sm font-medium text-outline">
                {episodes.length} episode{episodes.length === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {/* Search + filter chips (existing logic) */}
          <div className="space-y-4 mb-8">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                search
              </span>
              <input
                className="w-full pl-12 pr-4 py-3 min-h-[48px] bg-surface-container-lowest border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md"
                placeholder="Search podcast episodes, speakers, or topics..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex overflow-x-auto md:flex-wrap gap-2 pb-1 scrollbar-hide">
              {PODCAST_FILTER_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setActiveFilter(chip)}
                  className={`px-4 py-2 min-h-[40px] rounded-full font-medium font-label-sm text-label-sm transition-all whitespace-nowrap shrink-0 ${
                    activeFilter === chip
                      ? "bg-primary text-white shadow-sm"
                      : "bg-surface-container-high text-on-surface-variant hover:bg-outline-variant"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
                Loading Podcast…
              </span>
            </div>
          )}

          {/* Empty */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant">
                search_off
              </span>
              <p className="font-body-md text-body-md text-on-surface-variant">
                No podcast episodes found.
              </p>
              <button
                onClick={() => { setSearch(""); setActiveFilter("All"); }}
                className="text-primary font-label-sm text-label-sm border-b border-primary/50"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Episode cards — 3 per row */}
          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {filtered.map((ep) => (
                <Link key={ep.id} href={`/topics/${ep.slug}`} className="group block h-full">
                  <article className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl hover:shadow-md hover:border-outline transition-all duration-300 h-full flex flex-col">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container rounded font-label-sm text-label-sm">
                        EP {ep.episode_number}
                      </span>
                      {ep.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-label-sm font-label-sm text-outline uppercase tracking-wide"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-headline-md text-headline-md text-primary group-hover:text-secondary transition-colors mb-2 leading-snug line-clamp-2">
                      {ep.title}
                    </h3>
                    <p className="font-body-md text-body-md text-on-surface-variant line-clamp-3 mb-6 flex-1">
                      {ep.description || "Explore this episode's key concepts and research insights."}
                    </p>
                    <div className="inline-flex items-center gap-2 self-start px-5 py-2.5 bg-primary text-on-primary rounded-xl text-sm font-medium group-hover:bg-primary-container transition-colors">
                      <span
                        className="material-symbols-outlined text-[18px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        play_arrow
                      </span>
                      Read wiki
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
