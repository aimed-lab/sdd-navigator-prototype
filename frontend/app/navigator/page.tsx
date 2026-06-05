"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type ResearcherMini = {
  id: string;
  name: string;
  email: string;
  research_focus: string | null;
  interests: string[] | null;
  profile_slug: string | null;
};

type Provider = {
  name: string;
  type: string;
  description: string;
  website: string;
  free: boolean;
};

type Stage = {
  id: number;
  name: string;
  duration: string;
  description: string;
  tools: string[];
  bottleneck: string;
  providers: Provider[];
};

type RoadmapData = {
  title: string;
  summary: string;
  stages: Stage[];
};

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

// ── SVG helpers ───────────────────────────────────────────────────────────────

const SVG_WIDTH = 900;
const SVG_HEIGHT = 200;
const ROAD_Y = 100;
const PADDING = 80;

function pinPositions(count: number): number[] {
  if (count <= 1) return [SVG_WIDTH / 2];
  const usable = SVG_WIDTH - 2 * PADDING;
  return Array.from({ length: count }, (_, i) =>
    Math.round(PADDING + (i / (count - 1)) * usable)
  );
}

function badgePositions(pins: number[]): number[] {
  return pins.slice(0, -1).map((x, i) => Math.round((x + pins[i + 1]) / 2));
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NavigatorPage() {
  const [view, setView] = useState<"form" | "roadmap">("form");
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
  const [selectedStage, setSelectedStage] = useState(1);
  const [panelVisible, setPanelVisible] = useState(true);
  const [allResearchers, setAllResearchers] = useState<ResearcherMini[]>([]);

  // Fetch public researchers once when roadmap is shown
  useEffect(() => {
    if (view !== "roadmap") return;
    supabase
      .from("users")
      .select("id, name, email, research_focus, interests, profile_slug")
      .eq("is_public", true)
      .limit(50)
      .then(({ data }) => setAllResearchers(data ?? []));
  }, [view]);

  async function handleGenerate() {
    if (!form.assetDesc.trim() || !form.goalDesc.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          what_have: form.assetType,
          have_description: form.assetDesc,
          what_want: `${form.goal}: ${form.goalDesc}`,
          timeline: form.timeline,
          budget: form.budget,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate roadmap. Please try again.");
        return;
      }
      setRoadmapData(data as RoadmapData);
      setSelectedStage((data as RoadmapData).stages?.[0]?.id ?? 1);
      setView("roadmap");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>
  ) {
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

  async function handleDownloadPDF() {
    if (!roadmapData) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    const usableW = pageW - 2 * margin;
    let y = margin;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 82, 60);
    doc.text("SDD Navigator — UAB SPARC", margin, y);
    y += 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, y);
    y += 12;

    // Researcher inputs
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("Researcher Inputs", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const inputs = [
      `Starting Point: ${form.assetType} — ${form.assetDesc}`,
      `Goal: ${form.goal} — ${form.goalDesc}`,
      `Timeline: ${form.timeline}`,
      `Budget: ${form.budget}`,
    ];
    for (const line of inputs) {
      const wrapped = doc.splitTextToSize(line, usableW);
      doc.text(wrapped, margin, y);
      y += (wrapped as string[]).length * 5 + 2;
    }
    y += 4;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    // Title + summary
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 82, 60);
    const titleWrapped = doc.splitTextToSize(roadmapData.title, usableW) as string[];
    doc.text(titleWrapped, margin, y);
    y += titleWrapped.length * 7 + 4;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const summaryWrapped = doc.splitTextToSize(roadmapData.summary, usableW) as string[];
    doc.text(summaryWrapped, margin, y);
    y += summaryWrapped.length * 5 + 10;

    // Stages
    for (const stage of roadmapData.stages) {
      if (y > 240) {
        doc.addPage();
        y = margin;
      }

      // Stage heading
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 82, 60);
      doc.text(`Stage ${stage.id}: ${stage.name}  (${stage.duration})`, margin, y);
      y += 6;

      // Description
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      const descWrapped = doc.splitTextToSize(stage.description, usableW) as string[];
      doc.text(descWrapped, margin, y);
      y += descWrapped.length * 5 + 3;

      // Tools
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Tools: ", margin, y);
      doc.setFont("helvetica", "normal");
      const toolsWrapped = doc.splitTextToSize(stage.tools.join(", "), usableW - 16) as string[];
      doc.text(toolsWrapped, margin + 16, y);
      y += toolsWrapped.length * 5 + 3;

      // Bottleneck
      doc.setFont("helvetica", "bold");
      doc.text("Bottleneck: ", margin, y);
      doc.setFont("helvetica", "normal");
      const bnWrapped = doc.splitTextToSize(stage.bottleneck, usableW - 24) as string[];
      doc.text(bnWrapped, margin + 24, y);
      y += bnWrapped.length * 5 + 3;

      // Providers
      doc.setFont("helvetica", "bold");
      doc.text("Providers:", margin, y);
      y += 5;
      for (const p of stage.providers) {
        if (y > 270) {
          doc.addPage();
          y = margin;
        }
        doc.setFont("helvetica", "normal");
        const tag = p.free ? " [FREE]" : "";
        const pLine = `  • ${p.name} (${p.type})${tag} — ${p.website}`;
        const pWrapped = doc.splitTextToSize(pLine, usableW) as string[];
        doc.text(pWrapped, margin, y);
        y += pWrapped.length * 5 + 1;
      }
      y += 7;
    }

    // Footer on every page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        "sdd-navigator-six.vercel.app",
        margin,
        doc.internal.pageSize.getHeight() - 10
      );
    }

    doc.save("sdd-navigator-roadmap.pdf");
  }

  const stages = roadmapData?.stages ?? [];
  const activeStage = stages.find((s) => s.id === selectedStage) ?? stages[0];
  const pins = pinPositions(stages.length);
  const badges = badgePositions(pins);

  function matchedResearchers(stage: Stage | undefined): ResearcherMini[] {
    if (!stage || allResearchers.length === 0) return [];
    const keywords = [stage.name, ...stage.tools]
      .join(" ")
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 3);
    const scored = allResearchers
      .map((r) => {
        const interestStr = (r.interests ?? []).join(" ").toLowerCase();
        const score = keywords.filter((k) => interestStr.includes(k)).length;
        return { r, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);
    // Fall back to first 3 researchers if no keyword match
    return (scored.length > 0 ? scored.map(({ r }) => r) : allResearchers).slice(0, 3);
  }

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col">

        {/* ── Form view ─────────────────────────────────────────── */}
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
                  <label className="block font-semibold text-on-surface">
                    What do you have?
                  </label>
                  <select
                    name="assetType"
                    value={form.assetType}
                    onChange={handleChange}
                    className="w-full p-4 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md"
                  >
                    {[
                      "Protein Target",
                      "Gene/Genomic Data",
                      "Small Molecule Hit",
                      "Dataset/Biomarker",
                      "Cell Line",
                      "Animal Model",
                      "Other",
                    ].map((o) => (
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
                  <label className="block font-semibold text-on-surface">
                    What do you want to achieve?
                  </label>
                  <select
                    name="goal"
                    value={form.goal}
                    onChange={handleChange}
                    className="w-full p-4 rounded-lg border border-outline-variant focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all font-body-md text-body-md"
                  >
                    {[
                      "Hit Identification",
                      "Lead Optimization",
                      "IND Filing",
                      "Clinical Trial Design",
                      "Publication/Patent",
                      "Biomarker Validation",
                    ].map((o) => (
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
                      {[
                        "Accelerated (12-18 months)",
                        "Standard (24-36 months)",
                        "Extended (36+ months)",
                      ].map((o) => (
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

                {/* Error message */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
                    <span className="material-symbols-outlined text-red-500 text-lg shrink-0">error</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit */}
                <div className="pt-6">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={
                      loading ||
                      !form.assetDesc.trim() ||
                      !form.goalDesc.trim()
                    }
                    className="w-full py-4 bg-primary text-on-primary rounded-xl font-bold text-lg shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? (
                      <>
                        <div className="w-6 h-6 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                        Generating…
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

        {/* ── Roadmap view ───────────────────────────────────────── */}
        {view === "roadmap" && roadmapData && (
          <div className="flex-1 flex flex-col">

            {/* Top bar */}
            <div className="bg-white border-b border-outline-variant px-4 sm:px-gutter py-4 shrink-0">
              <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex flex-col gap-1 max-w-2xl">
                  <h2 className="font-bold text-lg md:text-2xl text-primary leading-snug">
                    {roadmapData.title}
                  </h2>
                  <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-2">
                    {roadmapData.summary}
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                  <button
                    onClick={() => setView("form")}
                    className="text-on-surface-variant text-sm font-medium hover:text-primary transition-colors"
                  >
                    ← Start Over
                  </button>
                  <button
                    onClick={handleDownloadPDF}
                    className="flex-1 sm:flex-none px-4 py-2.5 min-h-[44px] border-2 border-primary text-primary font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all text-sm"
                  >
                    <span className="material-symbols-outlined text-lg">download</span>
                    Download PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Map + Panel */}
            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

              {/* ── Map panel ─────────────────────────────────────── */}
              <div className="flex-1 bg-map-bg relative flex flex-col border-b md:border-b-0 md:border-r border-outline-variant">
                <div className="absolute inset-0 map-grid opacity-40 pointer-events-none" />

                <div className="flex-1 overflow-x-auto flex items-center justify-center py-4 relative z-10">
                  <svg
                    width={SVG_WIDTH}
                    height={SVG_HEIGHT}
                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                    style={{ minWidth: "560px", display: "block" }}
                    aria-label="Research roadmap"
                  >
                    {/* End caps + road line */}
                    {pins.length > 0 && (
                      <>
                        <circle cx={pins[0]} cy={ROAD_Y} r={6} fill="#1E6B52" />
                        <circle cx={pins[pins.length - 1]} cy={ROAD_Y} r={6} fill="#1E6B52" />
                      </>
                    )}
                    {pins.length > 1 && (
                      <line
                        x1={pins[0]}
                        y1={ROAD_Y}
                        x2={pins[pins.length - 1]}
                        y2={ROAD_Y}
                        stroke="#1E6B52"
                        strokeWidth={8}
                        strokeLinecap="round"
                      />
                    )}

                    {/* Duration badges between pins */}
                    {badges.map((bx, i) => (
                      <g key={`badge-${i}`} pointerEvents="none">
                        <rect
                          x={bx - 22}
                          y={ROAD_Y - 9}
                          width={44}
                          height={18}
                          rx={4}
                          fill="#144B39"
                        />
                        <text
                          x={bx}
                          y={ROAD_Y + 1}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize={9}
                          fontWeight="700"
                          fontFamily="Inter, sans-serif"
                        >
                          {stages[i]?.duration ?? ""}
                        </text>
                      </g>
                    ))}

                    {/* Stage pins */}
                    {stages.map((stage, i) => {
                      const x = pins[i];
                      const isSelected = selectedStage === stage.id;
                      const r = isSelected ? 26 : 20;
                      const fill = isSelected ? "#FFD602" : "#1E6B52";
                      const numColor = isSelected ? "#144B39" : "#ffffff";
                      const labelText =
                        stage.name.length > 12
                          ? stage.name.slice(0, 11) + "…"
                          : stage.name;

                      return (
                        <g
                          key={stage.id}
                          onClick={() => selectStage(stage.id)}
                          style={{ cursor: "pointer" }}
                          role="button"
                          aria-label={`Stage ${stage.id}: ${stage.name}`}
                        >
                          {/* Touch-friendly hit area */}
                          <rect
                            x={x - 26}
                            y={ROAD_Y - 44}
                            width={52}
                            height={68}
                            fill="transparent"
                          />

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

                          <text
                            x={x}
                            y={ROAD_Y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={numColor}
                            fontSize={isSelected ? 14 : 12}
                            fontWeight="700"
                            fontFamily="Inter, sans-serif"
                            style={{
                              transition: "fill 0.25s ease, font-size 0.25s ease",
                            }}
                            pointerEvents="none"
                          >
                            {stage.id}
                          </text>

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
                            {labelText}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Stage chips */}
                <div className="bg-white border-t border-outline-variant px-3 py-2 shrink-0 relative z-10">
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5">
                    {stages.map((stage) => (
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
                        <span>{stage.name}</span>
                        <span className="opacity-60">·</span>
                        <span>{stage.duration}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Detail panel ──────────────────────────────────── */}
              <div className="w-full md:w-80 bg-white overflow-y-auto flex flex-col shrink-0 max-h-[60vh] md:max-h-none">
                {activeStage && (
                  <>
                    {/* Stage header */}
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
                        {activeStage.name}
                      </h3>
                    </div>

                    {/* Panel body */}
                    <div
                      className="p-5 md:p-6 flex-1 space-y-5 md:space-y-6"
                      style={{
                        opacity: panelVisible ? 1 : 0,
                        transition: "opacity 0.15s ease",
                      }}
                    >
                      <p className="text-on-surface-variant text-sm leading-relaxed">
                        {activeStage.description}
                      </p>

                      {/* Tools */}
                      {activeStage.tools.length > 0 && (
                        <div>
                          <h4 className="font-label-sm text-label-sm text-outline mb-3 uppercase">
                            Tools
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {activeStage.tools.map((tool) => (
                              <span
                                key={tool}
                                className="px-3 py-1 rounded-full text-xs font-bold bg-secondary-container text-primary border border-primary/20"
                              >
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bottleneck */}
                      {activeStage.bottleneck && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                          <span className="material-symbols-outlined text-amber-600 text-lg shrink-0">
                            warning
                          </span>
                          <div>
                            <p className="font-bold text-amber-800 text-xs uppercase mb-1">
                              Bottleneck
                            </p>
                            <p className="text-amber-700 text-sm leading-relaxed">
                              {activeStage.bottleneck}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Service Providers */}
                      {activeStage.providers.length > 0 && (
                        <div>
                          <h4 className="font-label-sm text-label-sm text-outline mb-3 uppercase">
                            Service Providers
                          </h4>
                          <div className="space-y-3">
                            {activeStage.providers.map((provider) => (
                              <div
                                key={provider.name}
                                className="p-3 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
                              >
                                <div className="flex items-start flex-wrap gap-1.5 mb-1.5">
                                  <span className="font-bold text-on-surface text-sm">
                                    {provider.name}
                                  </span>
                                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-surface-container text-on-surface-variant">
                                    {provider.type}
                                  </span>
                                  {provider.free && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-green-100 text-green-700">
                                      FREE
                                    </span>
                                  )}
                                </div>
                                <p className="text-on-surface-variant text-xs mb-2 leading-relaxed">
                                  {provider.description}
                                </p>
                                <button
                                  onClick={() =>
                                    window.open(provider.website, "_blank", "noopener,noreferrer")
                                  }
                                  className="text-primary font-bold text-xs hover:underline"
                                >
                                  Connect →
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Researchers who can help */}
                      {(() => {
                        const matched = matchedResearchers(activeStage);
                        if (matched.length === 0) return null;
                        return (
                          <div>
                            <h4 className="font-label-sm text-label-sm text-outline mb-3 uppercase">
                              Researchers Who Can Help
                            </h4>
                            <div className="space-y-2">
                              {matched.map((r) => {
                                const initials = r.name
                                  .split(" ")
                                  .map((n) => n[0] ?? "")
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2);
                                return (
                                  <div
                                    key={r.id}
                                    className="p-2.5 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors"
                                  >
                                    <div className="flex items-start gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs shrink-0">
                                        {initials}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-bold text-on-surface text-xs leading-tight truncate">
                                          {r.name}
                                        </p>
                                        {r.research_focus && (
                                          <p className="text-[10px] text-on-surface-variant line-clamp-1">
                                            {r.research_focus}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                      {r.profile_slug && (
                                        <Link href={`/researchers/${r.profile_slug}`}>
                                          <button className="text-[10px] font-bold text-primary border border-primary/30 px-2 py-0.5 rounded hover:bg-primary/5 transition-colors">
                                            View
                                          </button>
                                        </Link>
                                      )}
                                      <a href={`mailto:${r.email}`}>
                                        <button className="text-[10px] font-bold text-white bg-primary px-2 py-0.5 rounded hover:opacity-90 transition-opacity">
                                          Connect
                                        </button>
                                      </a>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {view === "form" && <Footer />}
    </div>
  );
}
