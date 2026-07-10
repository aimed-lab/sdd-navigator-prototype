"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { downloadProposalPDF } from "@/lib/navigatorPdf";
import { cleanText } from "@/lib/sanitizeText";
import { track } from "@/lib/posthog";
import type {
  ProposalInput,
  ProposalDocument,
  ProposalPhase,
  ProposalProvider,
  ProposalResearchItem,
  ProposalResearchType,
  ProposalRecap,
} from "@/types/proposal";

const PROPOSAL_STORAGE_KEY = "navigator:proposal";

type SaveState = "idle" | "saving" | "saved" | "error";

// The recap is a lossless mirror of the 7-field ProposalInput, so we can
// reconstruct input_data straight from the document with no second stash.
// (recap.title === input.title_and_team.)
function recapToInput(recap: ProposalRecap): ProposalInput {
  return {
    title_and_team: recap.title,
    therapeutic_target: recap.therapeutic_target,
    scientific_rationale: recap.scientific_rationale,
    sparc_support_needed: recap.sparc_support_needed,
    validation_plan: recap.validation_plan,
    expected_impact: recap.expected_impact,
    project_readiness: recap.project_readiness,
    support_chips: recap.support_chips,
  };
}

// ── Page (Suspense boundary required for useSearchParams) ─────────────────────

export default function ProposalOutputPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
      }
    >
      <ProposalOutputContent />
    </Suspense>
  );
}

