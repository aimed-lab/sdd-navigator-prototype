"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";

const loadingPhrases = [
  "Parsing Regulatory Graph",
  "Analyzing Clinical Dependencies",
  "Calculating Regional Tax Credits",
  "Optimizing Recruitment Timelines",
  "Synthesizing Strategic Milestones",
  "Finalizing Roadmap Clusters",
];

const stages = [
  {
    id: "A",
    icon: "biotech",
    name: "Identification",
    duration: "3 months",
    desc: "Initial screening of molecular targets and computational modeling.",
    tools: ["BioCompute X", "GeneMap Pro"],
    warning: { icon: "warning", label: "Data Silo Risk", color: "error" },
  },
  {
    id: "B",
    icon: "science",
    name: "Lead Optimization",
    duration: "6 months",
    desc: "Refining lead compounds for maximum potency and safety profiles.",
    tools: ["ADMET Predictor", "SwissADME"],
    warning: { icon: "bolt", label: "AI Acceleration Active", color: "primary" },
    active: true,
  },
  {
    id: "C",
    icon: "labs",
    name: "Preclinical Validation",
    duration: "12 months",
    desc: "In vivo testing and toxicity evaluation across biological models.",
    tools: [],
    warning: { icon: "lock", label: "Locked by Stage B", color: "outline" },
    locked: true,
  },
  {
    id: "D",
    icon: "description",
    name: "Regulatory Filing",
    duration: "18 months",
    desc: "Preparation and submission of IND/CTA regulatory documentation.",
    tools: [],
    warning: { icon: "lock", label: "Locked by Stage C", color: "outline" },
    locked: true,
  },
  {
    id: "E",
    icon: "rocket_launch",
    name: "Launch",
    duration: "24 months",
    desc: "Market authorization, commercialization, and post-market surveillance.",
    tools: [],
    warning: { icon: "lock", label: "Locked by Stage D", color: "outline" },
    locked: true,
  },
];

const formSteps = [
  {
    num: 1,
    label: "What do you have?",
    selectPlaceholder: "Select Research Asset Type",
    selectOptions: [
      "Protein Target",
      "Gene/Genomic Data",
      "Small Molecule Hit",
      "Dataset/Biomarker",
      "Cell Line",
      "Animal Model",
      "Other",
    ],
    textarea: true,
    textareaPlaceholder: "Describe your research asset in detail...",
  },
  {
    num: 2,
    label: "What do you want to achieve?",
    selectPlaceholder: "Select Primary Goal",
    selectOptions: [
      "Hit Identification",
      "Lead Optimization",
      "IND Filing",
      "Clinical Trial Design",
      "Publication/Patent",
      "Biomarker Validation",
    ],
  },
  {
    num: 3,
    label: "Timeline",
    selectPlaceholder: "Select Anticipated Duration",
    selectOptions: ["6 months", "12 months", "24 months", "36 months+"],
  },
  {
    num: 4,
    label: "Budget Range",
    selectPlaceholder: "Select Funding Level",
    selectOptions: [
      "Academic/No Budget",
      "Under $50k",
      "$50k–$200k",
      "$200k+",
    ],
  },
];

