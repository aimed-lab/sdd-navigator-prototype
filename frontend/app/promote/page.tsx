"use client";

import { useState } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import type { PaperMetadata } from "@/lib/server/promote/fetchPaper";
import type { PromoVariant } from "@/lib/server/promote/generatePosts";

// =============================================================================
// /promote — Promote feature (step 3, demo prototype).
// =============================================================================
// Flow: paste a DOI/PubMed ID → fetch metadata (/api/promote/fetch-paper) →
// auto-generate 4 LinkedIn variants (/api/promote/generate-posts) → preview +
// Copy / Open LinkedIn → optional, skippable ORCID/LinkedIn capture
// (/api/promote/capture). No auto-posting anywhere. Public page (no auth).
// Visual style follows the existing app tokens (see app/navigator/new).
// =============================================================================

type Tone = PromoVariant["tone"];

// Friendlier tab labels than the raw tone slugs.
const TONE_LABELS: Record<Tone, string> = {
  "plain-impact": "Plain & Direct",
  "peer-technical": "For Peers",
  narrative: "Our Story",
  milestone: "Quick Share",
};

const TONE_ORDER: Tone[] = ["plain-impact", "peer-technical", "narrative", "milestone"];

// Compose a variant into the exact plain text that gets copied / previewed —
// the way it would actually read on LinkedIn.
function composePost(v: PromoVariant): string {
  return `${v.hook}\n\n${v.body}\n\n${v.hashtags.join(" ")}\n\n${v.closingTag}`;
}

