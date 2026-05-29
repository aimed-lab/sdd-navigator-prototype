import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <div className="bg-background text-on-surface min-h-screen">
      <Navbar />

      <main>
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="py-xl px-gutter bg-background">
          <div className="max-w-[1280px] mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-1.5 rounded-full font-label-sm text-label-sm mb-8">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              Powered by UAB SPARC
            </div>

            <h1 className="font-display-lg text-display-lg text-on-surface mb-6 leading-tight max-w-3xl mx-auto">
              From Discovery to{" "}
              <em className="not-italic text-primary">Destination</em>
            </h1>

            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10">
              Tell us where you are in your research journey and where you want
              to go. We provide the roadmap, data, and community to get you
              there.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/navigator">
                <button className="flex items-center gap-2 px-8 py-3.5 bg-primary text-on-primary rounded-full font-bold hover:bg-primary-container transition-all active:scale-95 shadow-sm">
                  Try Navigator
                  <span className="material-symbols-outlined text-[18px]">north_east</span>
                </button>
              </Link>
              <Link href="/knowledge-hub">
                <button className="px-8 py-3.5 rounded-full border border-outline text-primary font-semibold hover:bg-surface-container-low transition-all active:scale-95">
                  Explore Knowledge Hub
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Stats Bar ─────────────────────────────────────────── */}
        <section className="bg-primary py-md px-gutter">
          <div className="max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-gutter text-center">
            {[
              { value: "500+", label: "Researchers" },
              { value: "58+", label: "Episodes" },
              { value: "30+", label: "Service Providers" },
              { value: "12", label: "Countries" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="font-label-sm text-label-sm text-on-primary/70 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── About / Quote ─────────────────────────────────────── */}
        <section className="py-xl px-gutter bg-background">
          <div className="max-w-[1280px] mx-auto grid md:grid-cols-2 gap-lg items-center">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-4">
                Accelerating Academic Innovation
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-6 leading-relaxed">
                The SDD Navigator is an institutional bridge designed to
                demystify the complex ecosystem of academic research. By
                combining curated knowledge bases with AI-driven navigation, we
                empower scientists to focus on breakthrough discoveries while we
                handle the logistical roadmaps.
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">school</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface text-sm">Institutional Authority</p>
                  <p className="text-on-surface-variant text-xs">Backed by UAB&apos;s research infrastructure.</p>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-lg">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-bold text-xl shrink-0">
                  JC
                </div>
                <div>
                  <p className="font-bold text-on-surface">Prof. Jake Chen</p>
                  <span className="inline-block bg-secondary-container text-on-secondary-container font-label-sm text-label-sm px-2 py-0.5 rounded-full">
                    Top 100 AI Leader
                  </span>
                </div>
              </div>
              <p className="text-on-surface-variant font-body-md text-body-md italic leading-relaxed">
                &ldquo;Our goal is to turn the daunting journey of research into
                a guided path toward clinical and societal impact.&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* ── Feature Cards ─────────────────────────────────────── */}
        <section className="py-xl px-gutter bg-surface-container-low">
          <div className="max-w-[1280px] mx-auto grid md:grid-cols-2 gap-lg">
            {/* Knowledge Hub card */}
            <div className="bg-white rounded-xl border border-surface-container-high p-lg flex flex-col gap-4 hover:shadow-lg transition-all group cursor-pointer">
              <div className="w-12 h-12 bg-secondary-container rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-2xl">menu_book</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Knowledge Hub</h3>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                An editorial-first repository featuring scientific wikis,{" "}
                <strong className="text-on-surface">peer-reviewed podcasts</strong>, and deep-dive case studies into
                successful research commercialization.
              </p>
              <div className="flex flex-col gap-2 text-sm text-on-surface-variant">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                  200+ Research Case Studies
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[16px]">check_circle</span>
                  Bi-weekly Podcast Episodes
                </div>
              </div>
              <Link
                href="/knowledge-hub"
                className="flex items-center gap-2 text-primary font-bold font-label-sm text-label-sm group-hover:gap-3 transition-all mt-auto"
              >
                Browse Knowledge
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>

            {/* Navigator card */}
            <div className="bg-primary rounded-xl p-lg flex flex-col gap-4 hover:shadow-lg transition-all group cursor-pointer">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-2xl">explore</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-white">Research Navigator</h3>
              <p className="font-body-md text-body-md text-on-primary/80 leading-relaxed">
                An AI-powered tool that generates personalized roadmaps. Input your current phase to
                discover providers, funding, and collaboration milestones.
              </p>
              <div className="flex flex-col gap-2 text-sm text-on-primary/70">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-primary text-[16px]">check_circle</span>
                  AI-Generated Milestones
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-primary text-[16px]">check_circle</span>
                  Real-time Provider Directory
                </div>
              </div>
              <Link
                href="/navigator"
                className="flex items-center gap-2 text-white font-bold font-label-sm text-label-sm group-hover:gap-3 transition-all mt-auto"
              >
                Start Navigating
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────────────── */}
        <section className="py-xl px-gutter bg-background">
          <div className="max-w-[1280px] mx-auto">
            <div className="text-center mb-lg">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-2">The Journey</h2>
              <p className="text-on-surface-variant font-body-md text-body-md">
                Your path from initial data to published impact.
              </p>
            </div>

            <div className="relative flex flex-col md:flex-row justify-between items-center gap-gutter">
              <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-px border-t-2 border-dashed border-outline-variant" />

              {[
                { num: "1", title: "Profile Identity", desc: "Define your research area and current assets." },
                { num: "2", title: "AI Mapping", desc: "Our engine calculates the most efficient regulatory and data path." },
                { num: "3", title: "Collaborate", desc: "Connect with verified service providers and labs." },
                { num: "4", title: "Deployment", desc: "Launch your project with full institutional alignment.", active: true },
              ].map((step) => (
                <div key={step.num} className="relative z-10 flex flex-col items-center text-center max-w-[220px]">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold mb-4 border-2 border-primary ${
                      step.active ? "bg-primary text-white" : "bg-white text-primary"
                    }`}
                  >
                    {step.num}
                  </div>
                  <p className="font-bold text-on-surface text-sm mb-1">{step.title}</p>
                  <p className="text-on-surface-variant text-xs leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Partners ──────────────────────────────────────────── */}
        <section className="py-lg px-gutter border-t border-outline-variant bg-surface-container-low">
          <div className="max-w-[1280px] mx-auto">
            <p className="text-center font-label-sm text-label-sm text-on-surface-variant mb-8 uppercase tracking-widest">
              Institutional Partners
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-60">
              {["SPARC", "AI.MED LAB", "UAB MEDICINE", "CCTS"].map((p) => (
                <span key={p} className="font-bold text-lg text-on-surface-variant tracking-tight">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
