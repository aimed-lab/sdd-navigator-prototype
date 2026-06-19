import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <div className="bg-background text-on-surface min-h-screen">
      <Navbar />

      <main>
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="py-10 md:py-xl px-gutter bg-background">
          <div className="max-w-[1280px] mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-1.5 rounded-full font-label-sm text-label-sm mb-6 md:mb-8 uppercase tracking-wider">
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
              Powered by UAB SPARC
            </div>

            <h1 className="font-bold text-[28px] leading-tight md:text-display-lg md:font-display-lg text-primary mb-4 md:mb-6 max-w-3xl mx-auto">
              From Discovery to Destination
            </h1>

            <p className="text-base md:font-body-lg md:text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-8 md:mb-10">
              Tell us where you are in your research journey and where you want
              to go. We provide the roadmap, data, and community to get you
              there.
            </p>

            {/* Buttons: stack full-width on mobile, row on sm+ */}
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 sm:px-0">
              <Link href="/knowledge-hub" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 min-h-[48px] bg-primary text-on-primary rounded-full font-bold hover:bg-primary-container transition-all active:scale-95 shadow-sm">
                  Explore Knowledge Hub
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto flex items-center justify-center px-8 py-3.5 min-h-[48px] rounded-full border border-outline text-primary font-semibold hover:bg-surface-container-low transition-all active:scale-95">
                  Sign In
                </button>
              </Link>
            </div>

            {/* Hero visual — brand gradient panel (no stock photography) */}
            <div className="max-w-5xl mx-auto mt-16 md:mt-20 relative rounded-xl overflow-hidden border border-outline-variant shadow-xl">
              <div
                className="aspect-video w-full flex items-center justify-center relative"
                style={{ background: "linear-gradient(135deg, #00523c 0%, #1e6b52 60%, #0d9488 100%)" }}
              >
                <span className="material-symbols-outlined text-white/15 text-[140px] md:text-[200px]">hub</span>
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Bar — 2×2 on mobile, 4 cols on md+ ─────────── */}
        <section className="bg-primary py-md px-gutter">
          <div className="max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "500+", label: "Researchers" },
              { value: "58+",  label: "Episodes" },
              { value: "30+",  label: "Service Providers" },
              { value: "12",   label: "Countries" },
            ].map((stat) => (
              <div key={stat.label} className="py-2">
                <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
                <div className="font-label-sm text-label-sm text-on-primary/70 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── About / Quote ─────────────────────────────────────── */}
        <section className="py-10 md:py-xl px-gutter bg-background">
          <div className="max-w-[1280px] mx-auto grid md:grid-cols-2 gap-8 md:gap-lg items-center">
            <div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-4">
                Accelerating Academic Innovation
              </h2>
              <p className="text-base md:font-body-lg md:text-body-lg text-on-surface-variant mb-6 leading-relaxed">
                The SDD Navigator is an institutional bridge designed to
                demystify the complex ecosystem of academic research. By
                combining curated knowledge bases with AI-driven navigation, we
                empower scientists to focus on breakthrough discoveries while we
                handle the logistical roadmaps.
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-secondary-container rounded-full flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary">school</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface text-sm">Institutional Authority</p>
                  <p className="text-on-surface-variant text-xs">Backed by UAB&apos;s research infrastructure.</p>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-low border border-outline-variant rounded-xl p-6 md:p-lg">
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

        {/* ── Feature Cards — two centered pillars ──────────────── */}
        <section className="py-10 md:py-xl px-gutter bg-surface-container-low">
          <div className="max-w-[1280px] mx-auto">
            <div className="flex flex-col items-center text-center mb-8 md:mb-lg">
              <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Core Intelligence Pillars</h2>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
                Every stage of the drug discovery lifecycle supported by specialized analytical modules.
              </p>
            </div>

            <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-lg">
              {/* Knowledge Hub card */}
              <Link href="/knowledge-hub">
                <div className="bg-white rounded-xl border border-outline-variant p-6 md:p-lg flex flex-col gap-4 hover:shadow-md transition-all group cursor-pointer h-full">
                  <div className="w-12 h-12 bg-secondary-container rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-on-secondary-container text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-primary">Knowledge Hub</h3>
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
                  <div className="flex items-center gap-2 text-primary font-bold font-label-sm text-label-sm group-hover:gap-3 transition-all mt-auto">
                    Learn &amp; Discover
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </div>
                </div>
              </Link>

              {/* Navigator card */}
              <Link href="/navigator">
                <div className="bg-primary rounded-xl p-6 md:p-lg flex flex-col gap-4 hover:shadow-md transition-all group cursor-pointer h-full">
                  <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>explore</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-white">Navigator</h3>
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
                  <div className="flex items-center gap-2 text-white font-bold font-label-sm text-label-sm group-hover:gap-3 transition-all mt-auto">
                    Plan &amp; Act
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* ── We're the intelligence layer ──────────────────────── */}
        <section className="py-10 md:py-xl px-gutter bg-background overflow-hidden">
          <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="relative">
              <div className="aspect-square rounded-3xl overflow-hidden border border-outline-variant shadow-lg academic-grid-pattern flex items-center justify-center">
                <span className="material-symbols-outlined text-primary/15 text-[160px] md:text-[220px]">shield_lock</span>
              </div>
              {/* Floating stat card */}
              <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-2xl shadow-xl border border-outline-variant max-w-[240px]">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-primary text-[32px]">verified_user</span>
                  <span className="font-headline-md text-headline-md text-primary">100% Secure</span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Your files stay on your own secure storage; we manage the intelligence layer.
                </p>
              </div>
            </div>

            <div className="flex flex-col">
              <h2 className="font-headline-lg text-headline-lg text-primary mb-4">We&apos;re the intelligence layer</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mb-8 leading-relaxed">
                The SDD Navigator functions as a sophisticated neural network for research institutions.
                While your raw data remains safely behind your firewall on institutional storage, our
                platform provides the connective tissue that manages, analyzes, tracks, and connects
                findings across the global network.
              </p>
              <ul className="space-y-6">
                {[
                  { title: "Decentralized Management", desc: "No centralized data silos. You maintain complete ownership and sovereignty over your research files." },
                  { title: "Advanced Connectivity", desc: "Real-time tracking of research progress and automated discovery of complementary studies worldwide." },
                  { title: "Intelligent Analysis", desc: "High-performance computational layers that analyze meta-data to predict research outcomes." },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-4">
                    <div className="mt-1 w-6 h-6 rounded-full bg-primary-fixed flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'wght' 700" }}>check</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-primary">{item.title}</h4>
                      <p className="text-on-surface-variant text-sm">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Green CTA Band ─────────────────────────────────────── */}
        <section className="bg-primary py-12 md:py-16 px-gutter text-on-primary">
          <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h2 className="font-headline-lg text-headline-lg text-white mb-2">Join the Global Research Network</h2>
              <p className="font-body-lg text-body-lg text-white/80 max-w-xl">
                Start collaborating with top-tier drug discovery scientists and accelerate your discovery timeline today.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 shrink-0 w-full md:w-auto">
              <Link href="/register" className="w-full sm:w-auto">
                <button className="w-full bg-white text-primary font-bold font-label-md text-label-md px-10 py-4 rounded-full hover:bg-surface-container-low transition-all shadow-lg text-center">
                  Create a free account
                </button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <button className="w-full border border-white/50 text-white font-bold font-label-md text-label-md px-10 py-4 rounded-full hover:bg-primary-container transition-all text-center">
                  Sign in
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── How It Works — vertical stack on mobile ───────────── */}
        <section className="py-10 md:py-xl px-gutter bg-background">
          <div className="max-w-[1280px] mx-auto">
            <div className="text-center mb-8 md:mb-lg">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-2">The Journey</h2>
              <p className="text-on-surface-variant font-body-md text-body-md">
                Your path from initial data to published impact.
              </p>
            </div>

            <div className="relative flex flex-col md:flex-row justify-between items-center gap-6 md:gap-gutter">
              {/* Connector — desktop only */}
              <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-px border-t-2 border-dashed border-outline-variant" />
              {/* Connector — mobile vertical line */}
              <div className="md:hidden absolute left-7 top-[56px] bottom-[56px] w-px border-l-2 border-dashed border-outline-variant" />

              {[
                { num: "1", title: "Profile Identity", desc: "Define your research area and current assets." },
                { num: "2", title: "AI Mapping", desc: "Our engine calculates the most efficient regulatory and data path." },
                { num: "3", title: "Collaborate", desc: "Connect with verified service providers and labs." },
                { num: "4", title: "Deployment", desc: "Launch your project with full institutional alignment.", active: true },
              ].map((step) => (
                <div key={step.num} className="relative z-10 flex md:flex-col items-center md:text-center gap-4 md:gap-0 w-full md:w-auto md:max-w-[220px]">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold shrink-0 border-2 border-primary md:mb-4 ${
                      step.active ? "bg-primary text-white" : "bg-white text-primary"
                    }`}
                  >
                    {step.num}
                  </div>
                  <div className="text-left md:text-center">
                    <p className="font-bold text-on-surface text-sm mb-1">{step.title}</p>
                    <p className="text-on-surface-variant text-xs leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Partners — wrap to 2 cols on mobile ───────────────── */}
        <section className="py-8 md:py-lg px-gutter border-t border-outline-variant bg-surface-container-low">
          <div className="max-w-[1280px] mx-auto">
            <p className="text-center font-label-sm text-label-sm text-on-surface-variant mb-6 md:mb-8 uppercase tracking-widest">
              Institutional Partners
            </p>
            <div className="grid grid-cols-2 md:flex md:flex-wrap justify-center items-center gap-6 md:gap-12 opacity-60">
              {["SPARC", "AI.MED LAB", "UAB MEDICINE", "CCTS"].map((p) => (
                <span key={p} className="font-bold text-base md:text-lg text-on-surface-variant tracking-tight text-center">
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
