"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RoadmapTopBar from "@/components/navigator/RoadmapTopBar";
import ProvidersList from "@/components/navigator/ProvidersList";
import ResearchersWhoCanHelp from "@/components/navigator/ResearchersWhoCanHelp";
import { fetchPublicResearchers, matchResearchers } from "@/lib/navigatorResearchers";
import { downloadValidationRoadmapPDF } from "@/lib/navigatorPdf";
import type { ValidationRoadmap, ResearcherMini } from "@/types/navigator";

// ── Static config ─────────────────────────────────────────────────────────────

const VALIDATION_DONE_OPTIONS = [
  "Computational binding",
  "In vitro binding",
  "Cell viability",
  "Phenotypic cell assay",
  "ADMET profiling",
  "In vivo mouse model",
  "NHP study",
  "Phase I safety",
];

const MILESTONE_OPTIONS = [
  "Cell level validation",
  "Animal model studies",
  "IND filing",
  "Phase I trial",
  "Phase II trial",
];

const BUDGET_OPTIONS = ["< $100k", "$100k - $500k", "$500k - $2M", "$2M - $5M", "$5M +"];

const TIMELINE_OPTIONS = ["0 - 6 months", "6 - 12 months", "12 - 24 months", "24+ months"];

const MILESTONE_CHIPS = [
  { label: "IND-Enabling Studies", icon: "rocket_launch" },
  { label: "GLP Toxicology", icon: "biotech" },
  { label: "IRB Protocol Approval", icon: "clinical_notes" },
  { label: "GMP Manufacturing Setup", icon: "inventory_2" },
];

// ── Form state ────────────────────────────────────────────────────────────────

type ValidationFormState = {
  compoundDetails: string;
  validationDone: string[];
  targetIndication: string;
  milestone: string;
  budget: string;
  timeline: string;
};

