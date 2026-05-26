import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const wikiData: Record<
  string,
  {
    episode: string;
    duration: string;
    title: string;
    tags: string[];
    concepts: {
      id: string;
      title: string;
      points: string[];
    }[];
  }
> = {
  "digital-twins-clinical-trials": {
    episode: "#01",
    duration: "42:15",
    title: "Digital Twins in Clinical Trials",
    tags: ["# AI", "# Clinical Trials", "# Simulation"],
    concepts: [
      {
        id: "01",
        title: "Physiological Synchronicity",
        points: [
          "Real-time biometric data alignment.",
          "Feedback loops for multi-organ systems.",
        ],
      },
      {
        id: "02",
        title: "In Silico Arm Validation",
        points: [
          "Computational control group reliability.",
          "Reduction of human subject requirements.",
        ],
      },
      {
        id: "03",
        title: "Predictive Pharmacokinetics",
        points: [
          "Dynamic drug interaction modeling.",
          "Metabolic pathway variance simulation.",
        ],
      },
      {
        id: "04",
        title: "Synthetic Data Integrity",
        points: [
          "Blockchain-verified data lineage.",
          "Privacy-preserving AI architecture.",
        ],
      },
    ],
  },
};

const defaultData = {
  episode: "#01",
  duration: "42:15",
  title: "Digital Twins in Clinical Trials",
  tags: ["# AI", "# Clinical Trials", "# Simulation"],
  concepts: [
    {
      id: "01",
      title: "Physiological Synchronicity",
      points: [
        "Real-time biometric data alignment.",
        "Feedback loops for multi-organ systems.",
      ],
    },
    {
      id: "02",
      title: "In Silico Arm Validation",
      points: [
        "Computational control group reliability.",
        "Reduction of human subject requirements.",
      ],
    },
    {
      id: "03",
      title: "Predictive Pharmacokinetics",
      points: [
        "Dynamic drug interaction modeling.",
        "Metabolic pathway variance simulation.",
      ],
    },
    {
      id: "04",
      title: "Synthetic Data Integrity",
      points: [
        "Blockchain-verified data lineage.",
        "Privacy-preserving AI architecture.",
      ],
    },
  ],
};

const liveLiterature = [
  {
    title: "Impact of Latency on Digital Twin Fidelity",
    source: "Nature Biotech • Oct 2024",
  },
  {
    title: "Ethical Frameworks for In Silico Subjects",
    source: "Oxford Journal • Sept 2024",
  },
  {
    title: "Neural Arch for Organ-on-Chip Twins",
    source: "Cell Reports • Aug 2024",
  },
  {
    title: "Synthetic Population Generation at Scale",
    source: "IEEE BioMed • July 2024",
  },
];

const relatedEpisodes = [
  { ep: "#02", title: "Neural Mapping 2025", slug: "neural-mapping-2025" },
  {
    ep: "#03",
    title: "CRISPR Ethics in Simulation",
    slug: "crispr-ethics-simulation",
  },
  { ep: "#04", title: "Metabolic Forecasting", slug: "metabolic-forecasting" },
];

const comments = [
  {
    name: "John Doe",
    role: "Senior Researcher @ SPARC",
    time: "2h ago",
    text: "The discussion regarding physiological synchronicity is vital. We've seen similar latency issues in our neuro-simulations. Would love to see the dataset for Episode 01's primary study.",
  },
  {
    name: "Sarah Chen",
    role: "Bioinformatics Lead @ GenomicData",
    time: "5h ago",
    text: "Absolutely. Reducing Phase II populations by 30% via in silico arms is a game changer for rare disease research where patient recruitment is the primary bottleneck.",
  },
];

