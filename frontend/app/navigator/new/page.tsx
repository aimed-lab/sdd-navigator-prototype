"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { track } from "@/lib/posthog";
import type { ProposalInput, ProposalDocument } from "@/types/proposal";

// ── Static config ─────────────────────────────────────────────────────────────

// Real support options from the design (navigator-input.html). No fake defaults.
const SUPPORT_CHIPS = [
  "Advanced AI Design",
  "AI-Readiness Support",
  "Target Feasibility Assessment",
  "Discovery Pipeline Support",
  "Small-molecule Design",
  "Antibody Design",
];

// sessionStorage handoff key — see note at handleSubmit.
const PROPOSAL_STORAGE_KEY = "navigator:proposal";

type FormState = ProposalInput & { support_chips: string[] };

const EMPTY_FORM: FormState = {
  title_and_team: "",
  therapeutic_target: "",
  scientific_rationale: "",
  sparc_support_needed: "",
  validation_plan: "",
  expected_impact: "",
  project_readiness: "",
  support_chips: [],
};

// The three required fields (Group 1 — The Science).
const REQUIRED_FIELDS: (keyof FormState)[] = [
  "title_and_team",
  "therapeutic_target",
  "scientific_rationale",
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewProposalPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field] && value.trim()) {
      setFieldErrors((prev) => ({ ...prev, [field]: false }));
    }
  }

  function toggleChip(chip: string) {
    setForm((prev) => ({
      ...prev,
      support_chips: prev.support_chips.includes(chip)
        ? prev.support_chips.filter((c) => c !== chip)
        : [...prev.support_chips, chip],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Validate only the 3 required fields — a thin draft (just those 3) submits.
    const errors: Partial<Record<keyof FormState, boolean>> = {};
    for (const f of REQUIRED_FIELDS) {
      if (!String(form[f]).trim()) errors[f] = true;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("Please fill in the required fields marked below.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate proposal. Please try again.");
        return;
      }
      track("proposal_generated"); // fire-and-forget, only after a successful response

      // Handoff to the output page: persistence isn't built yet, so we stash the
      // generated document in sessionStorage and navigate. sessionStorage (not
      // router state) because App Router can't carry a large object across a
      // push, and it survives a refresh on the output page until the tab closes.
      // The output page (/navigator/proposal) reads this key; when save/load
      // lands it will instead load from the projects table by id.
      sessionStorage.setItem(PROPOSAL_STORAGE_KEY, JSON.stringify(data as ProposalDocument));
      router.push("/navigator/proposal");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Auth gate (consistent with /navigator) ───────────────────────────────

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
        <Navbar />
        <main className="flex-grow flex items-center justify-center px-4 py-xl">
          <div className="max-w-md w-full text-center flex flex-col items-center gap-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(30, 107, 82, 0.1)" }}
            >
              <span className="material-symbols-outlined text-4xl text-primary">lock</span>
            </div>
            <div className="space-y-2">
              <h2 className="font-headline-md text-headline-md text-on-surface">Restricted Access</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Sign in to start a new proposal and generate your AI-driven discovery plan.
              </p>
            </div>
            <div className="flex flex-col w-full gap-3">
              <Link
                href="/login?callbackUrl=/navigator/new"
                className="w-full py-3.5 rounded-lg font-bold flex items-center justify-center gap-2 bg-primary text-on-primary hover:opacity-90 transition-all"
              >
                <span className="material-symbols-outlined text-xl">login</span>
                Sign In to Continue
              </Link>
              <p className="text-sm text-on-surface-variant">
                New to SDD Navigator?{" "}
                <Link href="/register" className="font-bold text-primary hover:underline">
                  Register for an account
                </Link>
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow w-full max-w-[720px] mx-auto px-4 sm:px-margin py-xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 mb-8 text-label-sm font-label-sm text-on-surface-variant">
          <Link href="/navigator" className="hover:text-primary transition-colors">
            Navigator
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-primary font-bold">New Proposal</span>
        </nav>

        {/* Header */}
        <header className="mb-10 text-center">
          <h1 className="font-headline-lg text-headline-lg text-primary mb-2">
            Tell us about your project
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Describe what you have and what you need — we&rsquo;ll generate a phased discovery plan.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-10">
          <fieldset disabled={loading} className="space-y-10 disabled:opacity-60">
            {/* Group 1 — The Science (required) */}
            <section className="space-y-6">
              <GroupHeader label="Group 1 — The Science" hint="Required" />

              <Field
                id="title_and_team"
                label="Project title"
                required
                error={fieldErrors.title_and_team}
                value={form.title_and_team}
                onChange={(v) => update("title_and_team", v)}
                placeholder="e.g. Kinase-X Selective Inhibitor Program"
                multiline={false}
              />
              <Field
                id="therapeutic_target"
                label="Therapeutic target / what you have"
                required
                error={fieldErrors.therapeutic_target}
                value={form.therapeutic_target}
                onChange={(v) => update("therapeutic_target", v)}
                placeholder="Describe the biological target, existing data, or compounds you currently possess..."
              />
              <Field
                id="scientific_rationale"
                label="Scientific rationale"
                required
                error={fieldErrors.scientific_rationale}
                value={form.scientific_rationale}
                onChange={(v) => update("scientific_rationale", v)}
                placeholder="Explain the underlying science, disease mechanism, or unique approach..."
              />
            </section>

            {/* Group 2 — The Plan (recommended) */}
            <section className="space-y-6">
              <GroupHeader label="Group 2 — The Plan" hint="Recommended" />

              <Field
                id="sparc_support_needed"
                label="What you want to achieve & the support you need"
                value={form.sparc_support_needed}
                onChange={(v) => update("sparc_support_needed", v)}
                placeholder="Your key objectives and what you'd like SPARC or external providers to help with..."
              />
              <Field
                id="validation_plan"
                label="Plan for experimental validation"
                value={form.validation_plan}
                onChange={(v) => update("validation_plan", v)}
                placeholder="Describe your proposed validation experiments..."
              />
            </section>

            {/* Group 3 — Readiness & Impact (recommended) */}
            <section className="space-y-6">
              <GroupHeader label="Group 3 — Readiness & Impact" hint="Recommended" />

              <Field
                id="expected_impact"
                label="Expected impact"
                value={form.expected_impact}
                onChange={(v) => update("expected_impact", v)}
                placeholder="What is the potential clinical or scientific significance?"
              />
              <Field
                id="project_readiness"
                label="Project readiness"
                value={form.project_readiness}
                onChange={(v) => update("project_readiness", v)}
                placeholder="Current stage of development and resource availability..."
              />
            </section>

            {/* Support chips */}
            <section className="space-y-4">
              <label className="block text-label-md font-label-md text-on-surface">
                Type of support needed
                <span className="ml-2 text-xs font-normal text-on-surface-variant">(Optional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {SUPPORT_CHIPS.map((chip) => {
                  const active = form.support_chips.includes(chip);
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => toggleChip(chip)}
                      className={`px-5 py-2 rounded-full border text-label-md font-label-md transition-all ${
                        active
                          ? "bg-secondary-container text-on-secondary-container border-secondary-container"
                          : "border-outline-variant text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            </section>
          </fieldset>

          {/* Actions */}
          <div className="pt-2 flex flex-col items-end gap-3">
            {error && (
              <p className="w-full text-error text-sm text-right" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-md hover:bg-primary-container transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">
                    progress_activity
                  </span>
                  Generating your proposal…
                </>
              ) : (
                <>
                  Generate proposal
                  <span className="material-symbols-outlined text-[20px]">bolt</span>
                </>
              )}
            </button>
            {loading && (
              <p className="w-full text-right text-label-sm font-label-sm text-on-surface-variant">
                This can take a few seconds — the AI is drafting your phased plan.
              </p>
            )}
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function GroupHeader({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant pb-2">
      <h2 className="text-headline-md font-headline-md text-primary">{label}</h2>
      <span className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">
        {hint}
      </span>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  required = false,
  error = false,
  multiline = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  error?: boolean;
  multiline?: boolean;
}) {
  const base =
    "w-full bg-surface-container-lowest border rounded-xl p-4 text-body-md font-body-md outline-none transition-all shadow-sm placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-secondary-container";
  const borderClass = error ? "border-error" : "border-outline-variant";

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-label-md font-label-md text-on-surface">
        {label}
        {required ? (
          <span className="ml-1 text-error font-bold" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-2 text-xs font-normal text-on-surface-variant">(Optional)</span>
        )}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          aria-required={required}
          aria-invalid={error}
          className={`${base} ${borderClass} resize-none`}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-required={required}
          aria-invalid={error}
          className={`${base} ${borderClass}`}
        />
      )}
      {error && (
        <p className="text-error text-label-sm font-label-sm">This field is required.</p>
      )}
    </div>
  );
}
