"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ── Roadmap data ──────────────────────────────────────────────────────────────

const STAGES = [
  {
    id: 1,
    label: "Validation",
    duration: "3-4 Mo",
    title: "Stage 1: Target Validation",
    desc: "Confirm the biological relevance of your target using existing datasets and preliminary assays.",
    providers: ["UAB Structural Biology Core", "UAB Genomics Core"],
  },
  {
    id: 2,
    label: "Discovery",
    duration: "4-6 Mo",
    title: "Stage 2: Hit Discovery",
    desc: "Screen compound libraries to identify early-stage hits against your validated target.",
    providers: ["UAB High-Throughput Screening", "Southern Research Center"],
  },
  {
    id: 3,
    label: "Optimization",
    duration: "6-9 Mo",
    title: "Stage 3: Lead Optimization",
    desc: "Refine hit compounds to improve potency, selectivity, and pharmacokinetic properties for clinical candidacy.",
    providers: ["UAB High-Throughput Screening", "Southern Research Center"],
    highlight: true,
  },
  {
    id: 4,
    label: "IND Studies",
    duration: "12-18 Mo",
    title: "Stage 4: IND-Enabling Studies",
    desc: "Complete the preclinical safety and toxicology studies required to file an Investigational New Drug application.",
    providers: ["UAB Animal Resources Program", "Charles River Labs"],
  },
  {
    id: 5,
    label: "Clinical I",
    duration: "24+ Mo",
    title: "Stage 5: Phase I Clinical Trial",
    desc: "First-in-human safety studies to establish the safety profile, tolerability, and optimal dose range.",
    providers: ["UAB Cancer Center", "UAB Clinical Research Unit"],
  },
];

// ── Form state ────────────────────────────────────────────────────────────────

type FormData = {
  assetType: string;
  assetDesc: string;
  goal: string;
  goalDesc: string;
  timeline: string;
  budget: string;
};

