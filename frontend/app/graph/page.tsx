"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";

type NodeType = "episode" | "concept" | "resource";

interface NodeModal {
  type: NodeType;
  title: string;
  data: {
    episode?: string;
    tags?: string[];
    desc?: string;
    mentions?: string[];
    meta?: string;
    abstract?: string;
  };
}

const graphNodes = {
  episode: { cx: 720, cy: 400, r: 14, label: "Episode 42" },
  concepts: [
    { cx: 400, cy: 250, r: 9, label: "Digital Twins" },
    { cx: 1040, cy: 250, r: 9, label: "ADMET" },
    { cx: 720, cy: 150, r: 9, label: "Virtual Patients" },
    { cx: 400, cy: 550, r: 9, label: "EMA Regulations" },
    { cx: 1040, cy: 550, r: 9, label: "AlphaFold" },
    { cx: 720, cy: 650, r: 9, label: "Molecular Docking" },
  ],
  resources: [
    { cx: 250, cy: 200, r: 6, label: "Nature 2024" },
    { cx: 1190, cy: 300, r: 6, label: "Patent: AI Screening" },
    { cx: 850, cy: 720, r: 6, label: "bioRxiv: Multi-Agent" },
  ],
};

export default function GraphPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Auth guard — redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const svgRef = useRef<SVGSVGElement>(null);
  const [modal, setModal] = useState<NodeModal | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const viewBox = useRef({ x: 0, y: 0, w: 1440, h: 800 });

  const openModal = useCallback(
    (type: NodeType, title: string, data: NodeModal["data"]) => {
      setModal({ type, title, data });
    },
    []
  );

  const closeModal = useCallback(() => setModal(null), []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest(".node-group")) return;
      setIsDragging(true);
      startPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      viewBox.current.x -= dx;
      viewBox.current.y -= dy;
      startPos.current = { x: e.clientX, y: e.clientY };
      svg.setAttribute(
        "viewBox",
        `${viewBox.current.x} ${viewBox.current.y} ${viewBox.current.w} ${viewBox.current.h}`
      );
    };

    const onMouseUp = () => setIsDragging(false);

    svg.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      svg.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDragging]);

  function handleZoom(direction: "in" | "out") {
    const svg = svgRef.current;
    if (!svg) return;
    const factor = direction === "in" ? 0.9 : 1.1;
    viewBox.current.w *= factor;
    viewBox.current.h *= factor;
    svg.setAttribute(
      "viewBox",
      `${viewBox.current.x} ${viewBox.current.y} ${viewBox.current.w} ${viewBox.current.h}`
    );
  }

  function handleReset() {
    const svg = svgRef.current;
    if (!svg) return;
    viewBox.current = { x: 0, y: 0, w: 1440, h: 800 };
    svg.setAttribute("viewBox", "0 0 1440 800");
  }

  // Show nothing while auth resolves or redirecting
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background text-on-surface font-body-md overflow-hidden selection:bg-primary-container selection:text-on-primary-container h-screen flex flex-col">
      <Navbar />

      <main
        className="relative w-screen flex-1 overflow-hidden pt-20"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, #161b2b 0%, #0e1322 100%)",
          backgroundImage: `radial-gradient(circle at 50% 50%, #161b2b 0%, #0e1322 100%), radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)`,
          backgroundSize: "100% 100%, 40px 40px",
        }}
      >
        {/* SVG Graph */}
        <div className="w-full h-full relative" id="graph-container">
          <svg
            ref={svgRef}
            className="w-full h-full"
            viewBox="0 0 1440 800"
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
          >
            <g id="links">
              {/* Episode to Concepts */}
              {graphNodes.concepts.map((c) => (
                <line
                  key={`link-ep-${c.label}`}
                  x1={graphNodes.episode.cx}
                  y1={graphNodes.episode.cy}
                  x2={c.cx}
                  y2={c.cy}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1.5"
                />
              ))}
              {/* Concepts to Resources */}
              <line x1={400} y1={250} x2={250} y2={200} stroke="rgba(255,255,255,0.05)" strokeDasharray="4" strokeWidth="1" />
              <line x1={1040} y1={250} x2={1190} y2={300} stroke="rgba(255,255,255,0.05)" strokeDasharray="4" strokeWidth="1" />
              <line x1={720} y1={650} x2={850} y2={720} stroke="rgba(255,255,255,0.05)" strokeDasharray="4" strokeWidth="1" />
            </g>

            <g id="nodes">
              {/* Episode node */}
              <g
                className="cursor-pointer node-group"
                transform={`translate(${graphNodes.episode.cx}, ${graphNodes.episode.cy})`}
                onClick={() =>
                  openModal("episode", "EPISODE #42: The Digital Frontier", {
                    episode: "42",
                    tags: ["Digital Twin", "AI", "Ethics"],
                    desc: "Exploring the boundary between virtual representation and biological reality in modern clinical trials.",
                  })
                }
              >
                <circle
                  r={14}
                  fill="#00dce5"
                  className="animate-status-pulse"
                  style={{ filter: "drop-shadow(0 0 10px #00dce5)" }}
                />
                <text
                  textAnchor="middle"
                  y={32}
                  style={{
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: "11px",
                    fill: "#b9caca",
                    fontWeight: "bold",
                  }}
                >
                  Episode 42
                </text>
              </g>

              {/* Concept nodes */}
              {graphNodes.concepts.map((c) => (
                <g
                  key={c.label}
                  className="cursor-pointer node-group"
                  transform={`translate(${c.cx}, ${c.cy})`}
                  onClick={() =>
                    openModal("concept", c.label, {
                      mentions: ["Ep 42", "Ep 45"],
                    })
                  }
                >
                  <circle
                    r={c.r}
                    fill="#4ade80"
                    style={{ filter: "drop-shadow(0 0 8px #4ade80)" }}
                  />
                  <text
                    textAnchor="middle"
                    y={24}
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: "10px",
                      fill: "#b9caca",
                    }}
                  >
                    {c.label}
                  </text>
                </g>
              ))}

              {/* Resource nodes */}
              {graphNodes.resources.map((r) => (
                <g
                  key={r.label}
                  className="cursor-pointer node-group"
                  transform={`translate(${r.cx}, ${r.cy})`}
                  onClick={() =>
                    openModal("resource", r.label, {
                      meta: "SPARC Labs | 2024",
                      abstract:
                        "A comprehensive study on the validation of digital twin cohorts in oncology phase III trials.",
                    })
                  }
                >
                  <circle
                    r={r.r}
                    fill="#c084fc"
                    style={{ filter: "drop-shadow(0 0 6px #c084fc)" }}
                  />
                  <text
                    textAnchor="middle"
                    y={18}
                    style={{
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: "9px",
                      fill: "#b9caca",
                    }}
                  >
                    {r.label}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>

        {/* Legend */}
        <div className="absolute bottom-10 left-16 glass-card p-6 rounded-xl flex flex-col gap-4 min-w-[200px]">
          <div className="font-data-label text-data-label text-on-surface-variant uppercase tracking-widest border-b border-[rgba(255,255,255,0.1)] pb-2 mb-2">
            Entity Legend
          </div>
          {[
            { color: "bg-primary-fixed-dim shadow-[0_0_8px_#00dce5]", size: "w-4 h-4", label: "Episodes" },
            { color: "bg-green-400 shadow-[0_0_8px_#4ade80]", size: "w-3 h-3", label: "Concepts" },
            { color: "bg-purple-400 shadow-[0_0_8px_#c084fc]", size: "w-2 h-2", label: "Resources" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className={`${item.size} rounded-full ${item.color}`} />
              <span className="font-body-md text-sm text-on-surface">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="absolute bottom-10 right-16 flex flex-col gap-2">
          {[
            { icon: "add", action: () => handleZoom("in"), title: "Zoom In" },
            { icon: "remove", action: () => handleZoom("out"), title: "Zoom Out" },
            { icon: "restart_alt", action: handleReset, title: "Reset View" },
          ].map((btn) => (
            <button
              key={btn.icon}
              onClick={btn.action}
              title={btn.title}
              className="glass-card p-3 rounded-lg hover:bg-primary-container hover:text-on-primary-container transition-all"
            >
              <span className="material-symbols-outlined">{btn.icon}</span>
            </button>
          ))}
        </div>

        {/* Status bar */}
        <div className="absolute top-24 left-16 flex items-center gap-4 pointer-events-none">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur px-4 py-2 rounded-full border border-[rgba(255,255,255,0.1)]">
            <div className="w-2 h-2 rounded-full bg-status-pulse animate-pulse" />
            <span className="font-data-label text-[11px] tracking-widest text-primary uppercase">
              Engine Active
            </span>
          </div>
          <div className="bg-black/40 backdrop-blur px-4 py-2 rounded-full border border-[rgba(255,255,255,0.1)]">
            <span className="font-data-label text-[11px] tracking-widest text-on-surface-variant uppercase">
              Nodes: 12,842
            </span>
          </div>
        </div>

        {/* Modal */}
        {modal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{
              background: "rgba(9, 14, 28, 0.8)",
              backdropFilter: "blur(8px)",
            }}
            onClick={closeModal}
          >
            <div
              className="glass-card w-full max-w-lg rounded-2xl p-8 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {modal.type === "episode" && (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-data-label text-[11px] text-primary-fixed-dim bg-primary/10 px-2 py-1 rounded mb-2 inline-block uppercase tracking-wider">
                        Episode #{modal.data.episode}
                      </span>
                      <h2 className="font-headline-lg text-headline-lg text-primary leading-tight">
                        {modal.title}
                      </h2>
                    </div>
                    <button
                      onClick={closeModal}
                      className="text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {modal.data.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="bg-surface-container-high px-3 py-1 rounded-full text-[11px] font-data-label text-on-surface border border-[rgba(255,255,255,0.1)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-on-surface-variant leading-relaxed text-sm">
                    {modal.data.desc}
                  </p>
                  <div className="flex gap-3 mt-4">
                    <button className="flex-grow bg-primary-container text-on-primary-container font-data-label text-sm font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all">
                      Open Wiki Page{" "}
                      <span className="material-symbols-outlined text-[18px]">
                        open_in_new
                      </span>
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-6 py-3 border border-[rgba(255,255,255,0.1)] rounded-lg text-on-surface-variant hover:bg-white/5 transition-colors font-data-label text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {modal.type === "concept" && (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-data-label text-[11px] text-green-400 bg-green-400/10 px-2 py-1 rounded mb-2 inline-block uppercase tracking-wider">
                        Scientific Concept
                      </span>
                      <h2 className="font-headline-lg text-headline-lg text-green-400 leading-tight">
                        {modal.title}
                      </h2>
                    </div>
                    <button
                      onClick={closeModal}
                      className="text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div>
                    <p className="font-data-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-3">
                      Mentioned in Episodes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {modal.data.mentions?.map((m) => (
                        <button
                          key={m}
                          className="bg-surface-container-low hover:bg-surface-container-high px-4 py-2 rounded-lg text-xs border border-[rgba(255,255,255,0.1)] transition-colors"
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button className="flex-grow bg-green-400/20 text-green-400 border border-green-400/30 font-data-label text-sm font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-green-400/30 transition-all">
                      View Related Episodes{" "}
                      <span className="material-symbols-outlined text-[18px]">
                        hub
                      </span>
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-6 py-3 border border-[rgba(255,255,255,0.1)] rounded-lg text-on-surface-variant hover:bg-white/5 transition-colors font-data-label text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {modal.type === "resource" && (
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-data-label text-[11px] text-purple-400 bg-purple-400/10 px-2 py-1 rounded mb-2 inline-block uppercase tracking-wider">
                        Research Artifact
                      </span>
                      <h2 className="font-headline-lg text-2xl text-on-surface leading-tight">
                        {modal.title}
                      </h2>
                    </div>
                    <button
                      onClick={closeModal}
                      className="text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div className="text-purple-400/80 font-data-label text-[11px] leading-snug">
                    {modal.data.meta}
                  </div>
                  <div className="relative">
                    <p className="font-data-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-2">
                      Abstract
                    </p>
                    <p className="text-on-surface-variant text-sm italic line-clamp-2">
                      &ldquo;{modal.data.abstract}&rdquo;
                    </p>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button className="flex-grow bg-purple-400/20 text-purple-400 border border-purple-400/30 font-data-label text-sm font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-purple-400/30 transition-all">
                      Read Full Paper{" "}
                      <span className="material-symbols-outlined text-[18px]">
                        article
                      </span>
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-6 py-3 border border-[rgba(255,255,255,0.1)] rounded-lg text-on-surface-variant hover:bg-white/5 transition-colors font-data-label text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