const DEFAULT_FORM: ValidationFormState = {
  compoundDetails: "",
  validationDone: [],
  targetIndication: "",
  milestone: "",
  budget: "",
  timeline: "",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ValidationSpacePage() {
  const [view, setView] = useState<"form" | "roadmap">("form");
  const [form, setForm] = useState<ValidationFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<ValidationRoadmap | null>(null);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [allResearchers, setAllResearchers] = useState<ResearcherMini[]>([]);

  useEffect(() => {
    if (view !== "roadmap") return;
    fetchPublicResearchers().then(setAllResearchers);
  }, [view]);

  function toggleValidationDone(label: string) {
    setForm((prev) => ({
      ...prev,
      validationDone: prev.validationDone.includes(label)
        ? prev.validationDone.filter((v) => v !== label)
        : [...prev.validationDone, label],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.compoundDetails.trim() || !form.targetIndication.trim()) {
      setError("Please describe your compound and target indication.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ space: "validation", ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate roadmap. Please try again.");
        return;
      }
      const result = data as ValidationRoadmap;
      setRoadmap(result);
      setSelectedLevel(result.current_level ?? 1);
      setView("roadmap");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleStartOver() {
    setView("form");
    setRoadmap(null);
    setError(null);
  }

  async function handleDownloadPDF() {
    if (!roadmap) return;
    await downloadValidationRoadmapPDF(roadmap);
  }

  // ── Roadmap view ─────────────────────────────────────────────────────────

  if (view === "roadmap" && roadmap) {
    const selected =
      roadmap.context_levels.find((l) => l.level === selectedLevel) ?? roadmap.context_levels[0];
    const matchedResearchers = selected
      ? matchResearchers(allResearchers, [
          selected.name,
          ...selected.tools,
          ...selected.experiments,
        ])
      : [];

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <RoadmapTopBar
          title={roadmap.title}
          summary={roadmap.summary}
          badgeLabel="Validation Space"
          badgeClassName="bg-[#fef3c7] text-[#92400e]"
          onStartOver={handleStartOver}
          onDownloadPDF={handleDownloadPDF}
        />
        <main className="flex-grow max-w-[1280px] mx-auto w-full px-4 sm:px-margin py-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
            {/* LEFT PANEL: Validation Ladder */}
            <aside className="lg:col-span-5 bg-surface-container-low p-md rounded-xl border border-outline-variant/30">
              <div className="mb-md flex items-center justify-between gap-2">
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Validation Ladder
                </h2>
                <span className="font-label-sm text-label-sm text-on-surface-variant italic hidden sm:inline">
                  Select a level to view details
                </span>
              </div>
              <div className="relative flex flex-col space-y-3">
                {[...roadmap.context_levels].reverse().map((level) => {
                  const isActive = level.level === selectedLevel;
                  return (
                    <button
                      key={level.level}
                      type="button"
                      onClick={() => setSelectedLevel(level.level)}
                      className={`group relative flex items-center gap-md p-3 rounded-lg transition-all duration-300 text-left ${
                        isActive
                          ? "bg-amber-500 text-white shadow-lg translate-x-4"
                          : "bg-white hover:translate-x-1 text-on-surface-variant"
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${
                          isActive
                            ? "border-white/50 bg-white/20"
                            : "border-outline-variant bg-surface-container-high"
                        }`}
                      >
                        {level.level}
                      </div>
                      <div className="text-left min-w-0">
                        <div
                          className={`font-headline-md text-[18px] leading-tight ${
                            isActive ? "text-white" : "text-primary"
                          }`}
                        >
                          {level.name}
                        </div>
                        <div className="font-label-sm text-[11px] opacity-80 uppercase tracking-tighter truncate">
                          {level.description}
                        </div>
                      </div>
                      {isActive && (
                        <span className="material-symbols-outlined ml-auto shrink-0">
                          arrow_forward_ios
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* RIGHT PANEL: Details */}
            <div className="lg:col-span-7 flex flex-col gap-gutter">
              {selected && (
                <>
                  <div className="bg-white/80 backdrop-blur-md border border-outline-variant/30 p-lg rounded-xl shadow-sm overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16" />
                    <div className="flex items-start justify-between mb-md gap-4">
                      <div>
                        <h3 className="font-headline-md text-headline-md text-primary">
                          Level {selected.level}: {selected.name}
                        </h3>
                        <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
                          {selected.description}
                        </p>
                      </div>
                      {selected.is_current && (
                        <span className="font-label-sm text-label-sm text-amber-600 uppercase shrink-0 px-3 py-1 rounded-full bg-amber-50 border border-amber-200">
                          Current Focus
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md border-t border-outline-variant/30 pt-md mb-lg">
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                          Est. Cost Range
                        </span>
                        <span className="font-headline-md text-[20px] text-primary">
                          {selected.cost_range}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                          Typical Timeline
                        </span>
                        <span className="font-headline-md text-[20px] text-primary">
                          {selected.timeline}
                        </span>
                      </div>
                    </div>
                    {selected.experiments.length > 0 && (
                      <div className="space-y-md mb-lg">
                        <h4 className="font-headline-md text-[18px] text-on-surface flex items-center gap-xs">
                          <span className="material-symbols-outlined text-amber-500">checklist</span>
                          Required Experiments
                        </h4>
                        <ul className="space-y-sm">
                          {selected.experiments.map((exp) => (
                            <li
                              key={exp}
                              className="flex items-start gap-sm p-3 bg-surface rounded-lg border border-outline-variant/20"
                            >
                              <span className="material-symbols-outlined text-secondary mt-0.5">
                                check_circle
                              </span>
                              <span className="font-body-md font-bold">{exp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selected.tools.length > 0 && (
                      <div>
                        <h4 className="font-bold text-label-sm text-on-surface mb-sm uppercase tracking-wider">
                          Recommended Tools
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selected.tools.map((tool) => (
                            <span
                              key={tool}
                              className="bg-secondary-container text-on-secondary-container px-3 py-1.5 rounded-full text-label-sm font-medium"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Providers & Researchers */}
                  <div className="bg-white/80 backdrop-blur-md border border-outline-variant/30 p-lg rounded-xl shadow-sm space-y-gutter">
                    <ProvidersList providers={selected.providers} />
                    <ResearchersWhoCanHelp researchers={matchedResearchers} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* BOTTOM STRIP: Milestones */}
          <section className="mt-xl pt-lg border-t border-outline-variant/30">
            <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-[0.2em] mb-md text-center">
              Upcoming Validation Milestones
            </h3>
            <div className="flex flex-wrap justify-center gap-sm">
              {MILESTONE_CHIPS.map((chip) => (
                <span
                  key={chip.label}
                  className="px-4 py-2 bg-white border border-outline-variant rounded-full font-label-sm text-label-sm flex items-center gap-xs shadow-sm hover:border-amber-500 transition-colors cursor-default"
                >
                  <span className="material-symbols-outlined text-amber-500 text-[18px]">
                    {chip.icon}
                  </span>
                  {chip.label}
                </span>
              ))}
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Form view ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-margin py-xl">
        <nav className="flex items-center gap-2 mb-6 text-on-surface-variant font-label-sm uppercase tracking-wider">
          <Link href="/navigator" className="hover:text-primary transition-colors">
            Navigator
          </Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-on-surface font-bold">Validation Space</span>
        </nav>

        <header className="mb-xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500 text-white rounded-full mb-4">
            <span className="material-symbols-outlined text-sm">verified_user</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Validation Space</span>
          </div>
          <h1 className="text-display-lg-mobile md:text-display-lg font-display-lg text-primary leading-tight mb-2">
            Configure Your <span className="text-amber-500">Validation Space</span> Roadmap
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto md:mx-0">
            Detail your lead compound&apos;s current status to map out the wet lab and
            preclinical validation journey. This data fuels our predictive models to optimize
            your path to clinical readiness.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-container-lowest p-md md:p-lg rounded-xl border border-outline-variant shadow-[0px_4px_20px_rgba(0,0,0,0.05)] space-y-gutter"
        >
          {/* Compound details */}
          <div className="space-y-2">
            <label className="font-bold text-on-surface flex items-center gap-2" htmlFor="compound-details">
              <span className="material-symbols-outlined text-amber-500">biotech</span>
              What compound do you have?
            </label>
            <textarea
              id="compound-details"
              value={form.compoundDetails}
              onChange={(e) => setForm((p) => ({ ...p, compoundDetails: e.target.value }))}
              required
              className="w-full bg-surface border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-body-md placeholder:text-outline resize-none"
              placeholder="Describe your lead compound, chemical scaffold, or biologic entity..."
              rows={3}
            />
          </div>

          {/* Validation done (multi-select) */}
          <div className="space-y-3">
            <label className="font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">checklist</span>
              What validation have you done so far?
            </label>
            <div className="flex flex-wrap gap-2">
              {VALIDATION_DONE_OPTIONS.map((opt) => {
                const active = form.validationDone.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleValidationDone(opt)}
                    className={`flex items-center gap-1 px-3 py-1.5 border rounded-lg font-label-sm text-label-sm transition-all ${
                      active
                        ? "bg-amber-500/10 border-amber-500 text-amber-600"
                        : "border-outline-variant hover:border-amber-500 text-on-surface-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{active ? "check" : "add"}</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target indication */}
          <div className="space-y-2">
            <label className="font-bold text-on-surface flex items-center gap-2" htmlFor="target-indication">
              <span className="material-symbols-outlined text-amber-500">flag</span>
              What is your target indication?
            </label>
            <textarea
              id="target-indication"
              value={form.targetIndication}
              onChange={(e) => setForm((p) => ({ ...p, targetIndication: e.target.value }))}
              required
              className="w-full bg-surface border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-body-md placeholder:text-outline resize-none"
              placeholder="Specify disease area, population, or target mechanism..."
              rows={2}
            />
          </div>

          {/* Three-column dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="space-y-2">
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide" htmlFor="milestone">
                Next Milestone
              </label>
              <select
                id="milestone"
                value={form.milestone}
                onChange={(e) => setForm((p) => ({ ...p, milestone: e.target.value }))}
                className="w-full bg-surface border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer text-body-md"
              >
                <option value="" disabled>
                  Select...
                </option>
                {MILESTONE_OPTIONS.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide" htmlFor="budget">
                Budget for Wet Lab
              </label>
              <select
                id="budget"
                value={form.budget}
                onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
                className="w-full bg-surface border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer text-body-md"
              >
                <option value="" disabled>
                  Select range...
                </option>
                {BUDGET_OPTIONS.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide" htmlFor="timeline">
                Timeline
              </label>
              <select
                id="timeline"
                value={form.timeline}
                onChange={(e) => setForm((p) => ({ ...p, timeline: e.target.value }))}
                className="w-full bg-surface border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer text-body-md"
              >
                <option value="" disabled>
                  Target duration...
                </option>
                {TIMELINE_OPTIONS.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action bar */}
          <div className="pt-6 border-t border-outline-variant flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-2 text-center md:text-left">
              <span className="material-symbols-outlined text-amber-500 text-lg">lock</span>
              Secure encrypted submission
            </div>
            <div className="flex flex-col items-stretch md:items-end gap-2 w-full md:w-auto">
              {error && <p className="text-error text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto bg-amber-500 text-white font-label-sm text-label-sm px-8 py-3.5 rounded-lg shadow-md hover:bg-amber-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60 group"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Generating Roadmap...
                  </>
                ) : (
                  <>
                    Generate Validation Roadmap
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                      auto_awesome
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        {/* Trust factors */}
        <section className="mt-xl grid grid-cols-1 md:grid-cols-3 gap-gutter pt-xl border-t border-outline-variant">
          <div className="flex gap-4 p-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-primary text-3xl shrink-0">clinical_notes</span>
            <div>
              <h3 className="font-bold text-on-surface mb-1">Peer-Reviewed Quality</h3>
              <p className="text-label-sm text-on-surface-variant">
                Our validation criteria map directly to NIH and FDA standard roadmaps for IND
                clearance.
              </p>
            </div>
          </div>
          <div className="flex gap-4 p-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-primary text-3xl shrink-0">monitoring</span>
            <div>
              <h3 className="font-bold text-on-surface mb-1">Predictive Success</h3>
              <p className="text-label-sm text-on-surface-variant">
                Benchmark your compound against 4,000+ historical preclinical study results for
                success probability.
              </p>
            </div>
          </div>
          <div className="flex gap-4 p-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-primary text-3xl shrink-0">account_balance</span>
            <div>
              <h3 className="font-bold text-on-surface mb-1">Institutional Oversight</h3>
              <p className="text-label-sm text-on-surface-variant">
                Developed by the University of Alabama at Birmingham with full IRB compliance and
                data integrity.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