const DEFAULT_FORM: FormData = {
  assetType: "Protein Target",
  assetDesc: "",
  goal: "IND Filing",
  goalDesc: "",
  timeline: "Standard (24-36 months)",
  budget: "$1M - $5M",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NavigatorPage() {
  const [view, setView] = useState<"form" | "roadmap">("form");
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [selectedStage, setSelectedStage] = useState(3);

  function handleGenerate() {
    if (!form.assetDesc.trim() || !form.goalDesc.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setView("roadmap");
    }, 2000);
  }

  function handleChange(e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  const activeStage = STAGES[selectedStage - 1];

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col">
        {/* ── Form State ─────────────────────────────────────────── */}
        {view === "form" && (
          <div className="max-w-[1280px] mx-auto px-gutter py-lg w-full">
            <div className="mb-10 text-center">
              <h2 className="font-headline-md text-headline-md text-primary mb-2">
                Configure Your Research Roadmap
              </h2>
              <p className="text-on-surface-variant font-body-md text-body-md">
                Fill in your asset details to generate an optimized development timeline.
              </p>
            </div>

            <div className="bg-white p-lg rounded-xl shadow-md border border-outline-variant max-w-3xl mx-auto">
              <form className="space-y-8">
                {/* What do you have */}
                <div className="space-y-4">
                  <label className="block font-semibold text-on-surface">What do you have?</label>
                  <select
                    name="assetType"
                    value={form.assetType}
                    onChange={handleChange}
                    className="w-full p-4 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md"
                  >
                    {["Protein Target", "Gene/Genomic Data", "Small Molecule Hit", "Dataset/Biomarker", "Cell Line", "Animal Model", "Other"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                  <textarea
                    name="assetDesc"
                    value={form.assetDesc}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe your asset's current validation status, available data, and any unique characteristics..."
                    className="w-full p-4 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md resize-none"
                  />
                </div>

                {/* What do you want */}
                <div className="space-y-4">
                  <label className="block font-semibold text-on-surface">What do you want to achieve?</label>
                  <select
                    name="goal"
                    value={form.goal}
                    onChange={handleChange}
                    className="w-full p-4 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md"
                  >
                    {["Hit Identification", "Lead Optimization", "IND Filing", "Clinical Trial Design", "Publication/Patent", "Biomarker Validation"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                  <textarea
                    name="goalDesc"
                    value={form.goalDesc}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Outline your primary objectives and key success metrics for this phase..."
                    className="w-full p-4 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md resize-none"
                  />
                </div>

                {/* Timeline + Budget */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block font-semibold text-on-surface">Timeline</label>
                    <select
                      name="timeline"
                      value={form.timeline}
                      onChange={handleChange}
                      className="w-full p-4 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md"
                    >
                      {["Accelerated (12-18 months)", "Standard (24-36 months)", "Extended (36+ months)"].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block font-semibold text-on-surface">Budget Range</label>
                    <select
                      name="budget"
                      value={form.budget}
                      onChange={handleChange}
                      className="w-full p-4 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md"
                    >
                      {["$500k - $1M", "$1M - $5M", "$5M - $10M", "$10M+"].map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Submit */}
                <div className="pt-6">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={loading || !form.assetDesc.trim() || !form.goalDesc.trim()}
                    className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold text-lg shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? (
                      <>
                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin border-[3px]" />
                        Generating Roadmap…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">map</span>
                        Generate My Roadmap
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Roadmap State ──────────────────────────────────────── */}
        {view === "roadmap" && (
          <div className="flex-1 flex flex-col h-[calc(100vh-80px)]">
            {/* Top bar */}
            <div className="bg-white border-b border-outline-variant px-gutter py-4 shrink-0">
              <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="font-headline-md text-2xl text-uab-deep-green">Your Research Roadmap</h2>
                  <div className="flex items-center gap-2 text-on-surface-variant font-medium text-sm">
                    <span>{form.assetType}</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    <span className="text-uab-green">{form.goal}</span>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => setView("form")}
                    className="text-on-surface-variant text-sm font-medium hover:text-uab-green transition-colors"
                  >
                    Start Over
                  </button>
                  <button className="px-6 py-2.5 border-2 border-uab-green text-uab-green font-bold rounded-lg flex items-center gap-2 hover:bg-uab-green hover:text-white transition-all text-sm">
                    <span className="material-symbols-outlined text-lg">download</span>
                    Download PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Map panel */}
              <div className="flex-1 bg-map-bg relative overflow-hidden flex flex-col border-r border-outline-variant">
                <div className="absolute inset-0 map-grid opacity-50" />

                {/* Zoom controls */}
                <div className="absolute top-6 right-6 z-20 flex flex-col gap-2">
                  <button className="bg-white w-10 h-10 rounded-lg shadow-md border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-all">
                    <span className="material-symbols-outlined">add</span>
                  </button>
                  <button className="bg-white w-10 h-10 rounded-lg shadow-md border border-outline-variant flex items-center justify-center hover:bg-surface-container transition-all">
                    <span className="material-symbols-outlined">remove</span>
                  </button>
                </div>

                {/* Road + Pins */}
                <div className="flex-1 flex items-center justify-center relative p-12">
                  <div className="w-full h-full relative flex items-center justify-center">
                    {/* Road line */}
                    <svg className="absolute w-[90%] h-4 overflow-visible roadmap-path-shadow" preserveAspectRatio="none" viewBox="0 0 1000 20">
                      <circle cx="0" cy="10" fill="#1E6B52" r="8" />
                      <line stroke="#1E6B52" strokeLinecap="round" strokeWidth="12" x1="0" x2="1000" y1="10" y2="10" />
                      <circle cx="1000" cy="10" fill="#1E6B52" r="8" />
                    </svg>

                    {/* Pins */}
                    <div className="absolute w-[90%] inset-0 flex items-center justify-between pointer-events-none">
                      {STAGES.map((stage) => (
                        <div
                          key={stage.id}
                          className="relative flex flex-col items-center pointer-events-auto cursor-pointer"
                          style={{ transform: "translateY(-24px)" }}
                          onClick={() => setSelectedStage(stage.id)}
                        >
                          <div
                            className={`flex flex-col items-center transition-transform hover:-translate-y-1 ${
                              selectedStage === stage.id ? "scale-125 -translate-y-2" : ""
                            }`}
                          >
                            <div className="relative">
                              <span
                                className="material-symbols-outlined text-[48px] pin-shadow"
                                style={{
                                  color: stage.highlight ? "#FFD602" : "#1E6B52",
                                  fontVariationSettings: "'FILL' 1",
                                }}
                              >
                                location_on
                              </span>
                              <span
                                className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-sm"
                                style={{ color: stage.highlight ? "#144B39" : "white" }}
                              >
                                {stage.id}
                              </span>
                            </div>
                            <span
                              className={`mt-1 font-bold text-[10px] uppercase text-uab-deep-green whitespace-nowrap px-2 rounded ${
                                selectedStage === stage.id
                                  ? "bg-white shadow-sm border border-uab-gold"
                                  : "bg-white/80"
                              }`}
                            >
                              {stage.label}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Duration badges */}
                    <div className="absolute w-[90%] h-full pointer-events-none">
                      {STAGES.slice(0, -1).map((stage, i) => (
                        <div
                          key={stage.id}
                          className="absolute"
                          style={{
                            left: `${12.5 + i * 25}%`,
                            top: "50%",
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          <span className="text-[10px] font-bold bg-uab-deep-green text-white px-2 py-0.5 rounded shadow-sm">
                            {stage.duration}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stage chips */}
                <div className="bg-white border-t border-outline-variant p-4 shrink-0">
                  <div className="flex justify-center gap-3 overflow-x-auto py-2">
                    {STAGES.map((stage) => (
                      <button
                        key={stage.id}
                        onClick={() => setSelectedStage(stage.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                          selectedStage === stage.id
                            ? "bg-uab-green text-white shadow-md"
                            : "border border-outline-variant hover:bg-surface-container"
                        }`}
                      >
                        {stage.id} • {stage.label} • {stage.duration}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detail side panel */}
              <div className="w-80 bg-white overflow-y-auto flex flex-col shrink-0">
                {/* Stage header */}
                <div className="bg-uab-green p-6 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
                      {activeStage.id}
                    </span>
                    <span className="font-label-sm text-label-sm uppercase tracking-widest opacity-80">
                      {activeStage.duration}
                    </span>
                  </div>
                  <h3 className="font-headline-md text-headline-md">{activeStage.title}</h3>
                </div>

                <div className="p-6 flex-1 space-y-6">
                  <p className="text-on-surface-variant font-body-md text-body-md">{activeStage.desc}</p>

                  <div>
                    <h4 className="font-label-sm text-label-sm text-outline mb-4 uppercase">
                      Recommended Service Providers
                    </h4>
                    <div className="space-y-3">
                      {activeStage.providers.map((provider) => (
                        <div
                          key={provider}
                          className="p-4 border border-outline-variant rounded-lg flex items-center justify-between hover:bg-surface-container-low transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center">
                              <span className="material-symbols-outlined text-primary">biotech</span>
                            </div>
                            <div>
                              <p className="font-bold text-on-surface text-sm">{provider}</p>
                              <span className="text-[10px] uppercase font-bold text-outline">
                                Institutional Partner
                              </span>
                            </div>
                          </div>
                          <button className="text-primary font-bold text-sm hover:underline">Connect</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-outline-variant">
                    <p className="font-label-sm text-label-sm text-outline uppercase mb-3">Stage Resources</p>
                    {["Regulatory Guidance", "Protocol Templates", "Funding Database"].map((r) => (
                      <div
                        key={r}
                        className="flex items-center justify-between py-2 border-b border-outline-variant/50 last:border-0"
                      >
                        <span className="text-sm text-on-surface">{r}</span>
                        <span className="material-symbols-outlined text-primary text-sm">open_in_new</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {view === "form" && <Footer />}
    </div>
  );
}
