import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ParticleCanvas from "@/components/ParticleCanvas";

export default function LandingPage() {
  return (
    <>
      {/* Background */}
      <div className="molecule-grid fixed inset-0 pointer-events-none -z-10" />
      <ParticleCanvas />

      <Navbar />

      <main className="pt-32">
        {/* Hero Section */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-16 mb-24 relative">
          <div className="max-w-3xl">
            {/* Status */}
            <div className="flex items-center gap-2 mb-6">
              <span className="relative flex h-3 w-3">
                <span className="status-pulse-ring absolute inline-flex h-full w-full rounded-full bg-status-pulse opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-status-pulse" />
              </span>
              <span className="font-data-label text-data-label uppercase tracking-widest text-primary-fixed-dim">
                System Status: Optimal
              </span>
            </div>

            <h1 className="font-display-lg text-display-lg text-white mb-6 leading-tight">
              You have A.<br />
              <span className="text-primary-container">
                We find your path to D.
              </span>
            </h1>

            <p className="font-body-md text-body-md text-on-surface-variant mb-10 max-w-2xl">
              The global research roadmap platform — connect your assets to your
              goals with AI-powered guidance and matched service providers
              worldwide.
            </p>

            <div className="flex flex-col md:flex-row gap-6">
              <Link href="/knowledge-hub">
                <button className="bg-primary-container text-on-primary-container px-8 py-4 rounded-xl font-headline-lg text-headline-lg flex items-center justify-center gap-2 glow-primary transition-all active:scale-95">
                  Explore Knowledge Hub
                  <span className="material-symbols-outlined">
                    arrow_forward
                  </span>
                </button>
              </Link>
              <Link href="/navigator">
                <button className="glass-card text-primary px-8 py-4 rounded-xl font-headline-lg text-headline-lg flex items-center justify-center gap-2 hover:bg-white/5 transition-all active:scale-95">
                  Try Navigator
                </button>
              </Link>
            </div>
          </div>

          {/* Hero Decorative */}
          <div className="hidden lg:block absolute top-0 right-16 w-[500px] h-[500px]">
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary-container/20 to-transparent blur-3xl" />
          </div>
        </section>

        {/* Stats Bar */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-16 mb-24">
          <div className="glass-card rounded-2xl py-8 px-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: "500+", label: "Researchers" },
              { value: "50+", label: "Wiki Pages" },
              { value: "30+", label: "Service Providers" },
              { value: "12", label: "Countries" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className={`flex flex-col gap-1 ${i > 0 ? "border-l border-[rgba(255,255,255,0.1)]" : ""}`}
              >
                <span className="font-headline-lg text-headline-lg text-primary-fixed">
                  {stat.value}
                </span>
                <span className="font-data-label text-data-label text-on-surface-variant uppercase">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-16 mb-32">
          <div className="mb-12">
            <span className="font-data-label text-data-label text-primary-container uppercase tracking-widest">
              Platform Core
            </span>
            <h2 className="font-headline-lg text-headline-lg text-white mt-2">
              Precision Scientific Architecture
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "explore",
                title: "Intelligent Navigator",
                desc: "Automated pathfinding from initial research assets to clinical outcomes using AI-driven logic models.",
                href: "/navigator",
              },
              {
                icon: "menu_book",
                title: "Knowledge Hub",
                desc: "A curated repository of biological assets, methodologies, and cross-disciplinary scientific insights.",
                href: "/knowledge-hub",
              },
              {
                icon: "account_tree",
                title: "Global Graph",
                desc: "Interactive mapping of service providers, researchers, and collaborative entities worldwide.",
                href: "/graph",
              },
            ].map((feature) => (
              <Link key={feature.title} href={feature.href}>
                <div className="glass-card rounded-2xl p-2 flex flex-col h-full group hover:bg-white/5 transition-all duration-300 cursor-pointer">
                  <div className="aspect-video mb-2 overflow-hidden rounded-lg bg-gradient-to-br from-primary/10 to-secondary/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary-container text-[80px] opacity-40">
                      {feature.icon}
                    </span>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-primary-container">
                        {feature.icon}
                      </span>
                      <h3 className="font-headline-lg text-headline-lg text-white">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Affiliates */}
        <section className="max-w-[1440px] mx-auto px-4 md:px-16 mb-24">
          <div className="border-t border-[rgba(255,255,255,0.1)] pt-12 flex flex-col md:flex-row justify-between items-center gap-6">
            <span className="font-data-label text-data-label text-on-surface-variant uppercase tracking-widest">
              Collaborating Partners
            </span>
            <div className="flex items-center gap-12 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center">
                  <span className="font-bold text-on-primary-container">S</span>
                </div>
                <span className="font-headline-lg text-headline-lg text-white font-bold tracking-tighter">
                  SPARC
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 border-2 border-primary rounded-full flex items-center justify-center">
                  <span className="font-bold text-primary">A</span>
                </div>
                <span className="font-headline-lg text-headline-lg text-white font-bold tracking-tighter">
                  AI.MED Lab
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
