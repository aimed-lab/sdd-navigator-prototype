"use client";

import { useState } from "react";

type FeedbackType = "Bug Report" | "Feature Request" | "Content Issue";
type Status = "idle" | "loading" | "success" | "error";

const FEEDBACK_TYPES: FeedbackType[] = ["Bug Report", "Feature Request", "Content Issue"];

const PRIMARY   = "#1E6B52";
const PRIMARY_D = "#144B39";

const inputCls =
  "w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface " +
  "font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant " +
  "focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all";

export default function FeedbackButton() {
  const [open, setOpen]        = useState(false);
  const [type, setType]        = useState<FeedbackType>("Bug Report");
  const [title, setTitle]      = useState("");
  const [description, setDesc] = useState("");
  const [status, setStatus]    = useState<Status>("idle");

  function reset() {
    setType("Bug Report");
    setTitle("");
    setDesc("");
    setStatus("idle");
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 200);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const res = await fetch("/api/feedback", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ type, title, description }),
    });
    if (res.ok) {
      setStatus("success");
      setTimeout(close, 2000);
    } else {
      setStatus("error");
    }
  }

  return (
    <>
      {/* ── Floating pill button ──────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open feedback form"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-2.5 rounded-full shadow-lg font-bold font-label-sm text-label-sm text-white transition-colors"
        style={{ background: PRIMARY, fontFamily: "Inter, sans-serif" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = PRIMARY_D; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = PRIMARY; }}
      >
        <span className="material-symbols-outlined text-[18px]">chat</span>
        Feedback
      </button>

      {/* ── Modal ────────────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={close}
        >
          <div
            className="w-full max-w-md bg-white rounded-xl overflow-hidden shadow-2xl"
            style={{ fontFamily: "Inter, sans-serif" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* UAB green accent bar — matches NodePopup pattern */}
            <div className="h-1.5 w-full" style={{ background: PRIMARY }} />

            <div className="p-8">
              {/* ── Success state ──────────────────────────────────────────── */}
              {status === "success" ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <span
                    className="material-symbols-outlined text-6xl"
                    style={{ color: PRIMARY, fontVariationSettings: "'FILL' 1" }}
                  >
                    check_circle
                  </span>
                  <p className="font-headline-md text-headline-md text-on-surface">
                    Thank you!
                  </p>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Feedback submitted successfully.
                  </p>
                </div>
              ) : (
                <>
                  {/* ── Header ─────────────────────────────────────────────── */}
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <span
                        className="inline-block px-2 py-0.5 rounded font-label-sm text-label-sm mb-2 text-white uppercase tracking-widest"
                        style={{ background: PRIMARY }}
                      >
                        SDD Navigator
                      </span>
                      <h2 className="font-headline-md text-headline-md text-on-surface leading-tight">
                        Share Feedback
                      </h2>
                    </div>
                    <button
                      onClick={close}
                      className="text-outline hover:text-on-surface transition-colors p-1 shrink-0"
                      aria-label="Close"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  {/* ── Form ───────────────────────────────────────────────── */}
                  <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Type */}
                    <div className="flex flex-col gap-2">
                      <label className="font-label-sm text-label-sm text-on-surface-variant">
                        Type
                      </label>
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value as FeedbackType)}
                        className={inputCls}
                      >
                        {FEEDBACK_TYPES.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {/* Title */}
                    <div className="flex flex-col gap-2">
                      <label className="font-label-sm text-label-sm text-on-surface-variant">
                        Title
                      </label>
                      <input
                        required
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Brief summary…"
                        className={inputCls}
                      />
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-2">
                      <label className="font-label-sm text-label-sm text-on-surface-variant">
                        Description
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={description}
                        onChange={(e) => setDesc(e.target.value)}
                        placeholder="Describe the issue or idea in detail…"
                        className={`${inputCls} resize-none`}
                      />
                    </div>

                    {/* Error banner */}
                    {status === "error" && (
                      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 font-body-md text-body-md">
                        <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                        Failed to submit. Please try again.
                      </div>
                    )}

                    {/* Actions — match NodePopup button row exactly */}
                    <div className="flex gap-3 pt-1">
                      <button
                        type="submit"
                        disabled={status === "loading"}
                        className="flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 text-white hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
                        style={{ background: PRIMARY }}
                      >
                        {status === "loading" && (
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        )}
                        {status === "loading" ? "Submitting…" : "Submit Feedback"}
                      </button>
                      <button
                        type="button"
                        onClick={close}
                        className="px-6 py-3 rounded-xl font-bold text-sm border border-outline-variant hover:bg-surface-container-low transition-colors text-on-surface-variant"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
