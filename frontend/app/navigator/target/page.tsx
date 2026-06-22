"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RoadmapTopBar from "@/components/navigator/RoadmapTopBar";
import ProvidersList from "@/components/navigator/ProvidersList";
import ResearchersWhoCanHelp from "@/components/navigator/ResearchersWhoCanHelp";
import { fetchPublicResearchers, matchResearchers } from "@/lib/navigatorResearchers";
import { downloadTargetRoadmapPDF } from "@/lib/navigatorPdf";
import type { TargetRoadmap, ResearcherMini } from "@/types/navigator";

// ── Static config ─────────────────────────────────────────────────────────────

const SCORING_CRITERIA_OPTIONS = [
  "Druggability",
  "Disease relevance",
  "Safety profile",
  "IP landscape",
  "Clinical precedent",
  "Expression specificity",
  "Network centrality",
];

const TARGET_VOLUME_OPTIONS = [
  "1-5 candidates",
  "5-20 candidates",
  "20-100 candidates",
  "100+ candidates",
];

const BUDGET_RANGE_OPTIONS = [
  "Academic / Grant-funded",
  "<$50k Seed",
  "$50-200k Series A",
  "$200k+ Industrial",
];

const STEP_CONFIG = [
  {
    id: "identify",
    name: "Identify",
    icon: "search",
    position: "top-4 left-1/2 -translate-x-1/2",
    badge: "AI SCORING",
    badgePosition: "-top-4 left-1/2 -translate-x-1/2",
    badgeStyle: "bg-surface-container-highest",
  },
  {
    id: "score",
    name: "Score",
    icon: "analytics",
    position: "right-4 top-1/2 -translate-y-1/2",
    badge: "RANKING",
    badgePosition: "-bottom-6 left-1/2 -translate-x-1/2",
    badgeStyle: "bg-secondary-container text-on-secondary-container shadow-sm",
  },
  {
    id: "assess",
    name: "Assess",
    icon: "fact_check",
    position: "bottom-4 left-1/2 -translate-x-1/2",
    badge: "PATIENT COHORT",
    badgePosition: "-bottom-6 left-1/2 -translate-x-1/2",
    badgeStyle: "bg-surface-container-highest",
  },
  {
    id: "fine-tune",
    name: "Fine-tune",
    icon: "tune",
    position: "left-4 top-1/2 -translate-y-1/2",
    badge: null,
    badgePosition: "",
    badgeStyle: "",
  },
];

const LOOP_CSS = `
.target-loop-line {
  stroke-dasharray: 8;
  animation: target-dash 30s linear infinite;
}
@keyframes target-dash {
  to { stroke-dashoffset: -1000; }
}
`;

function normalizeId(id: string) {
  return id.toLowerCase().replace(/[^a-z]/g, "");
}

// ── Form state ────────────────────────────────────────────────────────────────

type TargetFormState = {
  disease: string;
  targets: string;
  targetVolume: string;
  budgetRange: string;
  scoringCriteria: string[];
  patientCohort: string;
};

