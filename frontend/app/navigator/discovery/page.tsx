"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import RoadmapTopBar from "@/components/navigator/RoadmapTopBar";
import ProvidersList from "@/components/navigator/ProvidersList";
import CROPartnersList from "@/components/navigator/CROPartnersList";
import ResearchersWhoCanHelp from "@/components/navigator/ResearchersWhoCanHelp";
import { fetchPublicResearchers, matchResearchers } from "@/lib/navigatorResearchers";
import { downloadDiscoveryRoadmapPDF } from "@/lib/navigatorPdf";
import type { DiscoveryRoadmap, ResearcherMini } from "@/types/navigator";

// ── Static config ─────────────────────────────────────────────────────────────

const APPROACH_OPTIONS = [
  { value: "scratch", label: "Virtual screening from scratch" },
  { value: "repositioning", label: "Drug repositioning" },
  { value: "natural", label: "Natural compound inspired" },
  { value: "fragment", label: "Fragment based discovery" },
  { value: "hits", label: "I have existing hit compounds" },
];

const OPTIMIZATION_GOAL_OPTIONS = [
  "Improve binding affinity",
  "Improve selectivity",
  "Improve solubility",
  "BBB penetration",
  "Reduce toxicity",
  "Improve metabolic stability",
  "Reduce off-target effects",
];

const TIMELINE_OPTIONS = ["6 months", "12 months", "24 months", "36+ months"];

const BUDGET_OPTIONS = [
  "Institutional Grant ($50k - $200k)",
  "Federal Research Grant ($200k - $1M)",
  "Venture/Commercial Tier ($1M+)",
  "Phase-specific allocation",
];

const ITERATION_CONFIG = [
  { id: "hitfinding", name: "Hit Finding", icon: "search_insights" },
  { id: "leadoptimization", name: "Lead Optimization", icon: "biotech" },
];

function normalizeId(id: string) {
  return id.toLowerCase().replace(/[^a-z]/g, "");
}

// ── Form state ────────────────────────────────────────────────────────────────

type DiscoveryFormState = {
  target: string;
  approach: string;
  currentCompounds: string;
  moleculeList: string;
  optimizationGoals: string[];
  timeline: string;
  budget: string;
};

