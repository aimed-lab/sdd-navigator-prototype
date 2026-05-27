import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CommentsSection from "@/components/CommentsSection";
import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type WikiPage = {
  id: string;
  slug: string;
  title: string;
  episode_number: number;
  transcript: string;
  concepts: string[];
  tags: string[];
};

type RelatedEpisode = {
  episode_number: number;
  title: string;
  slug: string;
};

type PubMedPaper = {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  date: string;
};

// ─────────────────────────────────────────────
// PubMed fetch helpers
// ─────────────────────────────────────────────

async function fetchPubMedPapers(query: string): Promise<PubMedPaper[]> {
  try {
    const searchUrl =
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi` +
      `?db=pubmed&term=${encodeURIComponent(query)}&retmax=5&retmode=json`;

    const searchRes = await fetch(searchUrl, {
      next: { revalidate: 3600 },
    });
    if (!searchRes.ok) return [];

    const searchData = await searchRes.json();
    const ids: string[] = searchData?.esearchresult?.idlist ?? [];
    if (ids.length === 0) return [];

    const summaryUrl =
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi` +
      `?db=pubmed&id=${ids.join(",")}&retmode=json`;

    const summaryRes = await fetch(summaryUrl, {
      next: { revalidate: 3600 },
    });
    if (!summaryRes.ok) return [];

    const summaryData = await summaryRes.json();
    const papers: PubMedPaper[] = [];

    for (const id of ids) {
      const doc = summaryData?.result?.[id];
      if (!doc || doc.error) continue;
      papers.push({
        id,
        title: doc.title ?? "Untitled",
        authors: ((doc.authors ?? []) as { name: string }[])
          .slice(0, 3)
          .map((a) => a.name),
        journal: doc.source ?? "",
        date: doc.pubdate ?? "",
      });
    }
    return papers;
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default async function WikiPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // ── Fetch main wiki page ──────────────────
  const { data: pageData, error: pageError } = await supabase
    .from("wiki_pages")
    .select("id, slug, title, episode_number, transcript, concepts, tags")
    .eq("slug", slug)
    .single();

  if (pageError || !pageData) {
    notFound();
  }

  const page = pageData as WikiPage;

  // ── Fetch related episodes + PubMed in parallel ──
  const [relatedResult, papers] = await Promise.all([
    supabase
      .from("wiki_pages")
      .select("episode_number, title, slug")
      .neq("slug", slug)
      .order("episode_number", { ascending: true })
      .limit(3),
    fetchPubMedPapers(page.title),
  ]);

  const relatedEpisodes: RelatedEpisode[] = relatedResult.data ?? [];

  // ── Helpers ───────────────────────────────
  const episodeLabel = `#${String(page.episode_number).padStart(2, "0")}`;

  return (
    <>
      {/* Atmospheric background */}
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(14,19,34,0.8)_100%)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <Navbar />

      <main className="pt-32 pb-20 px-4 md:px-16 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
          {/* ── Left: Main Content ─────────────── */}
          <div className="md:col-span-7 flex flex-col gap-12">

            {/* Hero Header */}
            <header className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <span className="font-data-label text-data-label text-primary-fixed border border-primary-fixed/30 px-3 py-1 bg-primary-fixed/5">
                  EPISODE {episodeLabel}
                </span>
              </div>
              <h1 className="font-display-lg text-display-lg text-primary">
                {page.title}
              </h1>

              {/* Tags */}
              <div className="flex flex-wrap gap-3">
                {page.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-surface-container-highest text-on-surface-variant font-data-label text-data-label border border-[rgba(255,255,255,0.1)]"
                  >
                    # {tag}
                  </span>
                ))}
              </div>

              {/* Listen on Spotify */}
              <div className="mt-4">
                <a
                  href="https://open.spotify.com/show/50grwY6FX198o7BoYlRH6D"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="flex items-center gap-3 bg-primary text-background font-bold px-8 py-4 transition-all hover:shadow-[0_0_20px_rgba(233,254,255,0.5)] active:scale-95">
                    <span className="material-symbols-outlined">play_circle</span>
                    Listen on Spotify
                  </button>
                </a>
              </div>
            </header>

            {/* Key Concepts */}
            {page.concepts.length > 0 && (
              <section className="flex flex-col gap-8">
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-4">
                  <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary-container">
                      science
                    </span>
                    Key Concepts
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {page.concepts.map((concept, idx) => (
                    <div
                      key={concept}
                      className="glass-card p-6 flex flex-col gap-3 group hover:border-primary/40 transition-colors"
                    >
                      <span className="font-data-label text-data-label text-primary">
                        CONCEPT {String(idx + 1).padStart(2, "0")}
                      </span>
                      <h3 className="font-headline-lg text-xl text-on-surface leading-snug">
                        {concept}
                      </h3>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Full Transcript */}
            {page.transcript && (
              <section className="glass-card overflow-hidden">
                <details>
                  <summary className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors cursor-pointer list-none">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-on-surface-variant">
                        description
                      </span>
                      <h2 className="font-headline-lg text-lg text-on-surface">
                        Full Transcript
                      </h2>
                    </div>
                    <span className="material-symbols-outlined transition-transform duration-300">
                      expand_more
                    </span>
                  </summary>
                  <div className="border-t border-[rgba(255,255,255,0.1)] p-8 bg-surface-container-lowest/50 text-on-surface-variant font-body-md leading-relaxed h-[400px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                    {page.transcript}
                  </div>
                </details>
              </section>
            )}

            {/* Comments — client component */}
            <CommentsSection wikiSlug={slug} />
          </div>

          {/* ── Right: Sidebar ─────────────────── */}
          <aside className="md:col-span-3 flex flex-col gap-10">

            {/* Live Literature — PubMed */}
            <section className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="font-data-label text-data-label text-primary tracking-widest uppercase">
                  Live Literature
                </h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-status-pulse pulse-effect" />
                  <span className="text-[10px] font-data-label text-status-pulse">
                    LIVE
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {papers.length === 0 ? (
                  <p className="font-data-label text-[11px] text-on-surface-variant">
                    No recent papers found.
                  </p>
                ) : (
                  papers.map((paper) => (
                    <a
                      key={paper.id}
                      href={`https://pubmed.ncbi.nlm.nih.gov/${paper.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass-card p-4 hover:bg-white/5 transition-all block group"
                    >
                      <h4 className="text-xs font-bold text-on-surface mb-1 group-hover:text-primary transition-colors line-clamp-2">
                        {paper.title}
                      </h4>
                      {paper.authors.length > 0 && (
                        <p className="font-data-label text-[10px] text-on-surface-variant mb-1">
                          {paper.authors.join(", ")}
                          {paper.authors.length === 3 ? " et al." : ""}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="font-data-label text-[10px] text-on-surface-variant">
                          {[paper.journal, paper.date].filter(Boolean).join(" · ")}
                        </span>
                        <span className="material-symbols-outlined text-[14px] text-primary/40 group-hover:text-primary transition-colors">
                          open_in_new
                        </span>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </section>

            {/* Knowledge Graph CTA */}
            <section className="relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
              <div className="glass-card p-8 border-primary/30 flex flex-col items-center text-center gap-4">
                <span className="material-symbols-outlined text-4xl text-primary animate-pulse">
                  hub
                </span>
                <h3 className="font-headline-lg text-lg text-on-surface">
                  Knowledge Graph
                </h3>
                <p className="text-sm text-on-surface-variant mb-4">
                  Visualize the multi-dimensional connections between researchers,
                  papers, and clinical results.
                </p>
                <Link href="/register" className="w-full">
                  <button className="w-full bg-primary-container text-on-primary-container py-3 font-bold hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all">
                    Register to explore graph
                  </button>
                </Link>
              </div>
            </section>

            {/* Related Episodes */}
            {relatedEpisodes.length > 0 && (
              <section className="flex flex-col gap-6">
                <h3 className="font-data-label text-data-label text-primary tracking-widest uppercase">
                  Related Episodes
                </h3>
                <div className="flex flex-col gap-4">
                  {relatedEpisodes.map((ep) => (
                    <Link
                      key={ep.slug}
                      href={`/topics/${ep.slug}`}
                      className="flex gap-3 group cursor-pointer"
                    >
                      <div className="w-16 h-16 shrink-0 glass-card flex items-center justify-center overflow-hidden">
                        <span className="material-symbols-outlined text-primary/40 text-3xl group-hover:text-primary transition-colors">
                          science
                        </span>
                      </div>
                      <div className="flex flex-col justify-center">
                        <span className="font-data-label text-[10px] text-primary">
                          EP #{String(ep.episode_number).padStart(2, "0")}
                        </span>
                        <h4 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                          {ep.title}
                        </h4>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>

      <Footer />
    </>
  );
}