const DEFAULT_FORM: TargetFormState = {
  disease: "",
  targets: "",
  targetVolume: TARGET_VOLUME_OPTIONS[0],
  budgetRange: BUDGET_RANGE_OPTIONS[0],
  scoringCriteria: ["Druggability", "Disease relevance"],
  patientCohort: "",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TargetSpacePage() {
  const [view, setView] = useState<"form" | "roadmap">("form");
  const [form, setForm] = useState<TargetFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<TargetRoadmap | null>(null);
  const [selectedStepId, setSelectedStepId] = useState("score");
  const [allResearchers, setAllResearchers] = useState<ResearcherMini[]>([]);

  useEffect(() => {
    if (view !== "roadmap") return;
    fetchPublicResearchers().then(setAllResearchers);
  }, [view]);

  function toggleCriterion(label: string) {
    setForm((prev) => ({
      ...prev,
      scoringCriteria: prev.scoringCriteria.includes(label)
        ? prev.scoringCriteria.filter((c) => c !== label)
        : [...prev.scoringCriteria, label],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.disease.trim() || !form.targets.trim()) {
      setError("Please describe the disease/condition and your candidate targets.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ space: "target", ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate roadmap. Please try again.");
        return;
      }
      setRoadmap(data as TargetRoadmap);
      setSelectedStepId("score");
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
    await downloadTargetRoadmapPDF(roadmap);
  }

  // ── Roadmap view ─────────────────────────────────────────────────────────

  if (view === "roadmap" && roadmap) {
    const activeStep =
      roadmap.steps.find((s) => normalizeId(s.id) === selectedStepId) ?? roadmap.steps[0];
    const activeStepConfig = STEP_CONFIG.find((s) => s.id === selectedStepId);
    const matchedResearchers = activeStep
      ? matchResearchers(allResearchers, [
          activeStep.name,
          ...activeStep.tools,
          ...activeStep.scoring_criteria,
        ])
      : [];

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <style>{LOOP_CSS}</style>
        <Navbar />
        <RoadmapTopBar
          title={roadmap.title}
          summary={roadmap.summary}
          badgeLabel="Target Space"
          badgeClassName="bg-primary-container text-on-primary-container"
          onStartOver={handleStartOver}
          onDownloadPDF={handleDownloadPDF}
        />
        <main className="flex-grow max-w-[1280px] mx-auto w-full px-4 sm:px-margin py-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* LEFT PANEL: Circular Visualization */}
            <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-outline-variant p-lg relative overflow-hidden flex items-center justify-center min-h-[480px] sm:min-h-[600px]">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#00523c_1px,transparent_1px)] [background-size:24px_24px]" />
              </div>
              <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 500">
                  <circle cx="250" cy="250" fill="none" r="160" stroke="#E9ECEF" strokeWidth="2" />
                  <circle
                    className="target-loop-line"
                    cx="250"
                    cy="250"
                    fill="none"
                    r="160"
                    stroke="url(#target-gradient-primary)"
                    strokeLinecap="round"
                    strokeWidth="2"
                  />
                  <defs>
                    <linearGradient id="target-gradient-primary" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor="#1e6b52" />
                      <stop offset="100%" stopColor="#b4ecd3" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Center Node */}
                <div className="z-10 bg-primary text-on-primary w-32 h-32 rounded-full flex flex-col items-center justify-center text-center shadow-xl p-4 ring-8 ring-surface-container">
                  <span className="material-symbols-outlined text-[32px] mb-1">biotech</span>
                  <p className="font-label-sm text-[10px] uppercase tracking-widest opacity-80">
                    Center Node
                  </p>
                  <p className="font-headline-md text-[13px] leading-tight font-bold line-clamp-2">
                    {roadmap.title}
                  </p>
                </div>

                {/* Loop Nodes */}
                {STEP_CONFIG.map((step) => {
                  const isActive = step.id === selectedStepId;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setSelectedStepId(step.id)}
                      className={`absolute ${step.position} group`}
                    >
                      <div
                        className={`rounded-full flex flex-col items-center justify-center transition-all ${
                          isActive
                            ? "w-24 h-24 bg-primary-container text-on-primary-container shadow-lg ring-4 ring-primary-container/20"
                            : "w-20 h-20 bg-white border-2 border-outline-variant shadow-sm group-hover:border-primary"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined ${
                            isActive ? "text-[32px]" : "text-primary"
                          }`}
                        >
                          {step.icon}
                        </span>
                        <span className={`text-label-sm mt-1 ${isActive ? "font-bold" : ""}`}>
                          {step.name}
                        </span>
                      </div>
                      {step.badge && (
                        <span
                          className={`absolute ${step.badgePosition} ${step.badgeStyle} px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap`}
                        >
                          {step.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT PANEL: Details */}
            <div className="lg:col-span-5 flex flex-col gap-gutter">
              <div className="bg-white rounded-xl shadow-sm border border-outline-variant p-lg flex-grow">
                {activeStep && (
                  <>
                    <div className="flex items-center gap-md mb-md">
                      <div className="w-12 h-12 bg-primary-container rounded-lg flex items-center justify-center text-on-primary-container">
                        <span className="material-symbols-outlined">
                          {activeStepConfig?.icon ?? "biotech"}
                        </span>
                      </div>
                      <h2 className="font-headline-md text-headline-md text-primary">
                        {activeStep.name}
                      </h2>
                    </div>
                    <div className="space-y-md mb-lg">
                      <p className="text-on-surface-variant">{activeStep.description}</p>
                      {activeStep.scoring_criteria.length > 0 && (
                        <div className="bg-surface-container-low p-md rounded-lg border-l-4 border-primary">
                          <h3 className="font-bold text-label-sm text-primary mb-2 uppercase tracking-wider">
                            AI Scoring Criteria
                          </h3>
                          <ul className="space-y-2">
                            {activeStep.scoring_criteria.map((c) => (
                              <li key={c} className="flex items-start gap-2 text-body-md">
                                <span className="material-symbols-outlined text-secondary text-[18px] mt-0.5">
                                  check_circle
                                </span>
                                {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    {activeStep.tools.length > 0 && (
                      <div className="mb-lg">
                        <h3 className="font-bold text-label-sm text-on-surface mb-sm uppercase tracking-wider">
                          Recommended Software
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {activeStep.tools.map((tool) => (
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
                    <div className="space-y-md">
                      <h3 className="font-bold text-label-sm text-on-surface mb-sm uppercase tracking-wider">
                        Institutional Support
                      </h3>
                      <ProvidersList providers={activeStep.providers} />
                      <ResearchersWhoCanHelp researchers={matchedResearchers} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Strip Navigation */}
          <div className="mt-lg flex items-center gap-sm overflow-x-auto py-4 no-scrollbar">
            <span className="text-label-sm text-on-surface-variant font-bold uppercase tracking-widest mr-md whitespace-nowrap">
              Roadmap Steps:
            </span>
            {STEP_CONFIG.map((step) => {
              const isActive = step.id === selectedStepId;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setSelectedStepId(step.id)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-primary text-on-primary shadow-md"
                      : "bg-white border border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isActive ? "bg-secondary-fixed animate-pulse" : "bg-outline"
                    }`}
                  />
                  {step.name}
                </button>
              );
            })}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Form view ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow w-full max-w-4xl mx-auto px-4 sm:px-margin py-xl">
        <nav className="flex items-center gap-2 text-on-surface-variant font-label-sm mb-6">
          <Link href="/navigator" className="hover:text-primary transition-colors">
            Navigator
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-primary font-bold">Target Space</span>
        </nav>

        <header className="mb-xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary text-on-primary rounded-full mb-4">
            <span className="material-symbols-outlined text-sm">biotech</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Target Space</span>
          </div>
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-primary mb-2">
            Configure Your Target Space Roadmap
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto md:mx-0">
            Provide your disease and target details to generate an AI-scored ranking and
            assessment loop.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md md:p-lg shadow-[0px_4px_20px_rgba(0,0,0,0.05)] space-y-gutter"
        >
          {/* Disease or condition */}
          <div className="space-y-2">
            <label className="font-bold text-on-surface flex items-center gap-2" htmlFor="disease">
              <span className="material-symbols-outlined text-primary">vital_signs</span>
              Disease or Condition
            </label>
            <textarea
              id="disease"
              value={form.disease}
              onChange={(e) => setForm((p) => ({ ...p, disease: e.target.value }))}
              required
              className="w-full bg-surface border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-body-md placeholder:text-outline resize-none"
              placeholder="Describe the disease, patient population, pathophysiology, and unmet clinical needs..."
              rows={4}
            />
          </div>

          {/* Candidate targets */}
          <div className="space-y-2">
            <label className="font-bold text-on-surface flex items-center gap-2" htmlFor="targets">
              <span className="material-symbols-outlined text-primary">dns</span>
              Candidate Targets
            </label>
            <textarea
              id="targets"
              value={form.targets}
              onChange={(e) => setForm((p) => ({ ...p, targets: e.target.value }))}
              required
              className="w-full bg-surface border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-body-md placeholder:text-outline resize-none"
              placeholder="List your candidate targets, genes, or proteins (e.g., EGFR, KRAS G12C, TNF-alpha)..."
              rows={4}
            />
          </div>

          {/* Target volume / Budget range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
            <div className="space-y-2">
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide" htmlFor="target-volume">
                Target Volume
              </label>
              <select
                id="target-volume"
                value={form.targetVolume}
                onChange={(e) => setForm((p) => ({ ...p, targetVolume: e.target.value }))}
                className="w-full bg-surface border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer text-body-md"
              >
                {TARGET_VOLUME_OPTIONS.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide" htmlFor="budget-range">
                Budget Range
              </label>
              <select
                id="budget-range"
                value={form.budgetRange}
                onChange={(e) => setForm((p) => ({ ...p, budgetRange: e.target.value }))}
                className="w-full bg-surface border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer text-body-md"
              >
                {BUDGET_RANGE_OPTIONS.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Scoring criteria (multi-select) */}
          <div className="space-y-3">
            <label className="font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">monitoring</span>
              Scoring Criteria
            </label>
            <p className="text-label-sm text-on-surface-variant">
              Select the metrics that matter most for your roadmap priority score.
            </p>
            <div className="flex flex-wrap gap-2">
              {SCORING_CRITERIA_OPTIONS.map((opt) => {
                const active = form.scoringCriteria.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleCriterion(opt)}
                    className={`flex items-center gap-1 px-3 py-1.5 border rounded-lg font-label-sm text-label-sm transition-all ${
                      active
                        ? "bg-secondary-container text-on-secondary-container border-on-secondary-container"
                        : "border-outline-variant hover:border-primary"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{active ? "check" : "add"}</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Patient cohort */}
          <div className="space-y-2">
            <label className="font-bold text-on-surface flex items-center gap-2" htmlFor="patient-cohort">
              <span className="material-symbols-outlined text-primary">groups</span>
              Patient Cohort Specifics
              <span className="ml-1 text-xs font-normal text-on-surface-variant">(Optional)</span>
            </label>
            <textarea
              id="patient-cohort"
              value={form.patientCohort}
              onChange={(e) => setForm((p) => ({ ...p, patientCohort: e.target.value }))}
              className="w-full bg-surface border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-body-md placeholder:text-outline resize-none"
              placeholder="Any specific patient subgroup, biomarkers, or exclusion criteria..."
              rows={4}
            />
          </div>

          {/* Action bar */}
          <div className="pt-6 border-t border-outline-variant flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-2 text-center md:text-left">
              <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
              AI-ready input — cross-referenced against 14 academic databases.
            </div>
            <div className="flex flex-col items-stretch md:items-end gap-2 w-full md:w-auto">
              {error && <p className="text-error text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto bg-primary text-on-primary font-label-sm text-label-sm px-8 py-3.5 rounded-lg shadow-md hover:bg-primary-container hover:text-on-primary-container transition-all flex items-center justify-center gap-2 disabled:opacity-60 group"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Generating Roadmap...
                  </>
                ) : (
                  <>
                    Generate Target Roadmap
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                      rocket_launch
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