const DEFAULT_FORM: DiscoveryFormState = {
  target: "",
  approach: "",
  currentCompounds: "",
  moleculeList: "",
  optimizationGoals: ["Improve binding affinity", "Improve selectivity"],
  timeline: TIMELINE_OPTIONS[0],
  budget: BUDGET_OPTIONS[0],
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DiscoverySpacePage() {
  const [view, setView] = useState<"form" | "roadmap">("form");
  const [form, setForm] = useState<DiscoveryFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<DiscoveryRoadmap | null>(null);
  const [selectedIterationId, setSelectedIterationId] = useState("hitfinding");
  const [allResearchers, setAllResearchers] = useState<ResearcherMini[]>([]);

  useEffect(() => {
    if (view !== "roadmap") return;
    fetchPublicResearchers().then(setAllResearchers);
  }, [view]);

  function toggleGoal(label: string) {
    setForm((prev) => ({
      ...prev,
      optimizationGoals: prev.optimizationGoals.includes(label)
        ? prev.optimizationGoals.filter((g) => g !== label)
        : [...prev.optimizationGoals, label],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.target.trim() || !form.approach) {
      setError("Please describe your target and select a discovery approach.");
      return;
    }
    if (form.approach === "hits" && !form.moleculeList.trim()) {
      setError("Please list your candidate molecules when using existing hit compounds.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ space: "discovery", ...form, molecule_list: form.moleculeList }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate roadmap. Please try again.");
        return;
      }
      setRoadmap(data as DiscoveryRoadmap);
      setSelectedIterationId("hitfinding");
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
    await downloadDiscoveryRoadmapPDF(roadmap);
  }

  // ── Roadmap view ─────────────────────────────────────────────────────────

  if (view === "roadmap" && roadmap) {
    const activeIteration =
      roadmap.iterations.find((it) => normalizeId(it.id) === selectedIterationId) ??
      roadmap.iterations[0];
    const matchedResearchers = activeIteration
      ? matchResearchers(allResearchers, [
          activeIteration.name,
          ...(activeIteration.tools_and_software ?? []).map((t) => t.name),
        ])
      : [];

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <RoadmapTopBar
          title={roadmap.title}
          summary={roadmap.summary}
          badgeLabel="Discovery Space"
          badgeClassName="bg-[#0d9488]/10 text-[#0d9488]"
          onStartOver={handleStartOver}
          onDownloadPDF={handleDownloadPDF}
        />
        <main className="flex-grow max-w-[1280px] mx-auto w-full px-4 sm:px-margin py-lg">
          {/* Prioritized Molecules */}
          {roadmap.prioritized_molecules?.length > 0 && (
            <div className="mb-gutter bg-surface-container-lowest rounded-xl border border-outline-variant p-md">
              <h2 className="font-label-sm text-label-sm text-outline uppercase tracking-widest mb-4">
                Prioritized Molecules
              </h2>
              <ol className="space-y-3">
                {roadmap.prioritized_molecules
                  .slice()
                  .sort((a, b) => a.priority_rank - b.priority_rank)
                  .map((mol) => (
                    <li key={mol.id} className="flex gap-4 items-start">
                      <span className="w-7 h-7 rounded-full bg-[#0d9488] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {mol.priority_rank}
                      </span>
                      <div>
                        <span className="font-bold text-on-surface text-sm">{mol.id}</span>
                        <p className="text-on-surface-variant text-sm mt-0.5 leading-relaxed">
                          {mol.reasoning}
                        </p>
                      </div>
                    </li>
                  ))}
              </ol>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            {/* LEFT PANEL: Vertical Timeline */}
            <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-outline-variant p-lg sm:p-xl">
              {/* Entry points */}
              {roadmap.entry_points?.length > 0 && (
                <div className="mb-8">
                  <p className="text-label-sm font-label-sm text-outline uppercase tracking-widest mb-3">
                    Entry Points
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {roadmap.entry_points.map((ep) => (
                      <span
                        key={ep}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-label-sm font-label-sm"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0d9488] shrink-0" />
                        {ep}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="relative">
                <div className="absolute left-4 sm:left-5 top-2 bottom-2 w-0.5 bg-outline-variant" />
                <div className="space-y-8">
                  {roadmap.iterations.map((iter, idx) => {
                    const isActive = normalizeId(iter.id) === selectedIterationId;
                    const config = ITERATION_CONFIG.find(
                      (c) => c.id === normalizeId(iter.id)
                    );
                    return (
                      <div key={iter.id} className="relative pl-12 sm:pl-14">
                        <div
                          className={`absolute left-0 top-1 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center z-10 transition-all ${
                            isActive
                              ? "bg-[#0d9488] border-2 border-[#0d9488] text-white shadow-md ring-4 ring-[#0d9488]/15"
                              : "bg-white border-2 border-outline-variant text-on-surface-variant"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px] sm:text-[20px]">
                            {config?.icon ?? "circle"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedIterationId(normalizeId(iter.id))}
                          className={`w-full text-left bg-white rounded-xl p-lg transition-all ${
                            isActive
                              ? "border-2 border-[#0d9488] shadow-md ring-4 ring-[#0d9488]/10"
                              : "border border-outline-variant shadow-sm hover:border-[#0d9488]/50 hover:shadow-md"
                          }`}
                        >
                          <h3
                            className={`font-headline-md text-headline-md mb-2 ${
                              isActive ? "text-[#0d9488]" : "text-on-surface"
                            }`}
                          >
                            {idx + 1}. {iter.name}
                          </h3>
                          <p className="text-on-surface-variant text-sm leading-relaxed mb-3">
                            {iter.description}
                          </p>
                          {((iter.tools_and_software?.length ?? 0) > 0 ||
                            (iter.cro_partners?.length ?? 0) > 0) && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-3 border-t border-outline-variant">
                              {(iter.tools_and_software?.length ?? 0) > 0 && (
                                <span className="flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant">
                                  <span className="material-symbols-outlined text-[16px]">science</span>
                                  {iter.tools_and_software.length} tool
                                  {iter.tools_and_software.length === 1 ? "" : "s"}
                                </span>
                              )}
                              {(iter.cro_partners?.length ?? 0) > 0 && (
                                <span className="flex items-center gap-1 text-label-sm font-label-sm text-on-surface-variant">
                                  <span className="material-symbols-outlined text-[16px]">domain</span>
                                  {iter.cro_partners.length} CRO partner
                                  {iter.cro_partners.length === 1 ? "" : "s"}
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      </div>
                    );
                  })}

                  {/* Iteration loop marker */}
                  <div className="relative pl-12 sm:pl-14 flex items-center gap-2 text-on-surface-variant italic text-sm">
                    <span className="material-symbols-outlined text-[18px]">sync</span>
                    Iterate until candidate found
                  </div>

                  {/* End node */}
                  <div className="relative pl-12 sm:pl-14">
                    <div className="absolute left-0 top-1 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary border-2 border-primary text-on-primary flex items-center justify-center z-10">
                      <span className="material-symbols-outlined text-[18px] sm:text-[20px]">check_circle</span>
                    </div>
                    <div className="bg-primary text-on-primary rounded-xl p-lg flex items-center gap-2">
                      <span className="font-headline-md text-headline-md">Synthesis-Ready Candidate</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Details */}
            <div className="lg:col-span-5 flex flex-col gap-gutter">
              <div className="bg-surface-container-high rounded-xl p-md border border-outline-variant flex-grow">
                {activeIteration && (
                  <>
                    <h2 className="font-headline-md text-headline-md text-primary mb-2">
                      {activeIteration.name}
                    </h2>
                    <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                      {activeIteration.description}
                    </p>
                    <div className="space-y-gutter">
                      {activeIteration.tools_and_software?.length > 0 && (
                        <ProvidersList
                          providers={activeIteration.tools_and_software}
                          title="Research Tools & Software"
                        />
                      )}
                      <CROPartnersList partners={activeIteration.cro_partners ?? []} />
                      <ResearchersWhoCanHelp researchers={matchedResearchers} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Academic context bento grid */}
          <div className="mt-xl grid grid-cols-1 md:grid-cols-3 gap-gutter">
            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
              <h4 className="font-bold text-primary mb-2">Ethics &amp; Compliance</h4>
              <p className="text-sm text-on-surface-variant">
                Integrated Institutional Review Board (IRB) tracking for all discovery phases.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
              <h4 className="font-bold text-primary mb-2">IP Protection</h4>
              <p className="text-sm text-on-surface-variant">
                Secure logging of molecular structures and optimization steps for patent filings.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow">
              <h4 className="font-bold text-primary mb-2">Collaborative Hub</h4>
              <p className="text-sm text-on-surface-variant">
                Invite external PIs or industry advisors to review iterative progress live.
              </p>
            </div>
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
        <nav className="flex items-center gap-2 mb-6 text-on-surface-variant font-label-sm text-sm">
          <Link href="/navigator" className="hover:text-primary transition-colors">
            Navigator
          </Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-primary font-bold">Discovery Space</span>
        </nav>

        <header className="mb-lg text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0d9488] text-white rounded-full mb-4">
            <span className="material-symbols-outlined text-sm">science</span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider">Discovery Space</span>
          </div>
          <h1 className="text-display-lg-mobile md:text-display-lg font-bold text-primary mb-2 leading-tight">
            Configure Your Discovery Space Roadmap
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-2xl mx-auto md:mx-0">
            Select your approach and define your chemical goals for AI-guided compound
            optimization. This configuration phase aligns computational resources with your
            laboratory&apos;s capabilities.
          </p>
        </header>

        {/* Strategic tip callout */}
        <div className="mb-lg bg-primary-container/10 border border-primary-container/30 p-md rounded-xl flex items-start gap-4">
          <div className="bg-primary-container text-on-primary-container p-2 rounded-lg shrink-0">
            <span className="material-symbols-outlined">lightbulb</span>
          </div>
          <div>
            <h3 className="font-bold text-primary-container mb-1">Strategic Tip</h3>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Defining precise optimization goals such as &quot;BBB penetration&quot; or
              &quot;solubility&quot; allows our AI models to prioritize scaffolds with relevant
              pharmacokinetic profiles early in the generative process.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-container-lowest p-md md:p-lg rounded-xl border border-outline-variant shadow-[0px_4px_20px_rgba(0,0,0,0.05)] space-y-gutter"
        >
          {/* Target */}
          <div className="space-y-2">
            <label className="font-bold text-on-surface flex items-center gap-2" htmlFor="target">
              <span className="material-symbols-outlined text-[#0d9488]">dns</span>
              What validated target are you working with?
            </label>
            <textarea
              id="target"
              value={form.target}
              onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))}
              required
              className="w-full bg-surface border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-body-md placeholder:text-outline resize-none"
              placeholder="e.g., Human CDK9, Serine Protease inhibitor binding pocket..."
              rows={3}
            />
          </div>

          {/* Approach (single-select) */}
          <div className="space-y-3">
            <label className="font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0d9488]">science</span>
              Discovery approach
            </label>
            <div className="flex flex-wrap gap-2">
              {APPROACH_OPTIONS.map((opt) => {
                const active = form.approach === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`px-4 py-2 border rounded-full font-label-sm text-label-sm cursor-pointer transition-all ${
                      active
                        ? "bg-[#0d9488] text-white border-[#0d9488]"
                        : "border-outline-variant hover:border-[#0d9488] text-on-surface-variant"
                    }`}
                  >
                    <input
                      type="radio"
                      name="approach"
                      value={opt.value}
                      checked={active}
                      onChange={(e) => setForm((p) => ({ ...p, approach: e.target.value }))}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Conditional: current compounds */}
          {form.approach === "hits" && (
            <div className="space-y-2">
              <label className="font-bold text-on-surface" htmlFor="current_compounds">
                Describe your current compounds
              </label>
              <textarea
                id="current_compounds"
                value={form.currentCompounds}
                onChange={(e) => setForm((p) => ({ ...p, currentCompounds: e.target.value }))}
                className="w-full bg-surface border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-body-md placeholder:text-outline resize-none"
                placeholder="Paste SMILES strings or describe structural classes..."
                rows={3}
              />
            </div>
          )}

          {/* Molecule list */}
          <div className="space-y-2">
            <label className="font-bold text-on-surface" htmlFor="molecule_list">
              List your candidate molecules
              {form.approach !== "hits" && (
                <span className="ml-2 text-xs font-normal text-on-surface-variant">(Optional)</span>
              )}
            </label>
            <textarea
              id="molecule_list"
              value={form.moleculeList}
              onChange={(e) => setForm((p) => ({ ...p, moleculeList: e.target.value }))}
              required={form.approach === "hits"}
              className="w-full bg-surface border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-body-md placeholder:text-outline font-mono text-sm resize-none"
              placeholder={`List each molecule with known properties, one per line. Example:\nMol-001: IC50 5μM, MW 320, binding score 8.2\nMol-002: IC50 12μM, MW 290, binding score 6.5`}
              rows={4}
            />
          </div>

          {/* Optimization goals (multi-select) */}
          <div className="space-y-3">
            <label className="font-bold text-on-surface">Key optimization goals</label>
            <div className="flex flex-wrap gap-2">
              {OPTIMIZATION_GOAL_OPTIONS.map((goal) => {
                const active = form.optimizationGoals.includes(goal);
                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => toggleGoal(goal)}
                    className={`flex items-center gap-1 px-3 py-1.5 border rounded-lg font-label-sm text-label-sm transition-all ${
                      active
                        ? "bg-[#0d9488]/10 text-[#0d9488] border-[#0d9488]"
                        : "border-outline-variant hover:border-[#0d9488] text-on-surface-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{active ? "check" : "add"}</span>
                    {goal}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeline / Budget */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <div className="space-y-2">
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide" htmlFor="timeline">
                Timeline
              </label>
              <select
                id="timeline"
                value={form.timeline}
                onChange={(e) => setForm((p) => ({ ...p, timeline: e.target.value }))}
                className="w-full bg-surface border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer text-body-md"
              >
                {TIMELINE_OPTIONS.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide" htmlFor="budget">
                Budget Range
              </label>
              <select
                id="budget"
                value={form.budget}
                onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))}
                className="w-full bg-surface border border-outline-variant rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all appearance-none cursor-pointer text-body-md"
              >
                {BUDGET_OPTIONS.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Action bar */}
          <div className="pt-6 border-t border-outline-variant flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-2 text-center md:text-left">
              <span className="material-symbols-outlined text-[#0d9488] text-lg">verified_user</span>
              Data encryption and research privacy protocols active.
            </div>
            <div className="flex flex-col items-stretch md:items-end gap-2 w-full md:w-auto">
              {error && <p className="text-error text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto bg-[#0d9488] text-white font-label-sm text-label-sm px-8 py-3.5 rounded-lg shadow-md hover:bg-[#0f766e] transition-all flex items-center justify-center gap-2 disabled:opacity-60 group"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Processing Roadmap...
                  </>
                ) : (
                  <>
                    Generate Discovery Roadmap
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                      rocket_launch
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
          <p className="text-center text-on-surface-variant text-sm">
            By generating, you agree to UAB&apos;s data privacy and ethical research frameworks.
          </p>
        </form>
      </main>
      <Footer />
    </div>
  );
}
