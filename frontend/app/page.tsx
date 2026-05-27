import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <div className="bg-background text-on-surface">
      <Navbar />

      <main>
        {/* ── Hero Section ──────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-surface pt-stack-lg pb-stack-lg px-margin-desktop">
          <div className="max-w-container-max mx-auto grid lg:grid-cols-2 gap-gutter items-center min-h-[480px]">
            {/* Left copy */}
            <div className="z-10">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-md text-label-md mb-stack-md">
                <span
                  className="material-symbols-outlined mr-1 text-[16px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified
                </span>
                Powered by UAB SPARC
              </span>
              <h1 className="font-display-lg text-display-lg text-on-surface mb-stack-md leading-tight">
                From Discovery to Destination
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg mb-stack-lg">
                Tell us where you are in your research journey and where you
                want to go. SDD Navigator maps your personalized path — with
                every tool, resource, and service provider you need at each
                step.
              </p>
              <div className="flex flex-wrap gap-stack-md">
                <Link href="/knowledge-hub">
                  <button className="bg-primary-container text-on-primary px-8 py-4 rounded-lg font-title-md text-title-md shadow-sm hover:bg-primary transition-all">
                    Explore Knowledge Hub
                  </button>
                </Link>
                <Link href="/navigator">
                  <button className="border border-primary-container text-primary-container px-8 py-4 rounded-lg font-title-md text-title-md hover:bg-primary-container/5 transition-all">
                    Try Navigator
                  </button>
                </Link>
              </div>
            </div>

            {/* Right decorative */}
            <div className="relative hidden lg:block h-[460px]">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary-container/10 to-transparent rounded-full blur-3xl -z-10" />
              <div className="w-full h-full rounded-xl bg-surface-container-highest border border-outline-variant flex items-center justify-center overflow-hidden">
                <div className="text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-[80px] text-primary/30 block mb-4">
                    biotech
                  </span>
                  <p className="font-label-md text-label-md text-on-surface-variant/50 tracking-widest uppercase">
                    Clinical &amp; Translational Science
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Bar ─────────────────────────────────────────── */}
        <section className="bg-surface-container-low border-y border-outline-variant py-stack-md">
          <div className="max-w-container-max mx-auto px-margin-desktop grid grid-cols-2 md:grid-cols-4 gap-gutter text-center">
            {[
              { value: "500+", label: "Researchers" },
              { value: "58+", label: "Episodes" },
              { value: "30+", label: "Service Providers" },
              { value: "12", label: "Countries" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-headline-md text-headline-md text-primary">
                  {stat.value}
                </div>
                <div className="font-label-md text-label-md text-on-surface-variant">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features Bento ────────────────────────────────────── */}
        <section className="py-stack-lg px-margin-desktop bg-background">
          <div className="max-w-container-max mx-auto">
            <div className="mb-stack-lg">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">
                Integrated Research Ecosystem
              </h2>
              <p className="text-on-surface-variant font-body-md mt-2">
                Connecting literature, experts, and data to streamline the
                discovery pipeline.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-gutter">
              {[
                {
                  icon: "menu_book",
                  title: "Knowledge Hub",
                  desc: "Access a curated repository of scientific literature, podcast episodes, and clinical case studies curated by UAB experts.",
                  href: "/knowledge-hub",
                  linkLabel: "Explore library",
                },
                {
                  icon: "explore",
                  title: "Navigator",
                  desc: "Leverage our AI-driven navigation engine to generate a comprehensive roadmap for your specific research goals.",
                  href: "/navigator",
                  linkLabel: "Start navigation",
                },
                {
                  icon: "hub",
                  title: "Knowledge Graph",
                  desc: "Visualize multidimensional connections between concepts, institutions, and clinical outcomes across global datasets.",
                  href: "/graph",
                  linkLabel: "View Graph",
                },
              ].map((feature) => (
                <div key={feature.title} className="academic-card p-stack-md flex flex-col">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <span className="material-symbols-outlined text-3xl">
                      {feature.icon}
                    </span>
                  </div>
                  <h3 className="font-title-lg text-title-lg mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-on-surface-variant text-body-sm mb-stack-md flex-grow">
                    {feature.desc}
                  </p>
                  <Link
                    href={feature.href}
                    className="text-primary font-title-md flex items-center gap-1 hover:underline"
                  >
                    {feature.linkLabel}
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────────────── */}
        <section className="py-stack-lg bg-surface-container-low overflow-hidden">
          <div className="max-w-container-max mx-auto px-margin-desktop">
            <div className="text-center mb-stack-lg">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">
                Your Research Journey, Mapped
              </h2>
              <p className="text-on-surface-variant max-w-xl mx-auto">
                Four steps to take your research from asset to outcome
              </p>
            </div>

            <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-gutter">
              {/* Connector line (desktop) */}
              <div className="hidden md:block absolute top-[40px] left-0 w-full h-[1px] dotted-line -z-0" />

              {[
                {
                  num: "1",
                  title: "Share What You Have",
                  desc: "Tell us your research asset — protein target, dataset, compound, or biomarker",
                  active: false,
                },
                {
                  num: "2",
                  title: "Define Your Goal",
                  desc: "Tell us where you want to go — IND filing, clinical trial, publication, or validation",
                  active: false,
                },
                {
                  num: "3",
                  title: "Get Your Roadmap",
                  desc: "AI generates your personalized step-by-step path with tools and resources at each stage",
                  active: false,
                },
                {
                  num: "4",
                  title: "Connect with Providers",
                  desc: "Get matched with global service providers who can help you at every stage",
                  active: true,
                },
              ].map((step) => (
                <div
                  key={step.num}
                  className="relative z-10 flex flex-col items-center text-center max-w-[240px] w-full"
                >
                  <div
                    className={`w-16 h-16 rounded-full border-2 border-primary-container flex items-center justify-center font-headline-md text-2xl mb-4 shadow-sm ${
                      step.active
                        ? "bg-primary-container text-on-primary"
                        : "bg-white text-primary-container"
                    }`}
                  >
                    {step.num}
                  </div>
                  <h4 className="font-title-md text-title-md mb-2">
                    {step.title}
                  </h4>
                  <p className="text-body-sm text-on-surface-variant">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Partners Row ──────────────────────────────────────── */}
        <section className="py-16 px-margin-desktop bg-white border-t border-outline-variant">
          <div className="max-w-container-max mx-auto">
            <p className="text-center font-label-md text-label-md text-on-surface-variant/60 uppercase tracking-[0.2em] mb-stack-md">
              Strategic Institutional Partners
            </p>
            <div className="flex flex-wrap justify-center items-center gap-16 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
              {[
                { abbr: "S", name: "SPARC", shape: "rounded-full" },
                { abbr: "AI", name: "AI.MED LAB", shape: "rounded" },
                { abbr: "U", name: "UAB MEDICINE", shape: "rounded-full" },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <div
                    className={`w-10 h-10 bg-on-surface/10 ${p.shape} flex items-center justify-center font-bold`}
                  >
                    {p.abbr}
                  </div>
                  <span className="font-bold text-xl tracking-tighter">
                    {p.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
