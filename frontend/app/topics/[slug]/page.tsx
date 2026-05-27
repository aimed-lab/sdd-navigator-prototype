import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CommentsSection from "@/components/CommentsSection";
import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type Concept = {
  title: string;
  bullets: string[];
};

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
// Transcript toggle (client component)
// ─────────────────────────────────────────────

function TranscriptToggle({ transcript }: { transcript: string }) {
  return (
    <div className="academic-card overflow-hidden">
      <details>
        <summary className="w-full flex items-center justify-between p-stack-md bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer list-none">
          <span className="font-title-md text-title-md text-on-surface">
            View Full Transcript
          </span>
          <span className="material-symbols-outlined">expand_more</span>
        </summary>
        <div className="p-stack-lg border-t border-outline-variant bg-white">
          <div className="space-y-stack-md text-body-md text-on-surface-variant max-h-[400px] overflow-y-auto pr-4 custom-scrollbar whitespace-pre-wrap">
            {transcript}
          </div>
        </div>
      </details>
    </div>
  );
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
    .select(
      "id, slug, title, episode_number, transcript, concepts, tags, episode_url, description, summary"
    )
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
  const episodeLabel = `EP ${String(page.episode_number).padStart(3, "0")}`;
  const spotifyUrl =
    page.episode_url || "https://open.spotify.com/show/50grwY6FX198o7BoYlRH6D";

  // Normalise concepts — may be string[] (legacy) or Concept[] (new)
  const concepts: Concept[] = (page.concepts ?? []).map((c) => {
    if (typeof c === "string") return { title: c, bullets: [] };
    return c as Concept;
  });

  // Summary bullets
  const summaryBullets: string[] = Array.isArray(page.summary)
    ? page.summary
    : [];

  return (
    <div className="bg-background text-on-surface min-h-screen">
      <Navbar />

      <main className="max-w-container-max mx-auto px-margin-desktop py-stack-lg">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-gutter">
          {/* ── Left Column: Content ─────────────── */}
          <section className="space-y-stack-lg">
            {/* Header */}
            <div className="space-y-stack-md">
              <div className="flex items-center gap-stack-md flex-wrap">
                <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-sm text-label-md font-label-md uppercase tracking-wider">
                  {episodeLabel}
                </span>
                <div className="flex flex-wrap gap-2">
                  {page.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-outline text-label-md font-label-md"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                {page.title}
              </h1>

              {page.description && (
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl">
                  {page.description}
                </p>
              )}

              {/* Spotify button */}
              <div className="pt-2">
                <a
                  href={spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <button className="flex items-center gap-2 border-2 border-primary text-primary px-6 py-2 rounded-lg font-title-md text-title-md hover:bg-primary/5 transition-colors">
                    <span
                      className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      play_circle
                    </span>
                    Listen on Spotify
                  </button>
                </a>
              </div>
            </div>

            {/* Episode Summary (bullets) */}
            {summaryBullets.length > 0 && (
              <article className="academic-card p-stack-lg shadow-sm">
                <h2 className="font-title-lg text-title-lg text-on-surface mb-stack-md border-b border-outline-variant pb-stack-sm">
                  Episode Summary
                </h2>
                <ul className="space-y-stack-md list-none text-body-md text-on-surface-variant">
                  {summaryBullets.map((bullet, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="material-symbols-outlined text-primary mt-1 shrink-0">
                        check_circle
                      </span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </article>
            )}

            {/* Key Concepts */}
            {concepts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
                {concepts.map((concept, idx) => (
                  <div
                    key={idx}
                    className="academic-card p-stack-md border-l-4 border-l-primary"
                  >
                    <h3 className="font-title-md text-title-md text-primary mb-2">
                      {concept.title}
                    </h3>
                    {concept.bullets.length > 0 && (
                      <ul className="mt-stack-sm space-y-1 text-body-sm text-on-surface-variant opacity-80">
                        {concept.bullets.slice(0, 3).map((b, bi) => (
                          <li key={bi}>• {b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Full Transcript */}
            {page.transcript && (
              <TranscriptToggle transcript={page.transcript} />
            )}

            {/* Comments — client component */}
            <CommentsSection wikiSlug={slug} />
          </section>

          {/* ── Right Sidebar ─────────────────────── */}
          <aside className="space-y-stack-lg lg:sticky lg:top-24 self-start">
            {/* Live Literature */}
            <div className="academic-card p-stack-md">
              <div className="flex items-center justify-between mb-stack-md">
                <div className="flex items-center gap-2">
                  <span className="pulse-dot" />
                  <h3 className="font-title-md text-title-md text-on-surface">
                    Live Literature
                  </h3>
                </div>
                <span className="text-label-md font-label-md text-outline uppercase tracking-tight">
                  Real-time
                </span>
              </div>

              <div className="space-y-stack-md">
                {papers.length === 0 ? (
                  <p className="text-[12px] text-on-surface-variant">
                    No recent papers found.
                  </p>
                ) : (
                  papers.map((paper) => (
                    <a
                      key={paper.id}
                      href={`https://pubmed.ncbi.nlm.nih.gov/${paper.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block cursor-pointer"
                    >
                      <h4 className="text-body-sm font-title-md text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                        {paper.title}
                      </h4>
                      {paper.authors.length > 0 && (
                        <p className="text-[12px] text-outline mt-1">
                          {paper.authors.join(", ")}
                          {paper.authors.length === 3 ? " et al." : ""} •{" "}
                          {paper.journal}
                          {paper.date ? ` • ${paper.date}` : ""}
                        </p>
                      )}
                    </a>
                  ))
                )}
              </div>

              <button className="w-full mt-stack-md py-2 text-label-md font-label-md text-primary border border-primary/20 hover:bg-primary/5 transition-all rounded">
                View Research Hub
              </button>
            </div>

            {/* Related Episodes */}
            {relatedEpisodes.length > 0 && (
              <div className="academic-card p-stack-md">
                <h3 className="font-title-md text-title-md text-on-surface mb-stack-md">
                  Related Episodes
                </h3>
                <div className="space-y-stack-md">
                  {relatedEpisodes.map((ep) => (
                    <Link
                      key={ep.slug}
                      href={`/topics/${ep.slug}`}
                      className="flex gap-3 group"
                    >
                      <div className="w-16 h-16 bg-surface-container-high rounded shrink-0 flex items-center justify-center overflow-hidden border border-outline-variant">
                        <span className="material-symbols-outlined text-primary/40 text-3xl group-hover:text-primary transition-colors">
                          science
                        </span>
                      </div>
                      <div>
                        <h4 className="text-body-sm font-title-md text-on-surface group-hover:text-primary transition-colors line-clamp-2">
                          EP #{String(ep.episode_number).padStart(2, "0")}:{" "}
                          {ep.title}
                        </h4>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Knowledge Graph CTA */}
            <div className="academic-card bg-on-surface text-on-primary p-stack-md overflow-hidden relative">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-secondary-fixed">
                    hub
                  </span>
                  <h3 className="font-title-md text-title-md">
                    Knowledge Graph
                  </h3>
                </div>
                <p className="text-body-sm text-on-primary/70 mb-stack-md">
                  Visualizing 12,000+ connections between concepts and clinical
                  markers.
                </p>
                <div className="relative h-20 w-full flex items-center justify-center opacity-40 select-none mb-2">
                  <svg
                    className="absolute inset-0 w-full h-full fill-none"
                    style={{ stroke: "rgba(255,255,255,0.2)" }}
                  >
                    <line x1="50%" y1="50%" x2="70%" y2="70%" />
                    <line x1="50%" y1="50%" x2="35%" y2="35%" />
                    <circle cx="50%" cy="50%" r="20" style={{ stroke: "rgba(255,255,255,0.1)" }} />
                  </svg>
                  <div className="absolute w-3 h-3 bg-secondary-container rounded-full" />
                </div>
                <Link href="/register" className="block">
                  <button className="w-full py-2 bg-secondary-container text-on-secondary-container rounded font-label-md text-label-md font-bold">
                    Open Interactive View
                  </button>
                </Link>
              </div>
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
