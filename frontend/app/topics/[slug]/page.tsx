import { notFound } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import CommentsSection from "@/components/CommentsSection";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type Concept = { title: string; bullets: string[] };

type WikiPage = {
  id: string;
  slug: string;
  title: string;
  episode_number: number;
  transcript: string;
  concepts: Concept[] | string[];
  tags: string[];
  episode_url: string;
  description: string;
  summary: string[];
  image_url: string | null;
};

type RelatedEpisode = {
  episode_number: number;
  title: string;
  slug: string;
  image_url: string | null;
};

type PubMedPaper = {
  id: string;
  title: string;
  authors: string[];
  journal: string;
  date: string;
};

// ── PubMed ────────────────────────────────────────────────────────────────────

async function fetchPubMedPapers(query: string): Promise<PubMedPaper[]> {
  const thisYear = new Date().getFullYear();
  const fromYear = thisYear - 2;
  try {
    const searchRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi` +
        `?db=pubmed&term=${encodeURIComponent(query)}&retmax=8&retmode=json&sort=date&mindate=${fromYear}`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) return [];
    const searchData = await searchRes.json();
    const ids: string[] = searchData?.esearchresult?.idlist ?? [];
    if (ids.length === 0) return [];

    const summaryRes = await fetch(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi` +
        `?db=pubmed&id=${ids.join(",")}&retmode=json`,
      { next: { revalidate: 3600 } }
    );
    if (!summaryRes.ok) return [];
    const summaryData = await summaryRes.json();

    return ids
      .map((id) => {
        const doc = summaryData?.result?.[id];
        if (!doc || doc.error) return null;
        return {
          id,
          title: doc.title ?? "Untitled",
          authors: ((doc.authors ?? []) as { name: string }[]).slice(0, 3).map((a) => a.name),
          journal: doc.source ?? "",
          date: doc.pubdate ?? "",
        };
      })
      .filter(Boolean) as PubMedPaper[];
  } catch {
    return [];
  }
}

// ── Transcript toggle (inline client pattern using <details>) ─────────────────

