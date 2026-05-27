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
    name: "Identification",
    duration: "3 MONTHS",
    desc: "Initial screening of molecular targets and computational modeling.",
    tools: "BioCompute X, GeneMap Pro",
    status: "completed",
    warning: { type: "error", icon: "warning", label: "DATA SILO RISK" },
  },
  {
    id: "B",
    name: "Lead Optimization",
    duration: "6 MONTHS",
    desc: "Refining lead compounds for maximum potency and safety profiles.",
    tools: "ADMET Predictor, SwissADME",
    status: "active",
    warning: {
      type: "pulse",
      icon: "bolt",
      label: "AI ACCELERATION ACTIVE",
    },
  },
  {
    id: "C",
    name: "Preclinical Validation",
    duration: "12 MONTHS",
    desc: "In vivo testing and toxicity evaluation across biological models.",
    tools: "",
    status: "locked",
    warning: { type: "locked", icon: "lock", label: "LOCKED BY STAGE B" },
  },
  {
    id: "D",
    name: "Regulatory Filing",
    duration: "18 MONTHS",
    desc: "Preparation and submission of IND/CTA regulatory documentation.",
    tools: "",
    status: "locked",
    warning: { type: "locked", icon: "lock", label: "LOCKED BY STAGE C" },
  },
  {
    id: "E",
    name: "Launch",
    duration: "24 MONTHS",
    desc: "Market authorization, commercialization, and post-market surveillance.",
    tools: "",
    status: "locked",
    warning: { type: "locked", icon: "lock", label: "LOCKED BY STAGE D" },
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

  // Show nothing while auth resolves or redirecting
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
    <>
      <Navbar />

      <main className="flex-grow pt-32 pb-20 px-4 md:px-16 relative overflow-hidden min-h-screen">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-secondary-container/5 rounded-full blur-[100px] pointer-events-none" />

        {!showRoadmap ? (
          /* ---- NAVIGATOR FORM ---- */
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <span className="w-2 h-2 rounded-full bg-status-pulse relative">
                  <span className="absolute inset-0 rounded-full bg-status-pulse status-pulse-ring" />
                </span>
                <span className="font-data-label text-data-label text-primary tracking-[0.1em] uppercase">
                  Navigator AI Core Engaged
                </span>
              </div>
              <h2 className="font-display-lg text-display-lg text-primary mb-4">
                Design Your Strategic Roadmap
              </h2>
              <p className="font-body-md text-on-surface-variant max-w-2xl mx-auto">
                Input your parameters to synthesize a comprehensive pathway from
                biological asset to clinical outcome. Our graph-based
                intelligence maps regulatory cycles, expertise gaps, and
                regional advantages.
              </p>
            </div>

            <div className="glass-card p-6 md:p-12 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.3)] relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, #fff 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />

              <form
                className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8 relative z-10"
                onSubmit={handleSubmit}
              >
                {[
                  {
                    icon: "inventory_2",
                    label: "Current Assets",
                    options: [
                      "Pre-clinical Compound",
                      "Genomic Dataset",
                      "Phase I Results",
                      "Biomarker Panel",
                      "Orphan Drug Designation",
                    ],
                    placeholder: "What do you have?",
                  },
                  {
                    icon: "rocket_launch",
                    label: "Primary Objective",
                    options: [
                      "IND Filing",
                      "Market Authorization (EMA/FDA)",
                      "Series B Funding Data Pack",
                      "Strategic Partnership",
                      "Bio-equivalence Validation",
                    ],
                    placeholder: "What do you want to achieve?",
                  },
                  {
                    icon: "gavel",
                    label: "Regulatory Framework",
                    options: [
                      "FDA (CBER/CDER)",
                      "EMA (Centralized)",
                      "NMPA (China)",
                      "PMDA (Japan)",
                      "Multi-region Harmonization",
                    ],
                    placeholder: "Select Regulatory Target",
                  },
                  {
                    icon: "payments",
                    label: "Capital Allocation",
                    options: [
                      "$500k - $2M",
                      "$2M - $10M",
                      "$10M - $50M",
                      "$50M+",
                      "Grant-funded / Non-profit",
                    ],
                    placeholder: "Budget Range",
                  },
                  {
                    icon: "schedule",
                    label: "Acceleration Target",
                    options: [
                      "Urgent (< 6 months)",
                      "Standard (12-18 months)",
                      "Strategic (2-3 years)",
                      "Long-range (5+ years)",
                    ],
                    placeholder: "Select Timeline",
                  },
                ].map((field) => (
                  <div key={field.label} className="flex flex-col gap-2">
                    <label className="font-data-label text-data-label text-on-surface-variant uppercase flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px]">
                        {field.icon}
                      </span>
                      {field.label}
                    </label>
                    <div className="relative">
                      <select className="w-full bg-surface-container-low border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 font-body-md text-on-surface appearance-none focus:bg-surface-container-high transition-all outline-none">
                        <option value="" disabled>
                          {field.placeholder}
                        </option>
                        {field.options.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                        expand_more
                      </span>
                    </div>
                  </div>
                ))}

                {/* Region - text input */}
                <div className="flex flex-col gap-2">
                  <label className="font-data-label text-data-label text-on-surface-variant uppercase flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">
                      public
                    </span>
                    Target Region
                  </label>
                  <input
                    type="text"
                    className="w-full bg-surface-container-low border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 font-body-md text-on-surface focus:bg-surface-container-high transition-all outline-none"
                    placeholder="Enter Region (e.g. EU-West, APAC)"
                  />
                </div>

                {/* Expertise - full width */}
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label className="font-data-label text-data-label text-on-surface-variant uppercase flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px]">
                      psychology
                    </span>
                    Current Team Expertise
                  </label>
                  <div className="relative">
                    <select className="w-full bg-surface-container-low border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 font-body-md text-on-surface appearance-none focus:bg-surface-container-high transition-all outline-none">
                      <option value="" disabled>
                        Expertise Level
                      </option>
                      <option>Academic / Early Research</option>
                      <option>Biotech Startup (Lean Team)</option>
                      <option>Mid-market Pharma</option>
                      <option>Enterprise / Global Clinical Operations</option>
                      <option>Specialized CRO Partnership</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Submit */}
                <div className="md:col-span-2 mt-8 flex flex-col items-center gap-6">
                  <button
                    type="submit"
                    className="w-full md:w-auto px-12 py-4 bg-primary text-on-primary font-headline-lg text-headline-lg-mobile rounded-full shadow-[0_0_20px_rgba(0,245,255,0.4)] hover:shadow-[0_0_35px_rgba(0,245,255,0.6)] active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    Generate My Roadmap
                    <span className="material-symbols-outlined">
                      auto_awesome
                    </span>
                  </button>
                  <div className="flex items-center gap-3 text-on-surface-variant opacity-60">
                    <span className="material-symbols-outlined text-sm">
                      lock
                    </span>
                    <span className="font-data-label text-data-label">
                      Secure Synthesis Protocol v4.2.0
                    </span>
                  </div>
                </div>
              </form>

              {/* Loading overlay */}
              {loading && (
                <div className="absolute inset-0 z-20 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
                  <div className="relative mb-8">
                    <div className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-3xl animate-pulse">
                        hub
                      </span>
                    </div>
                  </div>
                  <h3 className="font-headline-lg text-headline-lg text-primary mb-2">
                    Synthesizing Pathways...
                  </h3>
                  <div className="w-64 h-1 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
                    <div className="h-full bg-primary loading-shimmer w-full" />
                  </div>
                  <p className="font-data-label text-data-label text-on-surface-variant mt-4 uppercase tracking-widest">
                    {loadingText}
                  </p>
                </div>
              )}
            </div>

            {/* Hint cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
              {[
                {
                  icon: "hub",
                  title: "Asset Mapping",
                  desc: "Connect your data points across 40,000+ clinical and regulatory nodes.",
                },
                {
                  icon: "insights",
                  title: "Predictive Logic",
                  desc: "Identify timeline bottlenecks before they occur with AI-driven forecasting.",
                },
                {
                  icon: "terminal",
                  title: "Output Formats",
                  desc: "Export roadmaps directly to Gantt, JSON, or high-fidelity PDF presentations.",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="glass-card p-6 rounded-xl hover:bg-primary/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-primary mb-4 text-3xl block">
                    {card.icon}
                  </span>
                  <h4 className="font-headline-lg text-sm mb-2 text-on-surface">
                    {card.title}
                  </h4>
                  <p className="font-body-md text-xs text-on-surface-variant">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ---- ROADMAP VIEW ---- */
          <div>
            <header className="mb-16">
              <div className="font-data-label text-data-label text-primary-fixed mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-status-pulse relative">
                  <span className="absolute inset-0 rounded-full bg-status-pulse status-pulse-ring" />
                </span>
                MISSION CONTROL: PHASE B ACTIVE
              </div>
              <h1 className="font-display-lg text-display-lg text-primary max-w-3xl">
                Strategic Development Roadmap
              </h1>
              <p className="mt-4 text-on-surface-variant max-w-xl font-body-md">
                Visualize the path from asset identification to clinical
                outcome. Our precision engine maps every milestone, bottleneck,
                and partner interface.
              </p>
              <button
                onClick={() => setShowRoadmap(false)}
                className="mt-6 px-6 py-2 border border-[rgba(255,255,255,0.1)] text-on-surface-variant hover:text-primary hover:border-primary transition-all font-data-label text-data-label flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">
                  arrow_back
                </span>
                Modify Parameters
              </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Roadmap column */}
              <div className="lg:col-span-8 space-y-6">
                {/* SVG Map */}
                <div className="glass-card p-2 rounded-xl overflow-hidden relative min-h-[400px]">
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)",
                        backgroundSize: "32px 32px",
                      }}
                    />
                  </div>
                  <div className="relative z-10 w-full h-full flex items-center justify-center p-8">
                    <svg className="w-full" viewBox="0 0 1000 300">
                      <path
                        className="animated-path"
                        d="M 50 150 Q 150 50, 250 150 T 450 150 T 650 150 T 850 150"
                        fill="none"
                        stroke="#00dce5"
                        strokeLinecap="round"
                        strokeWidth="4"
                      />
                      {[
                        { cx: 50, label: "Identification", active: true, completed: true },
                        { cx: 250, label: "Optimization", active: true, completed: false },
                        { cx: 450, label: "Validation", active: false, completed: false },
                        { cx: 650, label: "Regulatory", active: false, completed: false },
                        { cx: 850, label: "Launch", active: false, completed: false },
                      ].map((pin) => (
                        <g key={pin.cx} className="cursor-pointer group">
                          {pin.completed && !pin.active && (
                            <>
                              <circle cx={pin.cx} cy={150} r={10} fill="#00dce5" />
                              <circle cx={pin.cx} cy={150} r={15} fill="none" stroke="#00dce5" strokeWidth={1} className="animate-ping" />
                            </>
                          )}
                          {pin.active && !pin.completed && (
                            <circle cx={pin.cx} cy={150} r={12} fill="#e9feff" stroke="#00dce5" strokeWidth={4} />
                          )}
                          {pin.completed && pin.active && (
                            <>
                              <circle cx={pin.cx} cy={150} r={10} fill="#00dce5" />
                              <circle cx={pin.cx} cy={150} r={15} fill="none" stroke="#00dce5" strokeWidth={1} className="animate-ping" />
                            </>
                          )}
                          {!pin.active && !pin.completed && (
                            <circle cx={pin.cx} cy={150} r={8} fill="#1a1f2f" stroke="#849495" strokeWidth={2} />
                          )}
                          <text
                            textAnchor="middle"
                            x={pin.cx}
                            y={185}
                            className="font-data-label text-[10px] fill-on-surface-variant uppercase"
                            style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "10px" }}
                          >
                            {pin.label}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                  <div className="absolute bottom-4 left-4 flex gap-4">
                    <div className="glass-card px-3 py-1 rounded-full text-[10px] font-data-label flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary-fixed-dim" /> COMPLETED
                    </div>
                    <div className="glass-card px-3 py-1 rounded-full text-[10px] font-data-label flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-on-surface-variant" /> PENDING
                    </div>
                  </div>
                </div>

                {/* Stage cards */}
                <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                  {stages.map((stage) => (
                    <div
                      key={stage.id}
                      className={`min-w-[280px] snap-start glass-card p-6 rounded-xl flex flex-col justify-between border-l-4 ${
                        stage.status === "active"
                          ? "border-l-status-pulse bg-primary/5"
                          : stage.status === "completed"
                          ? "border-l-primary-fixed-dim"
                          : "border-l-surface-variant opacity-70"
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className="font-data-label text-data-label text-on-surface-variant">
                            STAGE {stage.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-data-label ${
                              stage.status === "active"
                                ? "bg-primary-container text-on-primary-container"
                                : "bg-surface-container-high text-on-surface-variant"
                            }`}
                          >
                            {stage.duration}
                          </span>
                        </div>
                        <h3
                          className={`font-headline-lg text-[20px] mb-2 ${
                            stage.status === "locked"
                              ? "text-on-surface-variant"
                              : "text-primary"
                          }`}
                        >
                          {stage.name}
                        </h3>
                        <p className="text-sm text-on-surface-variant mb-4">
                          {stage.desc}
                        </p>
                        {stage.tools && (
                          <div className="text-[11px] font-data-label text-primary-fixed mb-4">
                            <span className="block text-on-surface-variant opacity-60 mb-1 uppercase">
                              Recommended Tools
                            </span>
                            {stage.tools}
                          </div>
                        )}
                      </div>
                      <div
                        className={`flex items-center gap-2 text-[10px] font-data-label p-2 rounded ${
                          stage.warning.type === "error"
                            ? "text-error bg-error-container/20"
                            : stage.warning.type === "pulse"
                            ? "text-status-pulse bg-primary/10"
                            : "text-on-surface-variant bg-surface-container-high"
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
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-4 space-y-6">
                {/* Partner card */}
                <div className="glass-card rounded-xl overflow-hidden">
                  <div className="h-32 w-full relative bg-gradient-to-br from-surface-container-high to-surface-container-lowest flex items-end">
                    <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                    <div className="absolute bottom-4 left-4">
                      <div className="font-data-label text-data-label text-primary-fixed uppercase mb-1">
                        Recommended Partner
                      </div>
                      <h4 className="font-headline-lg text-headline-lg text-primary">
                        Global Pharma Labs
                      </h4>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex-1">
                        <div className="text-[10px] font-data-label text-on-surface-variant uppercase">
                          Country
                        </div>
                        <div className="text-sm text-primary flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">
                            location_on
                          </span>
                          Switzerland
                        </div>
                      </div>
                      <div className="flex-1 text-right">
                        <div className="text-[10px] font-data-label text-on-surface-variant uppercase">
                          Speciality
                        </div>
                        <div className="text-sm text-primary">
                          Lead Optimization
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <button className="w-full py-3 bg-primary text-background font-bold uppercase tracking-widest text-[12px] rounded-sm hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all duration-200">
                        Connect
                      </button>
                      <button className="w-full py-3 border border-primary/30 text-primary font-bold uppercase tracking-widest text-[12px] rounded-sm hover:bg-primary/5 transition-all duration-200">
                        Learn More
                      </button>
                    </div>
                  </div>
                </div>

                {/* AI Insight card */}
                <div className="glass-card p-6 rounded-xl border border-primary-container/20">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-primary-container">
                      psychology
                    </span>
                    <h4 className="font-data-label text-data-label uppercase tracking-widest text-primary">
                      AI Navigator Insight
                    </h4>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-4">
                    Analysis of Phase B data suggests a{" "}
                    <span className="text-primary">14% acceleration</span>{" "}
                    possibility by integrating Global Pharma Labs&apos; synthetic
                    proprietary library.
                  </p>
                  <div className="flex justify-between items-center pt-4 border-t border-[rgba(255,255,255,0.1)]">
                    <span className="text-[11px] font-data-label text-on-surface-variant">
                      CONFIDENCE LEVEL
                    </span>
                    <span className="text-status-pulse font-data-label">
                      92.4%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
