"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

// Real comments table schema: id, user_id, wiki_id, content, created_at
// Joined with users table for: name, affiliation
//
// Required RLS policies:
//   CREATE POLICY "Anyone can view comments" ON comments FOR SELECT USING (true);
//   CREATE POLICY "Authenticated users can insert" ON comments
//     FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

type UserData = { name: string; affiliation: string | null };

type Comment = {
  id: string;
  content: string;
  created_at: string;
  users: UserData | UserData[] | null;
};

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export default function CommentsSection({
  wikiPageId,
}: {
  wikiPageId?: string;
}) {
  const { user, loading: authLoading } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadComments = useCallback(async () => {
    if (!wikiPageId) {
      setLoadingComments(false);
      return;
    }
    setLoadingComments(true);
    setFetchError(null);

    const { data, error } = await supabase
      .from("comments")
      .select("id, content, created_at, users(name, affiliation)")
      .eq("wiki_id", wikiPageId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Comments fetch error:", error);
      setFetchError(`Could not load comments: ${error.message}`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setComments((data as any as Comment[]) ?? []);
    setLoadingComments(false);
  }, [wikiPageId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !content.trim() || !wikiPageId) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    const { error } = await supabase.from("comments").insert({
      wiki_id: wikiPageId,
      user_id: user.id,
      content: content.trim(),
    });

    if (error) {
      console.error("Comment insert error:", error);
      setSubmitError(`Failed to post: ${error.message}`);
    } else {
      setContent("");
      setSubmitSuccess(true);
      await loadComments();
      setTimeout(() => setSubmitSuccess(false), 2000);
    }
    setSubmitting(false);
  }

  return (
    <section className="space-y-md">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined">forum</span>
          Researcher Discussion
        </h2>
        {!loadingComments && (
          <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full font-label-sm text-label-sm">
            {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
          </span>
        )}
      </div>

      {/* ── Input area / login gate ────────────────────────────── */}
      {authLoading ? null : user ? (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl border border-outline-variant p-md flex flex-col gap-4"
        >
          {/* Author row */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {initials(user.user_metadata?.name || user.email?.split("@")[0] || "U")}
            </div>
            <span className="font-label-sm text-label-sm text-primary truncate">
              {user.user_metadata?.name || user.email}
            </span>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your research insights or questions…"
            rows={3}
            className="w-full rounded-xl border border-outline-variant bg-surface p-4 font-body-md text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none placeholder:text-on-surface-variant"
          />

          {/* Error */}
          {submitError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-error-container border border-error/30 text-error font-body-md text-body-md">
              <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">error</span>
              <span>{submitError}</span>
            </div>
          )}

          {/* Success */}
          {submitSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 text-primary font-body-md text-body-md">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Comment posted successfully.
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-6 py-2 bg-primary text-on-primary rounded-full font-bold font-label-sm text-label-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {submitting ? "Posting…" : "Post Insight"}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-xl border-2 border-dashed border-outline-variant p-lg flex flex-col items-center justify-center gap-4 text-center">
          <span className="material-symbols-outlined text-outline text-4xl">lock</span>
          <p className="font-headline-md text-headline-md text-on-surface">Join the Discussion</p>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Please{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              sign in
            </Link>{" "}
            to contribute to this research thread.
          </p>
        </div>
      )}

      {/* ── Comments list ──────────────────────────────────────── */}
      {loadingComments ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : fetchError ? (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-error-container/30 border border-error/20 text-error font-body-md text-body-md">
          <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">warning</span>
          <span>{fetchError}</span>
        </div>
      ) : (
        <div className="space-y-sm">
          {comments.length === 0 ? (
            <p className="text-on-surface-variant text-center py-8 font-body-md text-body-md">
              No comments yet — be the first to share your insights.
            </p>
          ) : (
            comments.map((c, i) => {
              const userInfo = Array.isArray(c.users) ? c.users[0] : c.users;
              const name = userInfo?.name ?? "Anonymous";
              const affiliation = userInfo?.affiliation;
              return (
                <div
                  key={c.id}
                  className={`flex gap-4 p-md ${i < comments.length - 1 ? "border-b border-outline-variant" : ""}`}
                >
                  <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs uppercase shrink-0">
                    {initials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-on-surface text-sm">{name}</span>
                      {affiliation && (
                        <span className="text-outline text-xs">· {affiliation}</span>
                      )}
                      <span className="text-outline text-xs ml-auto">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">{c.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
}
