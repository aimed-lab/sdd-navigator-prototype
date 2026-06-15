"use client";

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";

const SPACES = [
  {
    key: "target",
    href: "/navigator/target",
    icon: "balance",
    iconColor: "text-primary",
    iconBg: "rgba(30, 107, 82, 0.1)",
    category: "Biology & Disease",
    categoryColor: "text-primary",
    title: "Target Space",
    description:
      "Rank and assess biological targets for your disease using AI-driven scoring across multiple criteria.",
    have: "Disease hypothesis, gene candidates, protein targets, omics data",
    ctaColor: "text-primary",
  },
  {
    key: "discovery",
    href: "/navigator/discovery",
    icon: "science",
    iconColor: "text-[#0d9488]",
    iconBg: "rgba(13, 148, 136, 0.1)",
    category: "Chemistry & Compounds",
    categoryColor: "text-[#0d9488]",
    title: "Discovery Space",
    description:
      "Discover and optimize chemical compounds through AI-guided virtual screening, repositioning and natural compound analysis.",
    have: "Validated target, existing drugs to reposition, natural compounds, hit compounds",
    ctaColor: "text-[#0d9488]",
  },
  {
    key: "validation",
    href: "/navigator/validation",
    icon: "verified_user",
    iconColor: "text-[#f59e0b]",
    iconBg: "rgba(245, 158, 11, 0.1)",
    category: "Wet Lab & Preclinical",
    categoryColor: "text-[#f59e0b]",
    title: "Validation Space",
    description:
      "Validate your candidate across biological contexts from protein binding to organism level studies.",
    have: "Lead compound, hit candidate, synthesis ready compound",
    ctaColor: "text-[#f59e0b]",
  },
];

export default function NavigatorPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex items-center justify-center px-4 py-xl">
          <div className="max-w-md w-full text-center flex flex-col items-center gap-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(30, 107, 82, 0.1)" }}
            >
              <span className="material-symbols-outlined text-4xl text-primary">
                lock
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="font-headline-md text-headline-md text-on-surface">
                Restricted Access
              </h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Sign in to access the Navigator and generate your AI-driven
                research roadmap.
              </p>
            </div>
            <div className="flex flex-col w-full gap-3">
              <Link
                href="/login?callbackUrl=/navigator"
                className="w-full py-3.5 rounded-lg font-bold flex items-center justify-center gap-2 bg-primary text-on-primary hover:opacity-90 transition-all"
              >
                <span className="material-symbols-outlined text-xl">login</span>
                Sign In to Continue
              </Link>
              <p className="text-sm text-on-surface-variant">
                New to SDD Navigator?{" "}
                <Link
                  href="/register"
                  className="font-bold text-primary hover:underline"
                >
                  Register for an account
                </Link>
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-md py-xl">
        {/* Breadcrumb */}
        <nav className="mb-lg flex items-center gap-2 text-label-sm font-label-sm text-on-surface-variant">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span className="material-symbols-outlined text-[14px]">chevron_right</span>
          <span className="text-primary font-bold">Navigator</span>
        </nav>

        {/* Hero */}
        <div className="mb-xl text-center md:text-left">
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-sm">
            Where are you in your research journey?
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto md:mx-0">
            Select your research space to get a personalized AI-driven
            roadmap. Our ecosystem bridges the gap between hypothesis and
            clinical validation.
          </p>
        </div>

        {/* Space cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {SPACES.map((space) => (
            <Link
              key={space.key}
              href={space.href}
              className="group relative bg-surface-container-lowest border border-outline-variant rounded-xl p-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col h-full"
            >
              <div
                className="mb-md p-sm rounded-lg inline-flex"
                style={{ backgroundColor: space.iconBg }}
              >
                <span className={`material-symbols-outlined text-[32px] ${space.iconColor}`}>
                  {space.icon}
                </span>
              </div>
              <div className={`mb-xs font-label-sm text-label-sm uppercase tracking-widest ${space.categoryColor}`}>
                {space.category}
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-sm">
                {space.title}
              </h3>
              <p className="text-on-surface-variant font-body-md mb-md flex-grow">
                {space.description}
              </p>
              <div className="bg-surface-container-low rounded-lg p-sm mb-lg border border-outline-variant/30">
                <span className="font-label-sm text-label-sm block mb-xs text-on-surface-variant">
                  WHAT YOU MIGHT HAVE:
                </span>
                <p className="text-label-sm text-on-surface font-medium">
                  {space.have}
                </p>
              </div>
              <div className="flex items-center justify-between mt-auto">
                <span className={`flex items-center gap-1 font-bold font-body-md group-hover:translate-x-2 transition-transform duration-300 ${space.ctaColor}`}>
                  Select {space.title}
                  <span className="material-symbols-outlined">arrow_right_alt</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