function TranscriptSection({ transcript }: { transcript: string }) {
  return (
    <section className="bg-white rounded-xl border border-outline-variant shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05)] overflow-hidden">
      <details className="group">
        <summary className="w-full px-6 md:px-8 py-4 flex items-center justify-between cursor-pointer list-none bg-surface-container-low hover:bg-surface-container-high transition-colors">
          <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined">description</span>
            Full Transcript
          </h2>
          <span className="material-symbols-outlined text-on-surface group-open:rotate-180 transition-transform duration-300">
            expand_more
          </span>
        </summary>
        <div className="p-6 md:p-8 font-body-md text-body-md text-on-surface-variant italic leading-relaxed max-h-96 overflow-y-auto custom-scrollbar whitespace-pre-wrap border-t border-outline-variant">
          {transcript}
        </div>
      </details>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function WikiPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const { data: pageData, error } = await supabase
    .from("wiki_pages")
    .select("id,slug,title,episode_number,transcript,concepts,tags,episode_url,description,summary,image_url")
    .eq("slug", slug)
    .single();

  if (error || !pageData) notFound();

  const page = pageData as WikiPage;

  const [relatedResult, papers] = await Promise.all([
    supabase
      .from("wiki_pages")
      .select("episode_number,title,slug,image_url")
      .neq("slug", slug)
      .order("episode_number", { ascending: false })
      .limit(3),
    fetchPubMedPapers(page.title),
  ]);

  const relatedEpisodes = (relatedResult.data ?? []) as RelatedEpisode[];

  const concepts: Concept[] = (page.concepts ?? []).map((c) =>
    typeof c === "string" ? { title: c, bullets: [] } : (c as Concept)
  );

  const summaryBullets: string[] = Array.isArray(page.summary) ? page.summary : [];

  // Fallback to the show-level Spotify feed if this episode has no normalized episode_url yet.
  const spotifyShowUrl = "https://open.spotify.com/show/50grwY6FX198o7BoYlRH6D";
  const listenUrl = page.episode_url || spotifyShowUrl;

  // Note: this project's "tertiary" tokens are coral/red, not the green the
  // Stitch mockup assumes — so concept cards alternate within the green family instead.
  const CONCEPT_TINTS = [
    { bg: "bg-secondary-fixed/30", border: "border-secondary-fixed-dim", text: "text-secondary" },
    { bg: "bg-primary-fixed/30", border: "border-primary-fixed-dim", text: "text-primary" },
  ];

  return (
    <div className="bg-background text-on-background font-body-md text-body-md min-h-screen flex flex-col">
      <Nav />

      <main className="flex-1 max-w-[1280px] mx-auto w-full px-4 sm:px-gutter py-6 md:py-lg">
        {/*
          Two-column layout per the design:
            Main (≈65%): hero header, concepts, summary, transcript, discussion
            Sidebar (≈35%): live literature, related episodes, knowledge graph teaser
          Stacks to a single column on mobile (sidebar drops below).
        */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* ── Main content ───────────────────────────────────── */}
          <div className="w-full lg:w-[65%] space-y-8 md:space-y-12">
            {/* Hero / header card */}
            <section className="bg-white rounded-xl border border-outline-variant shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05)] p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-full md:w-48 h-48 rounded-lg overflow-hidden shrink-0 relative flex items-center justify-center">
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #00523c 0%, #1e6b52 60%, #0d9488 100%)" }}
                  >
                    <span className="material-symbols-outlined text-white/25 text-6xl">science</span>
                  </div>
                  {page.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={page.image_url}
                      alt={page.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="flex-grow space-y-3 min-w-0">
                  <span className="text-secondary text-sm font-medium uppercase tracking-wider">
                    Episode #{page.episode_number}
                  </span>
                  <h1 className="text-[28px] md:text-[32px] leading-tight font-semibold text-on-surface">
                    {page.title}
                  </h1>
                  {page.description && (
                    <p className="text-on-surface-variant font-body-md text-body-md leading-relaxed">
                      {page.description}
                    </p>
                  )}

                  {page.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {page.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full font-label-sm text-label-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <a
                      href={listenUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-secondary text-on-secondary px-6 py-3 min-h-[44px] rounded-full flex items-center gap-2 text-sm font-bold hover:shadow-lg transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                        play_arrow
                      </span>
                      Listen on Spotify
                    </a>
                  </div>
                </div>
              </div>
            </section>

            {/* Key Concepts */}
            {concepts.length > 0 && (
              <section className="space-y-4 md:space-y-6">
                <h2 className="font-headline-md text-headline-md text-on-surface">Key Concepts</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {concepts.map((concept, idx) => {
                    const tint = CONCEPT_TINTS[idx % CONCEPT_TINTS.length];
                    return (
                      <div key={idx} className={`${tint.bg} ${tint.border} border rounded-xl p-4 md:p-6`}>
                        <h3 className={`text-lg font-semibold ${tint.text} mb-2`}>{concept.title}</h3>
                        {concept.bullets.length > 0 && (
                          <ul className="space-y-1 list-disc list-inside text-on-surface-variant text-sm md:text-base">
                            {concept.bullets.map((bullet, bi) => (
                              <li key={bi}>{bullet}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Episode Summary */}
            {summaryBullets.length > 0 ? (
              <section className="bg-white rounded-xl border border-outline-variant shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05)] p-6 md:p-8">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-5 md:mb-6">Episode Summary</h2>
                <ul className="space-y-3 md:space-y-4 list-none">
                  {summaryBullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-3 text-on-surface-variant">
                      <span className="material-symbols-outlined text-secondary mt-0.5 shrink-0">check_circle</span>
                      <span className="text-base md:font-body-lg md:text-body-lg">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : page.description ? (
              <section className="bg-white rounded-xl border border-outline-variant shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05)] p-6 md:p-8">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-5 md:mb-6">Episode Summary</h2>
                <p className="text-base md:font-body-lg md:text-body-lg text-on-surface-variant">{page.description}</p>
              </section>
            ) : null}

            {/* Transcript */}
            {page.transcript && <TranscriptSection transcript={page.transcript} />}

            {/* Researcher Discussion */}
            <section className="bg-white rounded-xl border border-outline-variant shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05)] p-6 md:p-8">
              <CommentsSection wikiPageId={page.id} />
            </section>
          </div>

          {/* ── Sidebar ──────────────────────────────────────────── */}
          <aside className="w-full lg:w-[35%] space-y-6 md:space-y-8">
            {/* Live Literature (relocated from main column; still server-fetched) */}
            <div className="bg-white rounded-xl border border-outline-variant shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05)] p-5 md:p-6">
              <div className="flex items-center gap-3 mb-4 md:mb-5">
                <h3 className="text-lg font-semibold text-on-surface">Live Literature</h3>
                <div className="flex items-center gap-2 bg-primary/10 px-2 py-1 rounded">
                  <span className="pulse-dot" />
                  <span className="text-[10px] font-bold text-primary">LIVE</span>
                </div>
              </div>

              {papers.length === 0 ? (
                <p className="text-on-surface-variant text-sm">No recent papers found.</p>
              ) : (
                <div className="space-y-3">
                  {papers.map((paper) => (
                    <a
                      key={paper.id}
                      href={`https://pubmed.ncbi.nlm.nih.gov/${paper.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block bg-surface-container-low border-l-4 border-primary p-3 rounded-r-lg hover:shadow-md transition-shadow space-y-1"
                    >
                      {paper.journal && (
                        <p className="text-[12px] text-on-surface-variant italic">
                          {paper.journal}
                          {paper.date && ` · ${paper.date}`}
                        </p>
                      )}
                      <p className="text-sm font-medium text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
                        {paper.title}
                      </p>
                      <span className="text-[12px] text-secondary font-semibold">View on PubMed →</span>
                    </a>
                  ))}
                </div>
              )}

              <Link
                href="/discovery"
                className="mt-4 block w-full py-2.5 min-h-[44px] text-center border border-outline-variant rounded-lg text-primary font-bold font-label-sm text-label-sm hover:bg-surface-container-low transition-colors"
              >
                View All Stream
              </Link>
            </div>

            {/* Related Episodes */}
            {relatedEpisodes.length > 0 && (
              <div className="bg-white rounded-xl border border-outline-variant shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.05)] p-5 md:p-6">
                <h3 className="text-lg font-semibold text-on-surface mb-4 md:mb-5">Related Episodes</h3>
                <div className="space-y-3 md:space-y-4">
                  {relatedEpisodes.map((ep) => (
                    <Link
                      key={ep.slug}
                      href={`/topics/${ep.slug}`}
                      className="group flex gap-4 hover:bg-surface-container-low p-2 rounded-lg transition-all -mx-2"
                    >
                      <div className="w-20 h-20 rounded flex-shrink-0 overflow-hidden relative">
                        <div className="absolute inset-0 bg-surface-container-high flex items-center justify-center text-primary/30 group-hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-2xl">science</span>
                        </div>
                        {ep.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ep.image_url}
                            alt={ep.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : null}
                      </div>
                      <div className="space-y-1 min-w-0">
                        <span className="text-[10px] text-secondary font-bold uppercase tracking-tight">
                          EP {ep.episode_number}
                        </span>
                        <h4 className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                          {ep.title}
                        </h4>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Knowledge Graph Teaser */}
            <Link href="/knowledge-graph">
              <div className="bg-primary text-on-primary p-5 md:p-6 rounded-xl border border-primary-container relative overflow-hidden group cursor-pointer">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container/40 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700" />
                <div className="relative z-10 space-y-3 md:space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary-fixed">hub</span>
                    <h3 className="text-lg font-semibold text-white">Knowledge Graph</h3>
                  </div>
                  <p className="text-sm text-white/90 leading-relaxed">
                    Visualize the connections between this episode&apos;s concepts, cited papers, and future research directions.
                  </p>
                  <div className="w-full h-20 bg-white/10 rounded-lg flex items-center justify-center border border-white/20 group-hover:bg-white/15 transition-all">
                    <span className="text-sm font-medium text-primary-fixed">Launch Interactive Map</span>
                  </div>
                </div>
              </div>
            </Link>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
