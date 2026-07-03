"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { track } from "@/lib/posthog";

// ── Types ─────────────────────────────────────────────────────────────────────

type ProjectSummary = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

type ListState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; projects: ProjectSummary[] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NavigatorHubPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [list, setList] = useState<ListState>({ status: "loading" });
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    track("navigator_opened"); // fire-and-forget on page load
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    setList({ status: "loading" });
    (async () => {
      try {
        const res = await fetch("/api/projects");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setList({ status: "error" });
          return;
        }
        setList({ status: "ready", projects: (data.projects ?? []) as ProjectSummary[] });
      } catch {
        if (!cancelled) setList({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) {
        setDeletingId(null);
        setConfirmingId(null);
        return;
      }
      setList((prev) =>
        prev.status === "ready"
          ? { status: "ready", projects: prev.projects.filter((p) => p.id !== id) }
          : prev,
      );
    } catch {
      // leave the card in place on failure
    } finally {
      setDeletingId(null);
      setConfirmingId(null);
    }
  }

  // ── Auth gate (unchanged behaviour, SHELL Nav) ────────────────────────────

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
        <Nav />
        <main className="flex-grow flex items-center justify-center px-4 py-xl">
          <div className="max-w-md w-full text-center flex flex-col items-center gap-6 bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ backgroundColor: "rgba(30, 107, 82, 0.1)" }}>
              <span className="material-symbols-outlined text-4xl text-primary">lock</span>
            </div>
            <div className="space-y-2">
              <h2 className="font-headline-md text-headline-md text-on-surface">Restricted Access</h2>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Sign in to access the Navigator and generate your AI-driven research proposals.
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
                <Link href="/register" className="font-bold text-primary hover:underline">
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

  // ── Hub ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Nav />
      <main className="flex-grow w-full max-w-[960px] mx-auto px-4 sm:px-margin py-xl space-y-12">
        {/* Section 1 — Start a New Proposal */}
        <section>
          <div className="relative overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 shadow-sm">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-primary text-4xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  rocket_launch
                </span>
                <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
                  Start a New Proposal
                </h1>
              </div>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg">
                Describe your project and generate a phased discovery plan — matched providers,
                relevant research, and a document you can save and export.
              </p>
              <Link
                href="/navigator/new"
                className="inline-flex mt-2 px-8 py-3 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary-container transition-all items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                New Proposal
              </Link>
            </div>

            {/* Decorative panel (no external image — CSP-safe, honest) */}
            <div className="hidden md:flex w-40 h-40 rounded-xl bg-secondary-container/40 border border-outline-variant items-center justify-center shrink-0">
              <span
                className="material-symbols-outlined text-primary text-[72px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                network_intelligence
              </span>
            </div>
          </div>
        </section>

        {/* Section 2 — Saved Projects */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-on-surface">Saved Projects</h2>
          </div>

          {list.status === "loading" && (
            <div className="flex flex-col gap-4">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-xl border border-outline-variant bg-surface-container-low animate-pulse"
                />
              ))}
            </div>
          )}

          {list.status === "error" && (
            <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 flex items-center justify-between gap-4">
              <p className="text-sm text-on-surface-variant">
                Couldn&rsquo;t load your saved projects.
              </p>
              <button
                onClick={() => {
                  // re-trigger the effect by bouncing loading state
                  setList({ status: "loading" });
                  fetch("/api/projects")
                    .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
                    .then(({ ok, d }) =>
                      setList(ok ? { status: "ready", projects: d.projects ?? [] } : { status: "error" }),
                    )
                    .catch(() => setList({ status: "error" }));
                }}
                className="text-sm font-semibold text-primary hover:underline shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {list.status === "ready" && list.projects.length === 0 && (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-10 text-center flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-surface-container-lowest shadow-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-[32px]">
                  bookmark
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-headline-md text-[20px] text-on-surface">No saved proposals yet</h3>
                <p className="text-sm text-on-surface-variant max-w-sm">
                  Start your first one — generate a phased plan and save it here to reopen anytime.
                </p>
              </div>
              <Link
                href="/navigator/new"
                className="inline-flex px-6 py-2.5 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:bg-primary-container transition-all items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Start a New Proposal
              </Link>
            </div>
          )}

          {list.status === "ready" && list.projects.length > 0 && (
            <div className="flex flex-col gap-4">
              {list.projects.map((project) => {
                const isConfirming = confirmingId === project.id;
                const isDeleting = deletingId === project.id;
                return (
                  <div
                    key={project.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/navigator/proposal?id=${project.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/navigator/proposal?id=${project.id}`);
                      }
                    }}
                    className="group cursor-pointer bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/50 hover:shadow-md transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-body-lg text-body-lg font-bold text-on-surface truncate">
                        {project.title || "Untitled proposal"}
                      </h3>
                      <div className="flex items-center gap-2 pt-1 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                        <span className="font-label-sm text-label-sm">
                          Saved {fmtDate(project.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isConfirming ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-on-surface-variant">Delete?</span>
                          <button
                            onClick={() => handleDelete(project.id)}
                            disabled={isDeleting}
                            className="px-3 py-2 rounded-lg bg-error text-on-error font-label-sm text-label-sm hover:opacity-90 transition-all disabled:opacity-60"
                          >
                            {isDeleting ? "Deleting…" : "Yes, delete"}
                          </button>
                          <button
                            onClick={() => setConfirmingId(null)}
                            disabled={isDeleting}
                            className="px-3 py-2 rounded-lg border border-outline text-on-surface-variant font-label-sm text-label-sm hover:bg-surface-container-low transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <Link
                            href={`/navigator/proposal?id=${project.id}`}
                            className="px-6 py-2 border border-primary text-primary font-label-md text-label-md rounded-xl hover:bg-primary hover:text-on-primary transition-colors"
                          >
                            View Project
                          </Link>
                          <button
                            onClick={() => setConfirmingId(project.id)}
                            aria-label="Delete project"
                            title="Delete project"
                            className="p-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/5 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