export default function WikiPage({
  params,
}: {
  params: { slug: string };
}) {
  const data = wikiData[params.slug] ?? defaultData;

  return (
    <>
      {/* Atmospheric background */}
      <div className="fixed inset-0 -z-10 pointer-events-none opacity-20">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(14,19,34,0.8)_100%)]" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <Navbar />

      <main className="pt-32 pb-20 px-4 md:px-16 max-w-[1440px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
          {/* Left: Content */}
          <div className="md:col-span-7 flex flex-col gap-12">
            {/* Hero Header */}
            <header className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <span className="font-data-label text-data-label text-primary-fixed border border-primary-fixed/30 px-3 py-1 bg-primary-fixed/5">
                  EPISODE {data.episode}
                </span>
                <div className="h-1 w-12 bg-primary/20" />
                <span className="font-data-label text-data-label text-on-surface-variant">
                  {data.duration} DURATION
                </span>
              </div>
              <h1 className="font-display-lg text-display-lg text-primary">
                {data.title}
              </h1>
              <div className="flex flex-wrap gap-3">
                {data.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-surface-container-highest text-on-surface-variant font-data-label text-data-label border border-[rgba(255,255,255,0.1)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4">
                <button className="flex items-center gap-3 bg-primary text-background font-bold px-8 py-4 transition-all hover:shadow-[0_0_20px_rgba(233,254,255,0.5)] active:scale-95">
                  <span className="material-symbols-outlined">play_circle</span>
                  Listen on Spotify
                </button>
              </div>
            </header>

            {/* Key Concepts */}
            <section className="flex flex-col gap-8">
              <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.1)] pb-4">
                <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary-container">
                    science
                  </span>
                  Key Concepts
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {data.concepts.map((concept) => (
                  <div
                    key={concept.id}
                    className="glass-card p-6 flex flex-col gap-3 group hover:border-primary/40 transition-colors"
                  >
                    <span className="font-data-label text-data-label text-primary">
                      CONCEPT {concept.id}
                    </span>
                    <h3 className="font-headline-lg text-xl text-on-surface">
                      {concept.title}
                    </h3>
                    <ul className="text-on-surface-variant space-y-2 text-sm">
                      {concept.points.map((pt) => (
                        <li key={pt} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Transcript */}
            <section className="glass-card overflow-hidden">
              <details>
                <summary className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-colors cursor-pointer list-none">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant">
                      description
                    </span>
                    <h2 className="font-headline-lg text-lg text-on-surface">
                      Full Transcript
                    </h2>
                  </div>
                  <span className="material-symbols-outlined transition-transform duration-300">
                    expand_more
                  </span>
                </summary>
                <div className="border-t border-[rgba(255,255,255,0.1)] p-8 bg-surface-container-lowest/50 text-on-surface-variant font-body-md leading-relaxed h-[400px] overflow-y-auto custom-scrollbar">
                  <p className="mb-4">
                    <strong className="text-primary font-data-label">
                      [00:00:12] Dr. Aris Thorne:
                    </strong>{" "}
                    Welcome to the SDD Navigator session. Today we&apos;re
                    diving deep into the architecture of digital twins. How do
                    we move from simple physiological monitoring to a predictive
                    &apos;shadow&apos; of a human participant?
                  </p>
                  <p className="mb-4">
                    <strong className="text-primary font-data-label">
                      [00:05:45] Dr. Helena Vance:
                    </strong>{" "}
                    The primary hurdle isn&apos;t just the data volume;
                    it&apos;s the high-fidelity synchronization. If your digital
                    twin lags behind the biological response by more than 200ms,
                    the predictive validity in acute reaction trials drops
                    significantly...
                  </p>
                  <p className="mb-4">
                    <strong className="text-primary font-data-label">
                      [00:12:30] Dr. Aris Thorne:
                    </strong>{" "}
                    And that brings us to the concept of in silico arms.
                    SPARC&apos;s latest paper suggests that by using hybrid
                    models, we can reduce the required Phase II population by
                    nearly 30% while maintaining the same statistical power.
                  </p>
                  <p className="mb-4">
                    ... [Extended conversation about machine learning
                    hyperparameters in biological modeling] ...
                  </p>
                </div>
              </details>
            </section>

            {/* Researcher Discussion */}
            <section className="flex flex-col gap-8">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">
                Researcher Discussion
              </h2>

              {/* Locked input */}
              <div className="glass-card p-8 flex flex-col items-center justify-center gap-4 text-center border-dashed">
                <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center border border-[rgba(255,255,255,0.1)]">
                  <span className="material-symbols-outlined text-primary">
                    lock
                  </span>
                </div>
                <p className="text-on-surface-variant">
                  Access restricted to verified researchers.
                </p>
                <Link href="/login">
                  <button className="text-primary font-bold border-b border-primary hover:border-b-2 transition-all">
                    Login to comment
                  </button>
                </Link>
              </div>

              {/* Comments */}
              <div className="flex flex-col gap-6">
                {comments.map((c) => (
                  <div key={c.name} className="glass-card p-6 flex gap-4">
                    <div className="w-12 h-12 rounded-full border-2 border-primary/20 bg-surface-container-high flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-on-surface-variant">
                        person
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="font-bold text-on-surface">
                            {c.name}
                          </span>
                          <span className="font-data-label text-[10px] text-primary bg-primary/10 px-2 py-0.5 self-start mt-1">
                            {c.role}
                          </span>
                        </div>
                        <span className="font-data-label text-[10px] text-on-surface-variant">
                          {c.time}
                        </span>
                      </div>
                      <p className="text-on-surface-variant text-sm mt-2 italic border-l-2 border-primary/30 pl-4">
                        &ldquo;{c.text}&rdquo;
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right: Sidebar */}
          <aside className="md:col-span-3 flex flex-col gap-10">
            {/* Live Literature */}
            <section className="flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="font-data-label text-data-label text-primary tracking-widest uppercase">
                  Live Literature
                </h3>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-status-pulse pulse-effect" />
                  <span className="text-[10px] font-data-label text-status-pulse">
                    LIVE
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {liveLiterature.map((lit) => (
                  <div
                    key={lit.title}
                    className="glass-card p-4 hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <h4 className="text-xs font-bold text-on-surface mb-1">
                      {lit.title}
                    </h4>
                    <span className="font-data-label text-[10px] text-on-surface-variant">
                      {lit.source}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Graph Card */}
            <section className="relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
              <div className="glass-card p-8 border-primary/30 flex flex-col items-center text-center gap-4">
                <span className="material-symbols-outlined text-4xl text-primary animate-pulse">
                  hub
                </span>
                <h3 className="font-headline-lg text-lg text-on-surface">
                  Knowledge Graph
                </h3>
                <p className="text-sm text-on-surface-variant mb-4">
                  Visualize the multi-dimensional connections between
                  researchers, papers, and clinical results.
                </p>
                <Link href="/register" className="w-full">
                  <button className="w-full bg-primary-container text-on-primary-container py-3 font-bold hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all">
                    Register to explore graph
                  </button>
                </Link>
              </div>
            </section>

            {/* Related Episodes */}
            <section className="flex flex-col gap-6">
              <h3 className="font-data-label text-data-label text-primary tracking-widest uppercase">
                Related Episodes
              </h3>
              <div className="flex flex-col gap-4">
                {relatedEpisodes.map((ep) => (
                  <Link
                    key={ep.ep}
                    href={`/topics/${ep.slug}`}
                    className="flex gap-3 group cursor-pointer"
                  >
                    <div className="w-16 h-16 shrink-0 glass-card flex items-center justify-center overflow-hidden">
                      <span className="material-symbols-outlined text-primary/40 text-3xl group-hover:text-primary transition-colors">
                        science
                      </span>
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="font-data-label text-[10px] text-primary">
                        EP {ep.ep}
                      </span>
                      <h4 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                        {ep.title}
                      </h4>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>

      <Footer />
    </>
  );
}
