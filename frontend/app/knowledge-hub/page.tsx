import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const episodes = [
  {
    num: "001",
    icon: "science",
    title: "Digital Twins in Clinical Trials",
    tags: ["Clinical", "Data Modeling"],
    desc: "Leveraging computational replicas of patients to optimize control groups and predict treatment response in real-time environments.",
    slug: "digital-twins-clinical-trials",
  },
  {
    num: "002",
    icon: "matter",
    title: "Molecular Glue Degraders",
    tags: ["Pharma", "Degradation"],
    desc: "Exploring the frontier of induced proximity and E3 ligase recruitment for previously undruggable oncology targets.",
    slug: "molecular-glue-degraders",
  },
  {
    num: "003",
    icon: "biotech",
    title: "Companion Diagnostic Biomarkers",
    tags: ["Diagnostics", "Clinical"],
    desc: "A deep dive into the regulatory landscape and clinical utility of predictive biomarkers in personalized medicine.",
    slug: "companion-diagnostic-biomarkers",
  },
  {
    num: "004",
    icon: "psychology",
    title: "AI in Target Identification",
    tags: ["AI", "Discovery"],
    desc: "Utilizing graph neural networks to map interactomes and uncover novel disease-driving biological pathways.",
    slug: "ai-target-identification",
  },
  {
    num: "005",
    icon: "database",
    title: "ADMET Prediction with ML",
    tags: ["ML", "Toxicity"],
    desc: "Reducing attrition rates by predicting Absorption, Distribution, Metabolism, Excretion, and Toxicity using deep learning.",
    slug: "admet-prediction-ml",
  },
  {
    num: "006",
    icon: "hub",
    title: "Multi-Agent Drug Discovery",
    tags: ["AI", "Pharma"],
    desc: "Orchestrating autonomous AI agents to manage large-scale chemical synthesis and validation pipelines.",
    slug: "multi-agent-drug-discovery",
  },
];

export default function KnowledgeHubPage() {
  return (
    <>
      <div className="dna-grid fixed inset-0 pointer-events-none -z-10" />
      <Navbar />

      <main className="pt-32 pb-20 px-4 md:px-16 max-w-[1440px] mx-auto min-h-screen">
        {/* Hero / Search */}
        <section className="mb-16 text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="relative flex items-center justify-center w-3 h-3">
              <div className="absolute w-full h-full bg-status-pulse rounded-full opacity-50" />
              <div className="absolute w-full h-full bg-status-pulse rounded-full status-pulse-ring" />
            </div>
            <span className="font-data-label text-data-label text-status-pulse tracking-widest uppercase">
              Live Knowledge Database
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg md:font-display-lg md:text-display-lg text-primary mb-8 tracking-tight">
            Knowledge Hub
          </h1>
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-on-surface-variant">
                search
              </span>
            </div>
            <input
              type="text"
              className="w-full bg-surface-container-low border-b border-[rgba(255,255,255,0.1)] py-5 pl-14 pr-6 text-on-surface focus:outline-none focus:border-primary transition-all duration-300 placeholder:text-on-surface-variant/50 font-body-md"
              placeholder="Search clinical papers, wiki episodes, or target insights..."
            />
            <div className="absolute inset-y-0 right-4 flex items-center gap-2">
              <span className="font-data-label text-data-label text-on-surface-variant/40 border border-[rgba(255,255,255,0.1)] px-2 py-1 rounded">
                ⌘ K
              </span>
            </div>
          </div>
        </section>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {episodes.map((ep) => (
            <article
              key={ep.num}
              className="glass-card p-6 flex flex-col group transition-all duration-300 hover:border-[rgba(0,245,255,0.4)] hover:shadow-[0_0_20px_rgba(0,245,255,0.15)]"
            >
              <div className="flex justify-between items-start mb-6">
                <span className="font-data-label text-data-label text-data-mono">
                  EPISODE #{ep.num}
                </span>
                <span className="material-symbols-outlined text-primary/40 group-hover:text-primary transition-colors">
                  {ep.icon}
                </span>
              </div>
              <h3 className="font-headline-lg text-headline-lg text-primary mb-3 leading-tight">
                {ep.title}
              </h3>
              <div className="flex flex-wrap gap-2 mb-6">
                {ep.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-data-label text-[10px] px-2 py-1 bg-surface-container-highest text-primary border border-[rgba(255,255,255,0.1)] rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="font-body-md text-on-surface-variant mb-8 flex-grow">
                {ep.desc}
              </p>
              <Link href={`/topics/${ep.slug}`}>
                <button className="w-full py-3 bg-transparent border border-primary text-primary font-bold hover:bg-primary/10 transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]">
                  Read Wiki{" "}
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </button>
              </Link>
            </article>
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}
