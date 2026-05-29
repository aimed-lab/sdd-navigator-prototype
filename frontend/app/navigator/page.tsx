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

// ── Pin positions in the 900×200 SVG coordinate space ────────────────────────
// Road runs from x=80 to x=820 at y=100. 5 pins evenly spaced.
const PIN_X = [80, 265, 450, 635, 820] as const;
// Duration badges sit between adjacent pins ON the road
const BADGE_X = [172, 357, 542, 727] as const;
const ROAD_Y = 100;

export default function NavigatorPage() {
  const [view, setView] = useState<"form" | "roadmap">("form");
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [selectedStage, setSelectedStage] = useState(3);
  // Fade animation when switching stages
  const [panelVisible, setPanelVisible] = useState(true);

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

  function selectStage(id: number) {
    if (id === selectedStage) return;
    setPanelVisible(false);
    setTimeout(() => {
      setSelectedStage(id);
      setPanelVisible(true);
    }, 140);
  }

  const activeStage = STAGES[selectedStage - 1];

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col">
        {/* ── Form State ─────────────────────────────────────────── */}
        {view === "form" && (
          <div className="max-w-[1280px] mx-auto px-4 sm:px-gutter py-6 md:py-lg w-full">
            <div className="mb-8 md:mb-10 text-center">
              <h2 className="font-headline-md text-headline-md text-primary mb-2">
                Configure Your Research Roadmap
              </h2>
              <p className="text-on-surface-variant font-body-md text-body-md">
                Fill in your asset details to generate an optimized development timeline.
              </p>
            </div>

            <div className="bg-white p-5 md:p-lg rounded-xl shadow-md border border-outline-variant max-w-3xl mx-auto">
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
          <div className="flex-1 flex flex-col">
            {/* Top bar */}
            <div className="bg-white border-b border-outline-variant px-4 sm:px-gutter py-3 md:py-4 shrink-0">
              <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex flex-col gap-1">
                  <h2 className="font-bold text-lg md:text-2xl text-uab-deep-green">Your Research Roadmap</h2>
                  <div className="flex items-center gap-2 text-on-surface-variant font-medium text-sm flex-wrap">
                    <span>{form.assetType}</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    <span className="text-uab-green">{form.goal}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setView("form")}
                    className="text-on-surface-variant text-sm font-medium hover:text-uab-green transition-colors"
                  >
                    Start Over
                  </button>
                  <button className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] border-2 border-uab-green text-uab-green font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-uab-green hover:text-white transition-all text-sm">
                    <span className="material-symbols-outlined text-lg">download</span>
                    Download PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Map + Panel: column on mobile, row on md+ */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

              {/* ── Map panel ─────────────────────────────────────── */}
              <div className="flex-1 bg-map-bg relative flex flex-col border-b md:border-b-0 md:border-r border-outline-variant">
                {/* Dot-grid background */}
                <div className="absolute inset-0 map-grid opacity-40 pointer-events-none" />

                {/*
                  SVG map — single coordinate space so road, pins, badges and labels
                  all align perfectly. Fixed 900×200px, wrapper scrolls horizontally
                  on narrow screens (min-width: 560px prevents pins from overlapping).
                */}
                <div className="flex-1 overflow-x-auto flex items-center justify-center py-4 relative z-10">
                  <svg
                    width="900"
                    height="200"
                    viewBox="0 0 900 200"
                    style={{ minWidth: "560px", display: "block" }}
                    aria-label="Research roadmap"
                  >
                    {/* ── Road ── */}
                    {/* End caps */}
                    <circle cx={PIN_X[0]}  cy={ROAD_Y} r={6} fill="#1E6B52" />
                    <circle cx={PIN_X[4]} cy={ROAD_Y} r={6} fill="#1E6B52" />
                    {/* Road line — sits behind pins */}
                    <line
                      x1={PIN_X[0]} y1={ROAD_Y}
                      x2={PIN_X[4]} y2={ROAD_Y}
                      stroke="#1E6B52"
                      strokeWidth={8}
                      strokeLinecap="round"
                    />

                    {/* ── Duration badges ON the road ── */}
                    {STAGES.slice(0, -1).map((stage, i) => (
                      <g key={`badge-${i}`} pointerEvents="none">
                        <rect
                          x={BADGE_X[i] - 22}
                          y={ROAD_Y - 9}
                          width={44}
                          height={18}
                          rx={4}
                          fill="#144B39"
                        />
                        <text
                          x={BADGE_X[i]}
                          y={ROAD_Y + 1}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize={9}
                          fontWeight="700"
                          fontFamily="Inter, sans-serif"
                        >
                          {stage.duration}
                        </text>
                      </g>
                    ))}

                    {/* ── Pins ── */}
                    {STAGES.map((stage, i) => {
                      const x = PIN_X[i];
                      const isSelected = selectedStage === stage.id;
                      const r = isSelected ? 26 : 20;
                      const fill = isSelected ? "#FFD602" : "#1E6B52";
                      const numColor = isSelected ? "#144B39" : "#ffffff";

                      return (
                        <g
                          key={stage.id}
                          onClick={() => selectStage(stage.id)}
                          style={{ cursor: "pointer" }}
                          role="button"
                          aria-label={`Stage ${stage.id}: ${stage.label}`}
                        >
                          {/* Touch-friendly invisible hit area (≥44px) */}
                          <rect
                            x={x - 26}
                            y={ROAD_Y - 44}
                            width={52}
                            height={68}
                            fill="transparent"
                          />

                          {/* Outer glow ring when selected */}
                          {isSelected && (
                            <circle
                              cx={x}
                              cy={ROAD_Y}
                              r={r + 7}
                              fill="none"
                              stroke="#FFD602"
                              strokeWidth={2}
                              opacity={0.35}
                            />
                          )}

                          {/* Pin circle */}
                          <circle
                            cx={x}
                            cy={ROAD_Y}
                            r={r}
                            fill={fill}
                            style={{
                              filter: `drop-shadow(0 0 ${isSelected ? 10 : 4}px ${fill}99)`,
                              transition: "r 0.25s ease, fill 0.25s ease, filter 0.25s ease",
                            }}
                          />

                          {/* Stage number — centered in circle */}
                          <text
                            x={x}
                            y={ROAD_Y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={numColor}
                            fontSize={isSelected ? 14 : 12}
                            fontWeight="700"
                            fontFamily="Inter, sans-serif"
                            style={{ transition: "fill 0.25s ease, font-size 0.25s ease" }}
                            pointerEvents="none"
                          >
                            {stage.id}
                          </text>

                          {/* Stage label — below road, min 11px */}
                          <text
                            x={x}
                            y={ROAD_Y + 44}
                            textAnchor="middle"
                            dominantBaseline="auto"
                            fill={isSelected ? "#144B39" : "#3f4944"}
                            fontSize={11}
                            fontWeight={isSelected ? "700" : "500"}
                            fontFamily="Inter, sans-serif"
                            pointerEvents="none"
                          >
                            {stage.label}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Stage chips — horizontally scrollable, ≥44px touch targets */}
                <div className="bg-white border-t border-outline-variant px-3 py-2 shrink-0 relative z-10">
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
                    {STAGES.map((stage) => (
                      <button
                        key={stage.id}
                        onClick={() => selectStage(stage.id)}
                        className={`flex items-center gap-1 px-3 py-2 min-h-[44px] rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                          selectedStage === stage.id
                            ? "bg-uab-green text-white shadow-md"
                            : "border border-outline-variant text-on-surface-variant hover:bg-surface-container"
                        }`}
                      >
                        <span>{stage.id}</span>
                        <span className="opacity-60">·</span>
                        <span>{stage.label}</span>
                        <span className="opacity-60">·</span>
                        <span>{stage.duration}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Detail panel ──────────────────────────────────── */}
              {/* Full width below map on mobile; fixed 320px column on desktop */}
              <div className="w-full md:w-80 bg-white overflow-y-auto flex flex-col shrink-0 max-h-[48vh] md:max-h-none">
                {/* Stage header — animated colour change */}
                <div
                  className="p-5 md:p-6 text-white shrink-0"
                  style={{
                    background: "#1E6B52",
                    transition: "background 0.25s ease",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                      style={{ background: "rgba(255,255,255,0.2)" }}
                    >
                      {activeStage.id}
                    </span>
                    <span className="font-label-sm text-label-sm uppercase tracking-widest opacity-75">
                      {activeStage.duration}
                    </span>
                  </div>
                  <h3 className="font-bold text-base md:text-lg leading-snug">
                    {activeStage.title}
                  </h3>
                </div>

                {/* Panel body — fades when switching stages */}
                <div
                  className="p-5 md:p-6 flex-1 space-y-5 md:space-y-6"
                  style={{
                    opacity: panelVisible ? 1 : 0,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  <p className="text-on-surface-variant text-sm md:font-body-md md:text-body-md leading-relaxed">
                    {activeStage.desc}
                  </p>

                  <div>
                    <h4 className="font-label-sm text-label-sm text-outline mb-3 uppercase">
                      Recommended Providers
                    </h4>
                    <div className="space-y-2 md:space-y-3">
                      {activeStage.providers.map((provider) => (
                        <div
                          key={provider}
                          className="p-3 border border-outline-variant rounded-lg flex items-center justify-between hover:bg-surface-container-low transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-primary text-sm">biotech</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-on-surface text-sm truncate">{provider}</p>
                              <span className="text-[10px] uppercase font-bold text-outline">
                                Institutional Partner
                              </span>
                            </div>
                          </div>
                          <button className="text-primary font-bold text-xs hover:underline shrink-0 ml-2 min-h-[44px] px-2">
                            Connect
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-outline-variant pt-4">
                    <p className="font-label-sm text-label-sm text-outline uppercase mb-2">
                      Stage Resources
                    </p>
                    {["Regulatory Guidance", "Protocol Templates", "Funding Database"].map((r) => (
                      <div
                        key={r}
                        className="flex items-center justify-between py-2 min-h-[44px] border-b border-outline-variant/40 last:border-0"
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
