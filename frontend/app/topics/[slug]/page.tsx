import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
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
    <section className="bg-surface-container-low rounded-xl p-8">
      <details>
        <summary className="w-full flex items-center justify-between cursor-pointer list-none group">
          <h2 className="font-headline-md text-headline-md text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">description</span>
            Full Transcript
          </h2>
          <span className="material-symbols-outlined text-primary group-open:rotate-180 transition-transform">
            expand_more
          </span>
        </summary>
        <div className="mt-6 font-mono text-sm leading-relaxed text-on-surface-variant border-t border-outline-variant pt-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar whitespace-pre-wrap">
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
    .select("id,slug,title,episode_number,transcript,concepts,tags,episode_url,description,summary")
    .eq("slug", slug)
    .single();

  if (error || !pageData) notFound();

  const page = pageData as WikiPage;

  const [relatedResult, papers] = await Promise.all([
    supabase
      .from("wiki_pages")
      .select("episode_number,title,slug")
      .neq("slug", slug)
      .order("episode_number", { ascending: false })
      .limit(3),
    fetchPubMedPapers(page.title),
  ]);

  const relatedEpisodes = relatedResult.data ?? [];

  const concepts: Concept[] = (page.concepts ?? []).map((c) =>
    typeof c === "string" ? { title: c, bullets: [] } : (c as Concept)
  );

  const summaryBullets: string[] = Array.isArray(page.summary) ? page.summary : [];

  // anchor.fm episode URLs redirect to the specific Spotify episode page for listeners.
  // Fall back to the show page only when the episode URL is missing.
  const spotifyUrl =
    page.episode_url?.trim() ||
    "https://open.spotify.com/show/50grwY6FX198o7BoYlRH6D";

  return (
    <div className="bg-background text-on-background font-body-md text-body-md">
      <Navbar />

      <main className="max-w-[1280px] mx-auto px-4 sm:px-gutter py-6 md:py-lg">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="bg-primary text-white px-3 py-1 rounded font-label-sm text-label-sm tracking-widest uppercase">
              Episode #{page.episode_number}
            </span>
          </div>

          <h1 className="font-bold text-[24px] sm:text-[32px] md:text-display-lg text-primary mb-4 md:mb-6 leading-tight">
            {page.title}
          </h1>

          <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4 md:mb-8">
            {page.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 md:px-4 md:py-1.5 bg-secondary-container text-on-secondary-container rounded-full font-label-sm text-label-sm"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Spotify button — full width on mobile */}
          <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" className="block sm:inline-block">
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#1DB954] text-white px-5 py-3 min-h-[48px] rounded-full font-bold hover:opacity-90 transition-all shadow-md">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                play_circle
              </span>
              Listen on Spotify
            </button>
          </a>
        </div>

        {/*
          On desktop: 2-column grid [main | sidebar]
          On mobile: all children stack top-to-bottom naturally
            col 1 = main content (summary, concepts, transcript)
            col 2 = sidebar (live lit, related, graph CTA)
            col 1 row 2 = comments (auto-placed back into left column on desktop)
        */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 lg:gap-12">

          {/* ── Main content (col 1 row 1 on desktop) ─────────── */}
          <div className="space-y-8 md:space-y-12">
            {/* Episode Summary */}
            {summaryBullets.length > 0 && (
              <section>
                <h2 className="font-headline-md text-headline-md text-primary border-b border-outline-variant pb-3 mb-5 md:mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined">summarize</span>
                  Episode Summary
                </h2>
                <div className="text-on-surface-variant text-base md:font-body-lg md:text-body-lg">
                  <ul className="space-y-3 md:space-y-4 list-disc pl-5 marker:text-primary">
                    {summaryBullets.map((bullet, i) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {page.description && !summaryBullets.length && (
              <section>
                <h2 className="font-headline-md text-headline-md text-primary border-b border-outline-variant pb-3 mb-5 md:mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined">summarize</span>
                  Episode Summary
                </h2>
                <p className="text-base md:font-body-lg md:text-body-lg text-on-surface-variant">{page.description}</p>
              </section>
            )}

            {/* Key Concepts — full width cards on mobile */}
            {concepts.length > 0 && (
              <section>
                <h2 className="font-headline-md text-headline-md text-primary mb-5 md:mb-6">Key Concepts</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {concepts.map((concept, idx) => (
                    <div key={idx} className="green-border-card p-4 md:p-6">
                      <h3 className="font-bold text-primary mb-2">{concept.title}</h3>
                      {concept.bullets.length > 0 && (
                        <p className="text-on-surface-variant font-body-md text-body-md text-sm md:text-base">
                          {concept.bullets.slice(0, 2).join(" • ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Transcript */}
            {page.transcript && <TranscriptSection transcript={page.transcript} />}
          </div>

          {/* ── Sidebar (col 2 on desktop, after main on mobile) ── */}
          <aside className="space-y-6 md:space-y-10">
            {/* Live Literature */}
            <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(0,0,0,0.05)] p-5 md:p-6 border border-outline-variant">
              <div className="flex justify-between items-center mb-5 md:mb-6">
                <h3 className="font-bold text-primary uppercase tracking-wider font-label-sm text-label-sm">
                  Live Literature
                </h3>
                <div className="flex items-center gap-2 bg-primary/10 px-2 py-1 rounded">
                  <span className="pulse-dot" />
                  <span className="text-[10px] font-bold text-primary">LIVE</span>
                </div>
              </div>

              {papers.length === 0 ? (
                <p className="text-on-surface-variant text-sm">No recent papers found.</p>
              ) : (
                <div className="space-y-5 md:space-y-6">
                  {papers.map((paper) => (
                    <a
                      key={paper.id}
                      href={`https://pubmed.ncbi.nlm.nih.gov/${paper.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block cursor-pointer"
                    >
                      {paper.journal && (
                        <div className="text-outline font-label-sm text-label-sm mb-1 uppercase">
                          {paper.journal}
                        </div>
                      )}
                      <h4 className="font-bold text-on-surface leading-tight group-hover:text-primary transition-colors line-clamp-2 text-sm md:text-base">
                        {paper.title}
                      </h4>
                      <div className="flex items-center gap-1 mt-2 text-primary font-label-sm text-label-sm">
                        <span className="material-symbols-outlined text-[14px]">description</span>
                        View Paper
                        {paper.date && <span className="text-outline ml-1">· {paper.date}</span>}
                      </div>
                    </a>
                  ))}
                </div>
              )}

              <button className="w-full mt-5 md:mt-6 py-3 min-h-[44px] text-center border-t border-outline-variant text-primary font-bold font-label-sm text-label-sm hover:bg-surface-container-low transition-colors">
                View All Stream
              </button>
            </div>

            {/* Related Episodes */}
            {relatedEpisodes.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-bold text-on-surface-variant uppercase tracking-widest font-label-sm text-label-sm">
                  Related Episodes
                </h3>
                <div className="space-y-3">
                  {relatedEpisodes.map((ep) => (
                    <Link key={ep.slug} href={`/topics/${ep.slug}`} className="flex gap-4 group">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-surface-container-high flex-shrink-0 flex items-center justify-center text-primary/30 group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-2xl">science</span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {ep.title}
                        </h4>
                        <p className="text-outline text-xs mt-1">Episode #{ep.episode_number}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Knowledge Graph CTA */}
            <Link href="/knowledge-hub?tab=graph">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-fixed to-secondary-fixed p-5 md:p-6 group cursor-pointer">
                <div className="relative z-10">
                  <h3 className="font-bold text-primary-fixed-variant mb-2">Explore the Knowledge Graph</h3>
                  <p className="text-on-primary-fixed-variant text-xs mb-4">
                    Visualize the relationships between concepts, target proteins, and clinical markers.
                  </p>
                  <div className="flex items-center gap-2 font-bold text-primary-fixed-variant text-sm">
                    Open Interactive Map
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform text-[18px]">
                      arrow_forward
                    </span>
                  </div>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-10">
                  <span className="material-symbols-outlined text-[120px]">hub</span>
                </div>
              </div>
            </Link>
          </aside>

          {/* ── Comments — auto-placed into col 1 row 2 on desktop, after sidebar on mobile ── */}
          <div className="lg:col-start-1">
            <CommentsSection wikiSlug={slug} />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