export default function PromotePage() {
  const [idInput, setIdInput] = useState("");
  const [paper, setPaper] = useState<PaperMetadata | null>(null);
  const [variants, setVariants] = useState<PromoVariant[] | null>(null);
  const [activeTone, setActiveTone] = useState<Tone>("plain-impact");

  const [fetching, setFetching] = useState(false); // fetch-paper in flight
  const [generating, setGenerating] = useState(false); // generate-posts in flight
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Capture is revealed only AFTER the user's first Copy/Open — it must never
  // gate the value (the draft) they already got. Skippable + one-shot.
  const [showCapture, setShowCapture] = useState(false);
  const [captureDismissed, setCaptureDismissed] = useState(false);

  const busy = fetching || generating;

  // ── Step 1 → 2: fetch metadata, then auto-generate ──────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = idInput.trim();
    if (!id || busy) return;

    // Reset downstream state for a fresh lookup.
    setError(null);
    setPaper(null);
    setVariants(null);
    setCopied(false);
    setShowCapture(false);
    setCaptureDismissed(false);
    setFetching(true);

    try {
      const res = await fetch(`/api/promote/fetch-paper?id=${encodeURIComponent(id)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error ?? "Couldn't find that paper. Check the DOI or PubMed ID.");
        return;
      }
      const fetched = data as PaperMetadata;
      setPaper(fetched);
      await generatePosts(fetched);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setFetching(false);
    }
  }

  async function generatePosts(fetched: PaperMetadata) {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/promote/generate-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fetched),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.variants) {
        setError(data?.error ?? "Couldn't generate posts. Please try again.");
        return;
      }
      const vs = data.variants as PromoVariant[];
      setVariants(vs);
      setActiveTone(vs[0]?.tone ?? "plain-impact");
    } catch {
      setError("Network error while generating posts. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  const active = variants?.find((v) => v.tone === activeTone) ?? null;

  // ── Preview actions ─────────────────────────────────────────────────────────
  async function handleCopy() {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(composePost(active));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't access the clipboard. You can select and copy the text manually.");
    }
    revealCapture();
  }

  function handleOpenLinkedIn() {
    // Opens the LinkedIn feed only — NO auto-posting / API integration (out of scope).
    window.open("https://www.linkedin.com/feed/", "_blank", "noopener,noreferrer");
    revealCapture();
  }

  function revealCapture() {
    if (!captureDismissed) setShowCapture(true);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Nav />
      <main className="flex-grow w-full max-w-[760px] mx-auto px-4 sm:px-margin py-xl">
        {/* Header */}
        <header className="mb-8 text-center">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "rgba(30, 107, 82, 0.1)" }}
          >
            <span className="material-symbols-outlined text-3xl text-primary">campaign</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-primary mb-2">Promote your paper</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Paste a DOI or PubMed ID and get four ready-to-post LinkedIn drafts, grounded in your
            paper&rsquo;s own abstract.
          </p>
        </header>

        {/* Step 1 — input */}
        <form onSubmit={handleSubmit} className="mb-8">
          <label htmlFor="paper_id" className="block text-label-md font-label-md text-on-surface mb-2">
            Paste a DOI or PubMed ID
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="paper_id"
              type="text"
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              placeholder="e.g. 10.64898/2026.07.09.737590 or 23539594"
              disabled={busy}
              className="flex-grow bg-surface-container-lowest border border-outline-variant rounded-xl p-4 text-body-md font-body-md outline-none transition-all shadow-sm placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-secondary-container disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || !idInput.trim()}
              className="px-8 py-3 bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
            >
              {fetching ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">
                    progress_activity
                  </span>
                  Finding…
                </>
              ) : (
                <>
                  Generate posts
                  <span className="material-symbols-outlined text-[20px]">bolt</span>
                </>
              )}
            </button>
          </div>
          {error && (
            <p className="mt-3 text-error text-sm flex items-center gap-1.5" role="alert">
              <span className="material-symbols-outlined text-[18px]">error</span>
              {error}
            </p>
          )}
        </form>

        {/* Step 2 — paper confirmation card */}
        {paper && (
          <section className="mb-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary text-[22px] mt-0.5">description</span>
              <div className="min-w-0">
                <h2 className="font-headline-md text-[18px] text-on-surface leading-snug">
                  {paper.title}
                </h2>
                <p className="mt-1 text-body-md text-on-surface-variant line-clamp-1">
                  {paper.authors.length ? paper.authors.join(", ") : "Authors unavailable"}
                </p>
                <p className="mt-1 text-label-sm font-label-sm text-on-surface-variant">
                  {[paper.publishedDate, paper.doi ? `DOI ${paper.doi}` : paper.pmid ? `PMID ${paper.pmid}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Step 2 loading — generating posts */}
        {generating && (
          <div className="mb-6 flex flex-col items-center justify-center gap-3 py-10 bg-surface-container-lowest border border-outline-variant rounded-xl">
            <span className="material-symbols-outlined animate-spin text-3xl text-primary">
              progress_activity
            </span>
            <p className="text-body-md text-on-surface-variant">
              Drafting your four LinkedIn posts — this can take a few seconds…
            </p>
          </div>
        )}

        {/* Step 3 — variants + preview */}
        {variants && active && (
          <section>
            {/* Tone selector */}
            <div className="flex flex-wrap gap-2 mb-4">
              {TONE_ORDER.filter((t) => variants.some((v) => v.tone === t)).map((tone) => {
                const isActive = tone === activeTone;
                return (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setActiveTone(tone)}
                    className={`px-5 py-2 rounded-full border text-label-md font-label-md transition-all ${
                      isActive
                        ? "bg-secondary-container text-on-secondary-container border-secondary-container"
                        : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {TONE_LABELS[tone]}
                  </button>
                );
              })}
            </div>

            {/* LinkedIn-style preview card */}
            <article className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
              {/* Post header — avatar + name placeholders */}
              <div className="flex items-center gap-3 p-4 border-b border-outline-variant/60">
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-secondary-container">person</span>
                </div>
                <div className="leading-tight">
                  <p className="font-label-md text-label-md text-on-surface font-semibold">Your Name</p>
                  <p className="text-label-sm font-label-sm text-on-surface-variant">
                    Author · now · <span className="material-symbols-outlined text-[13px] align-middle">public</span>
                  </p>
                </div>
              </div>

              {/* Post body */}
              <div className="p-4">
                <p className="font-body-md text-body-md text-on-surface font-semibold mb-3">
                  {active.hook}
                </p>
                <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap leading-relaxed">
                  {active.body}
                </p>
                <p className="mt-3 flex flex-wrap gap-x-2 gap-y-1">
                  {active.hashtags.map((tag) => (
                    <span key={tag} className="text-[#0a66c2] font-label-md text-label-md">
                      {tag}
                    </span>
                  ))}
                </p>
                <p className="mt-3 text-label-sm font-label-sm text-on-surface-variant italic">
                  {active.closingTag}
                </p>
              </div>
            </article>

            {/* Actions */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 px-6 py-3 bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {copied ? "check" : "content_copy"}
                </span>
                {copied ? "Copied!" : "Copy to Clipboard"}
              </button>
              <button
                type="button"
                onClick={handleOpenLinkedIn}
                className="flex-1 px-6 py-3 bg-surface-container-lowest border border-primary/40 text-primary font-label-md text-label-md rounded-xl hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                Open LinkedIn
              </button>
            </div>

            {/* Optional capture — revealed after first Copy/Open, skippable */}
            {showCapture && paper && (
              <CaptureForm
                paper={paper}
                onDone={() => {
                  setShowCapture(false);
                  setCaptureDismissed(true);
                }}
              />
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

// ── Capture form ────────────────────────────────────────────────────────────────
// Honest, low-pressure: the draft is already in hand. Two optional identity
// fields, and a visible Skip. Never blocks the preview above it.

function CaptureForm({ paper, onDone }: { paper: PaperMetadata; onDone: () => void }) {
  const [orcid, setOrcid] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = Boolean(orcid.trim() || linkedinUrl.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/promote/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doi: paper.doi,
          pmid: paper.pmid,
          paperTitle: paper.title,
          authorName: paper.authors[0] ?? null, // best-effort attribution (no name field collected)
          orcid: orcid.trim(),
          linkedinUrl: linkedinUrl.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Couldn't save. Please try again.");
      }
      setSaved(true);
      setTimeout(onDone, 1200);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <div className="mt-5 bg-secondary-container/40 border border-secondary-container rounded-xl p-4 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">check_circle</span>
        <p className="text-body-md text-on-surface">Thanks — that helps us track reach.</p>
      </div>
    );
  }

  const inputCls =
    "w-full bg-surface-container-lowest border border-outline-variant rounded-xl p-3 text-body-md font-body-md outline-none transition-all shadow-sm placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-secondary-container";

  return (
    <form onSubmit={submit} className="mt-5 bg-surface-container-low border border-outline-variant rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-headline-md text-[17px] text-on-surface">Optional — help us track your reach</h3>
        <button
          type="button"
          onClick={onDone}
          className="text-label-sm font-label-sm text-on-surface-variant hover:text-primary shrink-0"
        >
          Skip
        </button>
      </div>
      <p className="text-label-sm font-label-sm text-on-surface-variant mb-4">
        Link your ORCID or LinkedIn so we can attribute the promotion to you. Entirely optional — your
        draft is already ready above.
      </p>
      <div className="space-y-3">
        <input
          type="text"
          value={orcid}
          onChange={(e) => setOrcid(e.target.value)}
          placeholder="ORCID iD (e.g. 0000-0002-1825-0097)"
          className={inputCls}
        />
        <input
          type="text"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          placeholder="LinkedIn profile URL"
          className={inputCls}
        />
      </div>
      {err && (
        <p className="mt-3 text-error text-sm flex items-center gap-1.5" role="alert">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {err}
        </p>
      )}
      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2 text-label-md font-label-md text-on-surface-variant hover:text-on-surface transition-colors"
        >
          Not now
        </button>
        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="px-6 py-2.5 bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-md hover:bg-primary-container transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving && (
            <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
          )}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