function ProposalOutputContent() {
  const { user, displayName, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("id"); // reopen a saved proposal by id

  // Open "Connect" modal target — the provider + capability the user clicked.
  // null = closed. Rendered once at this level so it overlays the whole page.
  const [connectFor, setConnectFor] = useState<{ providerName: string; capability: string } | null>(null);

  // `undefined` = still loading; `null` = nothing to show.
  const [doc, setDoc] = useState<ProposalDocument | null | undefined>(undefined);

  // Save state. `savedId` is set once a project row exists (either loaded by id
  // or after a successful save) so subsequent saves UPDATE the same row.
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Reopen path: an ?id= means load the saved project from the DB (RLS-scoped).
    if (projectId) {
      (async () => {
        try {
          const res = await fetch(`/api/projects/${projectId}`);
          const data = await res.json();
          if (cancelled) return;
          if (!res.ok || !data.project?.output_data) {
            setDoc(null);
            return;
          }
          setDoc(data.project.output_data as ProposalDocument);
          setSavedId(data.project.id as string);
          setSaveState("saved"); // it's already persisted
        } catch {
          if (!cancelled) setDoc(null);
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    // Fresh path: read the just-generated document handed off via sessionStorage.
    try {
      const raw = sessionStorage.getItem(PROPOSAL_STORAGE_KEY);
      setDoc(raw ? (JSON.parse(raw) as ProposalDocument) : null);
    } catch {
      setDoc(null);
    }
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function handleDownloadPDF() {
    if (!doc) return;
    track("proposal_pdf_downloaded"); // fire-and-forget
    await downloadProposalPDF(doc);
  }

  async function handleSave() {
    if (!doc || saveState === "saving") return;
    setSaveState("saving");
    setSaveError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: savedId ?? undefined, // present → update; absent → create
          title: doc.recap.title || doc.title,
          input_data: recapToInput(doc.recap),
          output_data: doc,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.id) {
        setSaveError(data.error ?? "Could not save your project. Please try again.");
        setSaveState("error");
        return;
      }
      track("proposal_saved"); // fire-and-forget, only after success
      setSavedId(data.id as string);
      setSaveState("saved");
    } catch {
      setSaveError("Network error. Please try again.");
      setSaveState("error");
    }
  }

  // ── Auth gate (consistent with /navigator/new) ───────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Nav />
        <main className="flex-grow flex items-center justify-center px-4 py-xl">
          <div className="max-w-md w-full text-center flex flex-col items-center gap-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(30, 107, 82, 0.1)" }}>
              <span className="material-symbols-outlined text-4xl text-primary">lock</span>
            </div>
            <div className="space-y-2">
              <h2 className="font-headline-md text-headline-md text-on-surface">Restricted Access</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Sign in to view your generated proposal.
              </p>
            </div>
            <Link
              href="/login?callbackUrl=/navigator/new"
              className="w-full py-3.5 rounded-lg font-bold flex items-center justify-center gap-2 bg-primary text-on-primary hover:opacity-90 transition-all"
            >
              <span className="material-symbols-outlined text-xl">login</span>
              Sign In to Continue
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Empty state (no document handed off) ─────────────────────────────────

  if (doc === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (doc === null) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Nav />
        <main className="flex-grow flex items-center justify-center px-4 py-xl">
          <div className="max-w-md w-full text-center flex flex-col items-center gap-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center bg-surface-container-high">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant">description</span>
            </div>
            <div className="space-y-2">
              <h2 className="font-headline-md text-headline-md text-on-surface">No proposal to show</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Start a new proposal and we&rsquo;ll generate your phased discovery plan here.
              </p>
            </div>
            <Link
              href="/navigator/new"
              className="w-full py-3.5 rounded-lg font-bold flex items-center justify-center gap-2 bg-primary text-on-primary hover:opacity-90 transition-all"
            >
              <span className="material-symbols-outlined text-xl">add</span>
              Start a New Proposal
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Document ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Nav />
      <main className="flex-grow w-full max-w-[960px] mx-auto px-4 sm:px-margin py-xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-6 text-label-sm font-label-sm text-on-surface-variant">
          <Link href="/navigator" className="hover:text-primary transition-colors">Navigator</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <Link href="/navigator/new" className="hover:text-primary transition-colors">New Proposal</Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-primary font-bold">Proposal</span>
        </nav>

        {/* 1. Header */}
        <section className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10">
          <div className="max-w-2xl">
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-2 leading-tight">
              {doc.title}
            </h1>
            {doc.summary && (
              <p className="font-body-md text-body-md text-on-surface-variant">
                <span className="font-semibold">AI Summary:</span> {doc.summary}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              onClick={handleSave}
              disabled={saveState === "saving" || saveState === "saved"}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl border-2 font-label-md text-label-md transition-all disabled:cursor-default ${
                saveState === "saved"
                  ? "border-primary bg-primary text-on-primary"
                  : "border-primary text-primary hover:bg-primary hover:text-on-primary"
              }`}
            >
              {saveState === "saving" ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                  Saving…
                </>
              ) : saveState === "saved" ? (
                <>
                  <span className="material-symbols-outlined text-[20px]">check</span>
                  Saved
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">bookmark</span>
                  Save Project
                </>
              )}
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">download</span>
              Download PDF
            </button>
          </div>
        </section>

        {saveState === "error" && saveError && (
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-error/40 bg-error/5 p-4" role="alert">
            <span className="material-symbols-outlined text-error">error</span>
            <div className="flex-1">
              <p className="text-sm text-on-surface font-medium">{saveError}</p>
            </div>
            <button
              onClick={handleSave}
              className="text-sm font-semibold text-primary hover:underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* 2. Your project (recap) */}
        <RecapBlock recap={doc.recap} />

        {/* 3. Phases */}
        <div className="space-y-16">
          {doc.phases.map((phase, i) => (
            <PhaseSection key={phase.id || i} phase={phase} index={i} onConnect={setConnectFor} />
          ))}
        </div>
      </main>
      <Footer />

      {/* Connect request modal — on-platform, no external contact shown */}
      {connectFor && (
        <ConnectModal
          providerName={connectFor.providerName}
          capability={connectFor.capability}
          projectId={savedId}
          requesterName={displayName}
          requesterEmail={user.email ?? ""}
          onClose={() => setConnectFor(null)}
        />
      )}
    </div>
  );
}

// ── Recap block ─────────────────────────────────────────────────────────────

function RecapBlock({ recap }: { recap: ProposalRecap }) {
  const fields: { label: string; value: string }[] = [
    { label: "Target / Current Assets", value: recap.therapeutic_target },
    { label: "Support Needed", value: recap.sparc_support_needed },
    { label: "Scientific Rationale", value: recap.scientific_rationale },
    { label: "Validation Plan", value: recap.validation_plan },
    { label: "Expected Impact", value: recap.expected_impact },
    { label: "Readiness State", value: recap.project_readiness },
  ].filter((f) => f.value && f.value.trim());

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 mb-12 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-primary">description</span>
        <h2 className="font-headline-md text-headline-md text-on-surface">Your project</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-12">
        {fields.map((f) => (
          <div key={f.label}>
            <span className="font-label-sm text-label-sm text-on-surface-variant block uppercase mb-1">
              {f.label}
            </span>
            <p className="font-body-md text-body-md text-on-surface">{f.value}</p>
          </div>
        ))}
      </div>
      {recap.support_chips.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2 items-center">
          <span className="font-label-sm text-label-sm text-on-surface-variant mr-2 uppercase">
            Support needed:
          </span>
          {recap.support_chips.map((chip) => (
            <span
              key={chip}
              className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full font-label-sm text-label-sm"
            >
              {chip}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Phase section ─────────────────────────────────────────────────────────────

function PhaseSection({
  phase,
  index,
  onConnect,
}: {
  phase: ProposalPhase;
  index: number;
  onConnect: (target: { providerName: string; capability: string }) => void;
}) {
  return (
    <section>
      {/* Phase header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-outline-variant pb-4 mb-8 gap-2">
        <div>
          <h3 className="font-headline-md text-headline-md text-primary">
            Phase {index + 1} — {phase.title}
          </h3>
          {phase.goal && (
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Goal: {phase.goal}
            </p>
          )}
        </div>
        {phase.estimated_duration && (
          <div className="shrink-0 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">
            Est. Duration: {phase.estimated_duration}
          </div>
        )}
      </div>

      {/* Expected outcomes / deliverables — what the researcher walks away with */}
      {phase.outcomes && phase.outcomes.length > 0 && (
        <div className="mb-8 rounded-xl border border-outline-variant bg-secondary-container/30 p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-[20px]">flag</span>
            <h4 className="font-label-md text-label-md text-on-surface uppercase tracking-wide">
              Expected outcomes
            </h4>
          </div>
          <ul className="space-y-2">
            {phase.outcomes.map((outcome, i) => (
              <li key={i} className="flex items-start gap-2 font-body-md text-body-md text-on-surface">
                <span className="material-symbols-outlined text-primary text-[18px] mt-0.5 shrink-0">
                  check_circle
                </span>
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Providers */}
      {phase.providers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {phase.providers.map((p, i) => (
            <ProviderCard key={`${p.name}-${i}`} provider={p} onConnect={onConnect} />
          ))}
        </div>
      ) : (
        <div className="mb-8 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-6 text-center">
          <span className="material-symbols-outlined text-on-surface-variant text-[28px]">domain_add</span>
          <p className="mt-1 text-sm font-medium text-on-surface">No verified SPARC providers for this phase yet</p>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto">
            This phase would draw on external providers or the researcher&rsquo;s own
            capabilities. The relevant research below still applies.
          </p>
        </div>
      )}

      {/* Researchers placeholder + relevant research — equal-height card grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        <ResearcherPlaceholder />
        {phase.papers.map((paper) => (
          <PaperCard key={paper.id} paper={paper} />
        ))}
      </div>
    </section>
  );
}

// ── Provider card (generic Verified — SPARC is not special-cased) ─────────────

function ProviderCard({
  provider,
  onConnect,
}: {
  provider: ProposalProvider;
  onConnect: (target: { providerName: string; capability: string }) => void;
}) {
  const cost = provider.cost_symbol ?? "—";

  // The specific service the researcher is asking about — the card's grounded
  // capabilities, falling back to its speciality. Kept on-platform: we open a
  // request modal, never an email or the provider's external contact.
  const capability = provider.capabilities.join(", ") || provider.speciality || "";

  function handleConnect() {
    track("provider_connect_clicked"); // fire-and-forget, before opening the modal
    onConnect({ providerName: provider.name, capability });
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 hover:shadow-md transition-shadow flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 bg-surface-container rounded-lg flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[28px]">verified</span>
        </div>
        <div className="flex items-center gap-2">
          {provider.is_free && (
            <span className="bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full font-label-sm text-label-sm">
              Free
            </span>
          )}
          <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-label-sm text-label-sm flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              verified
            </span>
            Verified
          </span>
        </div>
      </div>

      <h4 className="font-headline-md text-headline-md text-on-surface mb-1">{provider.name}</h4>
      {provider.speciality && (
        <p className="font-body-md text-body-md text-on-surface-variant mb-3">{provider.speciality}</p>
      )}
      {provider.how && (
        <p className="text-sm text-on-surface-variant leading-relaxed mb-4">{provider.how}</p>
      )}

      {(provider.capabilities.length > 0 || provider.tools.length > 0) && (
        <div className="space-y-2 mb-4">
          {provider.capabilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {provider.capabilities.map((c) => (
                <span key={c} className="px-2 py-0.5 rounded-full bg-primary/5 text-primary text-[11px] font-medium">
                  {c}
                </span>
              ))}
            </div>
          )}
          {provider.tools.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {provider.tools.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[11px] font-mono">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between items-center py-4 border-y border-outline-variant mb-6 mt-auto">
        <div className="text-center px-4 border-r border-outline-variant flex-1">
          <span className="block font-label-sm text-label-sm text-on-surface-variant mb-1">COST</span>
          <span className="font-headline-md text-headline-md text-primary">{cost}</span>
        </div>
        <div className="text-center px-4 flex-1">
          <span className="block font-label-sm text-label-sm text-on-surface-variant mb-1">TIMELINE</span>
          <span className="font-body-md text-body-md font-bold text-on-surface">
            {provider.estimated_timeline ?? "—"}
          </span>
        </div>
      </div>

      <button
        onClick={handleConnect}
        className="w-full py-3 bg-surface-container-lowest border-2 border-primary text-primary font-label-md text-label-md rounded-xl hover:bg-primary hover:text-on-primary transition-all"
      >
        Connect
      </button>
    </div>
  );
}

// ── Connect request modal (on-platform capture; no external contact shown) ────

type ConnectState = "idle" | "sending" | "sent" | "error";

function ConnectModal({
  providerName,
  capability,
  projectId,
  requesterName,
  requesterEmail,
  onClose,
}: {
  providerName: string;
  capability: string;
  projectId: string | null;
  requesterName: string;
  requesterEmail: string;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<ConnectState>("idle");
  const [error, setError] = useState<string | null>(null);
  const sending = state === "sending";

  async function handleSend() {
    if (sending) return;
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_name: providerName,
          capability,
          project_id: projectId, // may be null (unsaved proposal) — that's fine
          message,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not send your request. Please try again.");
        setState("error");
        return;
      }
      track("connection_request_sent"); // fire-and-forget, only after success
      setState("sent");
    } catch {
      setError("Network error. Please try again.");
      setState("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label={`Connect with ${providerName}`}
      onClick={() => !sending && onClose()}
    >
      <div
        className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded-2xl shadow-xl p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {state === "sent" ? (
          // ── Confirmation ──────────────────────────────────────────────────
          <div className="text-center flex flex-col items-center gap-4 py-4">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-secondary-container">
              <span className="material-symbols-outlined text-primary text-[32px]">mark_email_read</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-headline-md text-headline-md text-on-surface">Request sent</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Request sent — UAB SPARC will respond through the platform.
              </p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          // ── Request form ──────────────────────────────────────────────────
          <>
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Connect with {providerName}</h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  Your request stays on the platform — SPARC responds here.
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={sending}
                aria-label="Close"
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container disabled:opacity-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Read-only context: what they're asking about + who's asking */}
            <div className="space-y-4 mb-5">
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant block uppercase mb-1">Provider</span>
                <p className="font-body-md text-body-md text-on-surface">{providerName}</p>
              </div>
              {capability && (
                <div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant block uppercase mb-1">Service</span>
                  <p className="font-body-md text-body-md text-on-surface">{capability}</p>
                </div>
              )}
              <div>
                <span className="font-label-sm text-label-sm text-on-surface-variant block uppercase mb-1">Requesting as</span>
                <p className="font-body-md text-body-md text-on-surface">
                  {requesterName}
                  {requesterEmail ? <span className="text-on-surface-variant"> · {requesterEmail}</span> : null}
                </p>
              </div>
            </div>

            {/* Optional message */}
            <label htmlFor="connect-message" className="font-label-sm text-label-sm text-on-surface-variant block uppercase mb-2">
              What do you need help with? <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              id="connect-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              rows={4}
              placeholder="Briefly describe what you're looking for…"
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-body-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary disabled:opacity-60 resize-none"
            />

            {state === "error" && error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-error/40 bg-error/5 p-3" role="alert">
                <span className="material-symbols-outlined text-error text-[20px]">error</span>
                <p className="text-sm text-on-surface flex-1">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                disabled={sending}
                className="px-5 py-2.5 rounded-xl border-2 border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-container disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:opacity-90 disabled:opacity-70 transition-all flex items-center gap-2"
              >
                {sending ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    Sending…
                  </>
                ) : state === "error" ? (
                  "Retry"
                ) : (
                  "Send request"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Researcher match placeholder (dormant — Talent Knowledge Graph) ───────────

function ResearcherPlaceholder() {
  return (
    <div className="h-full bg-surface-container-low border border-dashed border-outline-variant rounded-xl p-5 flex flex-col items-center justify-center text-center gap-3">
      <div className="w-12 h-12 bg-surface-container-lowest rounded-lg shadow-sm flex items-center justify-center shrink-0">
        <span className="material-symbols-outlined text-on-surface-variant text-[24px]">hub</span>
      </div>
      <div>
        <h5 className="font-label-md text-label-md text-on-surface mb-1">Researchers who can help</h5>
        <p className="font-label-sm text-label-sm text-on-surface-variant max-w-[220px] mx-auto">
          Collaborator matching coming soon via the Talent Knowledge Graph.
        </p>
      </div>
    </div>
  );
}

// ── Relevant-research card (paper / trial / funding opportunity) ──────────────

// Honest labels — grants are Grants.gov FUNDING OPPORTUNITIES (broad calls), not
// target-specific awarded research, so they're never labelled "Grant".
const RESEARCH_META: Record<
  ProposalResearchType,
  { label: string; icon: string }
> = {
  paper: { label: "Paper", icon: "article" },
  trial: { label: "Trial", icon: "clinical_notes" },
  grant: { label: "Funding Opportunity", icon: "payments" },
};

function PaperCard({ paper }: { paper: ProposalResearchItem }) {
  const title = cleanText(paper.title);
  const source = cleanText(paper.source);
  // Older saved proposals have items with no `type` → treat as "paper".
  const meta = RESEARCH_META[paper.type] ?? RESEARCH_META.paper;
  return (
    <a
      href={paper.url}
      target="_blank"
      rel="noopener noreferrer"
      className="h-full bg-surface-container-lowest border border-outline-variant rounded-xl p-5 hover:border-outline hover:shadow-sm transition-all flex items-start gap-4"
    >
      <div className="w-12 h-12 bg-surface-container rounded-lg shrink-0 flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-[24px]">{meta.icon}</span>
      </div>
      <div className="flex flex-col min-w-0">
        <span className="self-start mb-1.5 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold uppercase tracking-wide">
          {meta.label}
        </span>
        <h5 className="font-label-md text-label-md text-on-surface leading-snug mb-1 line-clamp-3">
          {title}
        </h5>
        <p className="font-label-sm text-label-sm text-on-surface-variant truncate">
          {source}
          {paper.date ? ` • ${paper.date}` : ""}
        </p>
      </div>
    </a>
  );
}