export default function NavigatorPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Auth guard — redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const [showRoadmap, setShowRoadmap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(loadingPhrases[0]);

  // Show spinner while auth resolves
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      if (idx < loadingPhrases.length) {
        setLoadingText(loadingPhrases[idx]);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setLoading(false);
          setShowRoadmap(true);
        }, 800);
      }
    }, 700);
  }

  return (
    <div className="bg-background min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pb-stack-lg min-h-screen">
        <div className="max-w-4xl mx-auto px-margin-mobile md:px-0 py-stack-lg">
          {/* Breadcrumbs */}
          <div className="mb-stack-md flex items-center gap-2 text-outline font-label-md text-label-md">
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span>Home</span>
            <span className="material-symbols-outlined text-[16px]">
              chevron_right
            </span>
            <span className="text-primary font-semibold">Navigator Tool</span>
          </div>

          {!showRoadmap ? (
            /* ── FORM VIEW ─────────────────────────────────── */
            <>
              {/* Page header */}
              <header className="mb-stack-lg border-b border-outline-variant pb-stack-md">
                <h1 className="font-headline-lg text-headline-lg text-primary mb-2">
                  Research Roadmap Generator
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant max-w-3xl">
                  Provide your project details to generate a strategic path from
                  discovery to application.
                </p>
              </header>

              {/* Form container */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-10 shadow-sm relative">
                <form className="space-y-10" onSubmit={handleSubmit}>
                  {formSteps.map((step) => (
                    <div key={step.num} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="step-badge">{step.num}</span>
                        <h3 className="font-title-md text-title-md text-primary uppercase tracking-wide">
                          {step.label}
                        </h3>
                      </div>
                      <div className="pl-10 space-y-4">
                        {/* Select */}
                        <div className="relative">
                          <select
                            defaultValue=""
                            className="w-full bg-surface border border-outline-variant rounded-lg p-3 font-body-md text-body-md appearance-none cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                          >
                            <option disabled value="">
                              {step.selectPlaceholder}
                            </option>
                            {step.selectOptions.map((opt) => (
                              <option key={opt}>{opt}</option>
                            ))}
                          </select>
                          <span className="material-symbols-outlined absolute right-3 top-3.5 pointer-events-none text-outline">
                            expand_more
                          </span>
                        </div>

                        {/* Optional textarea for step 1 */}
                        {step.textarea && (
                          <textarea
                            className="w-full bg-surface border border-outline-variant rounded-lg p-3 font-body-md text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-outline/50 resize-y min-h-[120px]"
                            placeholder={step.textareaPlaceholder}
                          />
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Submit */}
                  <div className="pt-6">
                    <button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary-container text-on-primary font-title-md text-title-md py-4 rounded-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-md"
                    >
                      <span className="material-symbols-outlined">
                        rocket_launch
                      </span>
                      Generate My Roadmap
                    </button>
                    <p className="text-center font-body-sm text-body-sm text-outline mt-6 italic">
                      Your roadmap will be generated based on current NIH &amp;
                      institutional guidelines.
                    </p>
                  </div>
                </form>

                {/* Loading overlay */}
                {loading && (
                  <div className="absolute inset-0 z-20 bg-background/90 rounded-xl flex flex-col items-center justify-center text-center p-6">
                    <div className="relative mb-8">
                      <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-3xl animate-pulse">
                          hub
                        </span>
                      </div>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-primary mb-2">
                      Synthesizing Pathways...
                    </h3>
                    <div className="w-64 h-1 bg-outline-variant rounded-full overflow-hidden">
                      <div className="h-full bg-primary loading-shimmer w-full" />
                    </div>
                    <p className="font-label-md text-label-md text-on-surface-variant mt-4 uppercase tracking-widest">
                      {loadingText}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ── ROADMAP VIEW ──────────────────────────────── */
            <>
              {/* Header */}
              <header className="mb-stack-lg border-b border-outline-variant pb-stack-md">
                <h1 className="font-headline-lg text-headline-lg text-primary mb-2">
                  Strategic Development Roadmap
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Your personalized path from asset to clinical outcome.
                </p>
                <button
                  onClick={() => setShowRoadmap(false)}
                  className="mt-4 flex items-center gap-2 text-primary font-label-md text-label-md border border-primary/30 px-4 py-2 rounded-lg hover:bg-primary/5 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">
                    arrow_back
                  </span>
                  Modify Parameters
                </button>
              </header>

              {/* Route visualization */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 mb-stack-lg shadow-sm overflow-x-auto">
                <svg className="w-full min-w-[600px]" viewBox="0 0 900 120">
                  {/* Dashed path */}
                  <path
                    d="M 80 60 L 810 60"
                    fill="none"
                    stroke="#bfc9c2"
                    strokeWidth="2"
                    strokeDasharray="6 4"
                  />
                  {/* Completed segment */}
                  <path
                    d="M 80 60 L 260 60"
                    fill="none"
                    stroke="#1e6b52"
                    strokeWidth="3"
                  />
                  {/* Active segment */}
                  <path
                    className="animated-path"
                    d="M 260 60 L 440 60"
                    fill="none"
                    stroke="#1e6b52"
                    strokeWidth="3"
                  />

                  {[
                    { cx: 80, label: "A", name: "Identification", done: true },
                    { cx: 260, label: "B", name: "Optimization", active: true },
                    { cx: 440, label: "C", name: "Validation", locked: true },
                    { cx: 620, label: "D", name: "Regulatory", locked: true },
                    { cx: 800, label: "E", name: "Launch", locked: true },
                  ].map((pin) => (
                    <g key={pin.label}>
                      <circle
                        cx={pin.cx}
                        cy={60}
                        r={20}
                        fill={pin.done || pin.active ? "#1e6b52" : "#e7e8e9"}
                        stroke={pin.done || pin.active ? "#00523c" : "#bfc9c2"}
                        strokeWidth={2}
                      />
                      <text
                        x={pin.cx}
                        y={65}
                        textAnchor="middle"
                        fill={pin.done || pin.active ? "#ffffff" : "#6f7974"}
                        style={{ fontFamily: "Inter", fontSize: "13px", fontWeight: "700" }}
                      >
                        {pin.label}
                      </text>
                      <text
                        x={pin.cx}
                        y={95}
                        textAnchor="middle"
                        fill="#3f4944"
                        style={{ fontFamily: "Inter", fontSize: "11px" }}
                      >
                        {pin.name}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>

              {/* Stage cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-gutter mb-stack-lg">
                {stages.map((stage) => (
                  <div
                    key={stage.id}
                    className={`bg-surface-container-lowest border rounded-xl p-4 flex flex-col border-t-4 ${
                      stage.active
                        ? "border-t-primary border-primary/20 shadow-sm"
                        : stage.locked
                        ? "border-t-outline-variant opacity-70"
                        : "border-t-primary"
                    }`}
                  >
                    {/* Stage label */}
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-label-md text-label-md text-on-surface-variant uppercase">
                        Stage {stage.id}
                      </span>
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          stage.active ? "text-primary" : "text-on-surface-variant/40"
                        }`}
                      >
                        {stage.icon}
                      </span>
                    </div>

                    {/* Duration badge */}
                    <span className="inline-block px-2 py-0.5 rounded-sm bg-surface-container font-label-md text-label-md text-on-surface-variant mb-2 self-start">
                      {stage.duration}
                    </span>

                    <h3
                      className={`font-title-md text-title-md mb-2 ${
                        stage.locked ? "text-on-surface-variant" : "text-primary"
                      }`}
                    >
                      {stage.name}
                    </h3>
                    <p className="text-body-sm text-on-surface-variant mb-3 flex-grow">
                      {stage.desc}
                    </p>

                    {/* Tools */}
                    {stage.tools.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {stage.tools.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-sm bg-secondary-container/50 text-on-secondary-container font-label-md text-[10px]"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Warning badge */}
                    <div
                      className={`flex items-center gap-1.5 text-[10px] font-label-md p-2 rounded-sm ${
                        stage.warning.color === "error"
                          ? "text-error bg-error-container/30"
                          : stage.warning.color === "primary"
                          ? "text-primary bg-primary/10"
                          : "text-on-surface-variant bg-surface-container"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {stage.warning.icon}
                      </span>
                      {stage.warning.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Provider card */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
                <div className="lg:col-span-2 academic-card p-stack-md">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-primary">
                      business
                    </span>
                    <h3 className="font-title-lg text-title-lg text-on-surface">
                      Recommended Partner
                    </h3>
                  </div>
                  <div className="flex items-start gap-6">
                    <div className="flex-1">
                      <h4 className="font-headline-md text-headline-md text-primary mb-1">
                        Global Pharma Labs
                      </h4>
                      <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm mb-3">
                        <span className="material-symbols-outlined text-[16px]">
                          location_on
                        </span>
                        Switzerland • Lead Optimization
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Analysis of Phase B data suggests a{" "}
                        <span className="text-primary font-semibold">
                          14% acceleration
                        </span>{" "}
                        possibility by integrating their proprietary synthetic
                        library.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button className="px-6 py-2 bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:bg-primary-container transition-all">
                        Connect
                      </button>
                      <button className="px-6 py-2 border border-primary/30 text-primary font-label-md text-label-md rounded-lg hover:bg-primary/5 transition-all">
                        Learn More
                      </button>
                    </div>
                  </div>
                </div>

                <div className="academic-card p-stack-md">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-primary">
                      psychology
                    </span>
                    <h3 className="font-title-md text-title-md text-on-surface">
                      AI Navigator Insight
                    </h3>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-4">
                    Integrating a specialized CRO at Stage B could reduce time
                    to IND by up to 8 months based on similar asset profiles.
                  </p>
                  <div className="flex justify-between items-center pt-4 border-t border-outline-variant">
                    <span className="font-label-md text-label-md text-on-surface-variant">
                      Confidence
                    </span>
                    <span className="text-primary font-bold">92.4%</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
