import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import LandingLiveStrip from "@/components/LandingLiveStrip";

// Honest, restyled logged-out landing (ports design/landing-logged-out.html).
// No invented metrics, no fake researchers/testimonials, no external stock
// imagery — vision + roadmap only. The live strip pulls the real /api/discover
// feed. Nav/Footer come from the shared shell (SHELL.md).
// Rendered by app/page.tsx only when the visitor is NOT logged in.

const FEATURES = [
  {
    icon: "auto_awesome",
    title: "Proposal Generator",
    desc: "Project in, phased plan out. Automated technical scoping into milestones.",
  },
  {
    icon: "radar",
    title: "Discovery Radar",
    desc: "A live feed of papers, grants, and clinical trials scoped to your work.",
  },
  {
    icon: "handshake",
    title: "Provider Matching",
    desc: "Connect to UAB SPARC and trusted external service providers.",
  },
  {
    icon: "hub",
    title: "Collaborator Graph",
    desc: "Find researchers via the Talent Knowledge Graph.",
    soon: true,
  },
];

const STEPS = [
  {
    icon: "edit_note",
    title: "Describe your project",
    desc: "Input your research goals, targets, and constraints.",
  },
  {
    icon: "account_tree",
    title: "Get a phased plan",
    desc: "Receive a roadmap with matched providers and real-time literature links.",
  },
  {
    icon: "rocket_launch",
    title: "Connect and execute",
    desc: "Activate partnerships and follow the plan through each phase.",
  },
];

export default function LandingLoggedOut() {
  return (
    <div className="bg-background text-on-surface min-h-screen">
      <Nav />

      <main>
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="py-20 md:py-28 px-gutter bg-background">
          <div className="max-w-[1280px] mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full font-label-sm text-label-sm mb-6">
              <span className="material-symbols-outlined text-[16px]">science</span>
              Built at UAB SPARC
            </div>

            <h1 className="font-display-lg text-display-lg text-primary max-w-4xl mx-auto mb-6 tracking-tight">
              AI-driven drug discovery for every researcher
            </h1>

            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">
              Turn your research intent into a phased discovery plan — with matched providers,
              relevant literature, and potential collaborators.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 sm:px-0">
              {/* Primary CTA → sign-up flow (Navigator itself is gated) */}
              <Link href="/register" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-8 py-4 bg-primary text-on-primary rounded-xl font-label-sm text-label-sm shadow-sm hover:bg-primary-container active:scale-95 transition-all flex items-center justify-center gap-2">
                  Start a proposal
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </Link>
              <Link href="/discovery" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-8 py-4 border-2 border-primary text-primary rounded-xl font-label-sm text-label-sm hover:bg-surface-container-low active:scale-95 transition-all">
                  Explore Discovery
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Vision: what it does ──────────────────────────────── */}
        <section className="py-20 md:py-24 px-gutter bg-surface-container-lowest border-y border-outline-variant">
          <div className="max-w-[1280px] mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-center">
            <div>
              <h2 className="font-headline-md text-headline-md text-primary mb-6">What SDD Navigator does</h2>
              <div className="space-y-5 text-on-surface-variant font-body-md text-body-md leading-relaxed">
                <p>
                  SDD Navigator bridges the gap between a biological hypothesis and an actionable plan.
                  It deconstructs high-level research intent into concrete, phased milestones.
                </p>
                <p>
                  The platform does the heavy lifting of project planning, provider sourcing, and
                  literature review — so you can focus on the science.
                </p>
              </div>
            </div>
            {/* Brand gradient panel in place of stock imagery */}
            <div className="rounded-xl overflow-hidden border border-outline-variant shadow-sm">
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

        {/* ── How it works ──────────────────────────────────────── */}
        <section className="py-20 md:py-24 px-gutter bg-background">
          <div className="max-w-[1280px] mx-auto">
            <h2 className="text-center font-headline-md text-headline-md text-primary mb-14">How it works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {STEPS.map((step) => (
                <div key={step.title} className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-primary-fixed rounded-full flex items-center justify-center text-primary mb-6">
                    <span className="material-symbols-outlined text-[32px]">{step.icon}</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-surface mb-2 text-[20px]">{step.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Feature grid ──────────────────────────────────────── */}
        <section className="py-20 md:py-24 px-gutter bg-surface-container-low">
          <div className="max-w-[1280px] mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`p-8 bg-white border rounded-xl hover:shadow-md transition-all ${
                  f.soon ? "border-dashed border-outline-variant opacity-90" : "border-outline-variant"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="material-symbols-outlined text-primary">{f.icon}</span>
                  {f.soon && (
                    <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Soon
                    </span>
                  )}
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface text-[20px] mb-2">{f.title}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Trust anchor (real SPARC credibility, no invented endorsements) ── */}
        <section className="py-12 px-gutter bg-primary text-white">
          <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center gap-8">
            <div className="shrink-0">
              <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[40px]">account_balance</span>
              </div>
            </div>
            <p className="font-body-lg text-body-lg leading-relaxed">
              Built at UAB&apos;s{" "}
              <span className="font-bold">Systems Pharmacology &amp; AI Research Center (SPARC)</span>, directed by
              Prof. Jake Chen — advancing AI-driven drug discovery through open collaboration and data science.
            </p>
          </div>
        </section>

        {/* ── Live content strip (real /api/discover) ───────────── */}
        <LandingLiveStrip />

        {/* ── Horizon / roadmap ─────────────────────────────────── */}
        <section className="py-16 px-gutter bg-surface-container-lowest border-y border-outline-variant">
          <div className="max-w-[1280px] mx-auto text-center">
            <h3 className="font-label-sm text-label-sm text-primary uppercase tracking-[0.2em] mb-4">The Horizon</h3>
            <p className="font-headline-md text-headline-md text-on-surface max-w-3xl mx-auto">
              We&apos;re onboarding more service providers and building the Talent Knowledge Graph to connect
              specialized expertise with research projects.
            </p>
          </div>
        </section>

        {/* ── Final CTA → sign-up ───────────────────────────────── */}
        <section className="py-20 md:py-24 px-gutter bg-background text-center">
          <div className="max-w-[1280px] mx-auto">
            <h2 className="font-display-lg text-display-lg text-primary mb-8">Ready to accelerate your discovery?</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-10 py-4 bg-primary text-on-primary rounded-xl font-label-sm text-label-sm shadow-md hover:bg-primary-container active:scale-95 transition-all">
                  Create a free account
                </button>
              </Link>
              <Link href="/login?callbackUrl=/" className="w-full sm:w-auto">
                <button className="w-full sm:w-auto px-10 py-4 border-2 border-primary text-primary rounded-xl font-label-sm text-label-sm hover:bg-surface-container-low active:scale-95 transition-all">
                  Log in
                </button>
              </Link>
            </div>
            <p className="mt-6 font-label-sm text-label-sm text-on-surface-variant">Free — open to all researchers.</p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
