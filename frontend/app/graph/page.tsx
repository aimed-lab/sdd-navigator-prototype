"use client";
import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
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

  // Show spinner while auth resolves
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: "#0f0f0f" }}
    >
      <Navbar />

      <main className="relative flex-1 overflow-hidden">
        {/* Graph canvas */}
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox="0 0 1440 800"
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
        >
          {/* Dot grid background */}
          <defs>
            <pattern
              id="dot-grid"
              x="0"
              y="0"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="rgba(255,255,255,0.06)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dot-grid)" />

          <g id="links">
            {graphNodes.concepts.map((c) => (
              <line
                key={`link-ep-${c.label}`}
                x1={graphNodes.episode.cx}
                y1={graphNodes.episode.cy}
                x2={c.cx}
                y2={c.cy}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1.5"
              />
            ))}
            <line
              x1={400} y1={250} x2={250} y2={200}
              stroke="rgba(255,255,255,0.06)" strokeDasharray="4" strokeWidth="1"
            />
            <line
              x1={1040} y1={250} x2={1190} y2={300}
              stroke="rgba(255,255,255,0.06)" strokeDasharray="4" strokeWidth="1"
            />
            <line
              x1={720} y1={650} x2={850} y2={720}
              stroke="rgba(255,255,255,0.06)" strokeDasharray="4" strokeWidth="1"
            />
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
                fill="#1e6b52"
                className="graph-node-breathe"
                style={{ filter: "drop-shadow(0 0 12px rgba(30,107,82,0.8))" }}
              />
              <text
                textAnchor="middle"
                y={32}
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: "11px",
                  fill: "#9ee9c9",
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
                  fill="#88c408"
                  style={{ filter: "drop-shadow(0 0 8px rgba(136,196,8,0.7))" }}
                />
                <text
                  textAnchor="middle"
                  y={24}
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "10px",
                    fill: "#b7eed5",
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
                  fill="#8cd5b7"
                  style={{ filter: "drop-shadow(0 0 6px rgba(140,213,183,0.6))" }}
                />
                <text
                  textAnchor="middle"
                  y={18}
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "9px",
                    fill: "#9ee9c9",
                  }}
                >
                  {r.label}
                </text>
              </g>
            ))}
          </g>
        </svg>

        {/* Status bar (top-left) */}
        <div className="absolute top-6 left-6 flex items-center gap-3 pointer-events-none">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
            <span className="pulse-dot" />
            <span
              className="font-label-md text-label-md uppercase tracking-widest"
              style={{ color: "#9ee9c9" }}
            >
              Engine Active
            </span>
          </div>
          <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
            <span
              className="font-label-md text-label-md uppercase tracking-widest"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Nodes: 12,842
            </span>
          </div>
        </div>

        {/* Legend (bottom-left) */}
        <div className="absolute bottom-10 left-6 bg-black/70 backdrop-blur-sm border border-white/10 rounded-xl p-5 flex flex-col gap-3 min-w-[180px]">
          <div
            className="font-label-md text-label-md uppercase tracking-widest pb-2 mb-1 border-b border-white/10"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Entity Legend
          </div>
          {[
            { color: "#1e6b52", glow: "rgba(30,107,82,0.8)", size: "w-4 h-4", label: "Episodes" },
            { color: "#88c408", glow: "rgba(136,196,8,0.7)", size: "w-3 h-3", label: "Concepts" },
            { color: "#8cd5b7", glow: "rgba(140,213,183,0.6)", size: "w-2 h-2", label: "Resources" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span
                className={`${item.size} rounded-full shrink-0`}
                style={{
                  backgroundColor: item.color,
                  boxShadow: `0 0 8px ${item.glow}`,
                }}
              />
              <span
                className="font-body-sm text-body-sm"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Controls (bottom-right) */}
        <div className="absolute bottom-10 right-6 flex flex-col gap-2">
          {[
            { icon: "add", action: () => handleZoom("in"), title: "Zoom In" },
            { icon: "remove", action: () => handleZoom("out"), title: "Zoom Out" },
            { icon: "restart_alt", action: handleReset, title: "Reset View" },
          ].map((btn) => (
            <button
              key={btn.icon}
              onClick={btn.action}
              title={btn.title}
              className="bg-black/70 backdrop-blur-sm border border-white/10 p-3 rounded-lg transition-all hover:border-primary-container"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <span className="material-symbols-outlined">{btn.icon}</span>
            </button>
          ))}
        </div>

        {/* Modal */}
        {modal && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(8px)",
            }}
            onClick={closeModal}
          >
            <div
              className="w-full max-w-lg rounded-2xl p-8 relative overflow-hidden border border-white/10"
              style={{ background: "#1a1a1a" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* top accent */}
              <div className="absolute top-0 left-0 w-full h-1 bg-primary-container" />

              {modal.type === "episode" && (
                <div className="flex flex-col gap-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className="font-label-md text-label-md px-2 py-1 rounded mb-2 inline-block uppercase"
                        style={{
                          color: "#9ee9c9",
                          background: "rgba(30,107,82,0.15)",
                        }}
                      >
                        Episode #{modal.data.episode}
                      </span>
                      <h2
                        className="font-headline-md text-headline-md leading-tight"
                        style={{ color: "#9ee9c9" }}
                      >
                        {modal.title}
                      </h2>
                    </div>
                    <button
                      onClick={closeModal}
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {modal.data.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 rounded-full font-label-md text-label-md border border-white/10"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          color: "rgba(255,255,255,0.7)",
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p
                    className="font-body-sm text-body-sm leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {modal.data.desc}
                  </p>
                  <div className="flex gap-3 mt-2">
                    <button className="flex-grow bg-primary-container text-on-primary-container font-label-md text-label-md font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:brightness-110 transition-all">
                      Open Wiki Page{" "}
                      <span className="material-symbols-outlined text-[18px]">
                        open_in_new
                      </span>
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-6 py-3 rounded-lg font-label-md text-label-md border border-white/10 hover:bg-white/5 transition-colors"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {modal.type === "concept" && (
                <div className="flex flex-col gap-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className="font-label-md text-label-md px-2 py-1 rounded mb-2 inline-block uppercase"
                        style={{ color: "#88c408", background: "rgba(136,196,8,0.1)" }}
                      >
                        Scientific Concept
                      </span>
                      <h2
                        className="font-headline-md text-headline-md leading-tight"
                        style={{ color: "#88c408" }}
                      >
                        {modal.title}
                      </h2>
                    </div>
                    <button
                      onClick={closeModal}
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div>
                    <p
                      className="font-label-md text-label-md uppercase tracking-widest mb-3"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Mentioned in Episodes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {modal.data.mentions?.map((m) => (
                        <button
                          key={m}
                          className="px-4 py-2 rounded-lg text-xs border border-white/10 hover:bg-white/5 transition-colors"
                          style={{ color: "rgba(255,255,255,0.7)" }}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <button
                      className="flex-grow font-label-md text-label-md font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all border"
                      style={{
                        color: "#88c408",
                        borderColor: "rgba(136,196,8,0.3)",
                        background: "rgba(136,196,8,0.1)",
                      }}
                    >
                      View Related Episodes{" "}
                      <span className="material-symbols-outlined text-[18px]">hub</span>
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-6 py-3 rounded-lg font-label-md text-label-md border border-white/10 hover:bg-white/5 transition-colors"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}

              {modal.type === "resource" && (
                <div className="flex flex-col gap-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span
                        className="font-label-md text-label-md px-2 py-1 rounded mb-2 inline-block uppercase"
                        style={{ color: "#8cd5b7", background: "rgba(140,213,183,0.1)" }}
                      >
                        Research Artifact
                      </span>
                      <h2
                        className="font-headline-md text-headline-md text-2xl leading-tight"
                        style={{ color: "rgba(255,255,255,0.9)" }}
                      >
                        {modal.title}
                      </h2>
                    </div>
                    <button
                      onClick={closeModal}
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  <div
                    className="font-label-md text-label-md"
                    style={{ color: "rgba(140,213,183,0.7)" }}
                  >
                    {modal.data.meta}
                  </div>
                  <div>
                    <p
                      className="font-label-md text-label-md uppercase tracking-widest mb-2"
                      style={{ color: "rgba(255,255,255,0.4)" }}
                    >
                      Abstract
                    </p>
                    <p
                      className="font-body-sm text-body-sm italic line-clamp-2"
                      style={{ color: "rgba(255,255,255,0.6)" }}
                    >
                      &ldquo;{modal.data.abstract}&rdquo;
                    </p>
                  </div>
                  <div className="flex gap-3 mt-2">
                    <button
                      className="flex-grow font-label-md text-label-md font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all border"
                      style={{
                        color: "#8cd5b7",
                        borderColor: "rgba(140,213,183,0.3)",
                        background: "rgba(140,213,183,0.1)",
                      }}
                    >
                      Read Full Paper{" "}
                      <span className="material-symbols-outlined text-[18px]">article</span>
                    </button>
                    <button
                      onClick={closeModal}
                      className="px-6 py-3 rounded-lg font-label-md text-label-md border border-white/10 hover:bg-white/5 transition-colors"
                      style={{ color: "rgba(255,255,255,0.6)" }}
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
    </div>
  );
}
