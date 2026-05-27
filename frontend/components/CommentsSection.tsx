"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

type Comment = {
  id: string;
  author_name: string;
  affiliation: string;
  content: string;
  created_at: string;
};

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}

export default function CommentsSection({ wikiSlug }: { wikiSlug: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    const { data, error: fetchError } = await supabase
      .from("comments")
      .select("id, author_name, affiliation, content, created_at")
      .eq("wiki_page_slug", wikiSlug)
      .order("created_at", { ascending: false });

    if (fetchError) console.error("Comments fetch error:", fetchError.message);
    setComments(data ?? []);
    setLoadingComments(false);
  }, [wikiSlug]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !content.trim()) return;
    setSubmitting(true);
    setError(null);

    const authorName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Anonymous";

    const { error: insertError } = await supabase.from("comments").insert({
      wiki_page_slug: wikiSlug,
      user_id: user.id,
      author_name: authorName,
      affiliation: user.user_metadata?.affiliation ?? "",
      content: content.trim(),
    });

    if (insertError) {
      setError("Failed to post comment. Please try again.");
      console.error("Comment insert error:", insertError.message);
    } else {
      setContent("");
      await loadComments();
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-stack-md">
      <h2 className="font-title-lg text-title-lg text-on-surface">
        Researcher Discussion
      </h2>

      {/* Comment input / login gate */}
      {user ? (
        <form
          onSubmit={handleSubmit}
          className="academic-card p-stack-md flex flex-col gap-4"
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs uppercase shrink-0">
              {initials(
                user.user_metadata?.name || user.email?.split("@")[0] || "U"
              )}
            </div>
            <span className="font-label-md text-label-md text-primary truncate">
              {user.email}
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your research insights or questions…"
            rows={4}
            className="bg-surface border border-outline-variant p-4 rounded-lg text-on-surface placeholder:text-on-surface-variant/50 font-body-md resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
          />
          {error && (
            <p className="font-label-md text-label-md text-error">{error}</p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-6 py-2 bg-primary text-on-primary font-label-md text-label-md font-bold rounded-lg hover:bg-primary-container transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Posting…" : "Post Comment"}
            </button>
          </div>
        </form>
      ) : (
        <div className="academic-card p-stack-lg flex flex-col items-center justify-center gap-4 text-center bg-surface-container-low border-dashed border-2">
          <span className="material-symbols-outlined text-outline text-4xl">
            lock
          </span>
          <p className="font-title-md text-title-md text-on-surface">
            Join the Discussion
          </p>
          <p className="font-body-sm text-body-sm text-outline text-center">
            Please{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              log in
            </Link>{" "}
            to contribute to this research thread.
          </p>
        </div>
      )}

      {/* Comments list */}
      {loadingComments ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-stack-md">
          {comments.length === 0 ? (
            <p className="text-on-surface-variant text-center py-4 font-body-md">
              No comments yet — be the first to share your insights.
            </p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="academic-card p-stack-md">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs uppercase shrink-0">
                      {initials(c.author_name)}
                    </div>
                    <div>
                      <p className="font-title-md text-title-md text-on-surface leading-tight">
                        {c.author_name}
                      </p>
                      {c.affiliation && (
                        <p className="font-label-md text-label-md text-outline">
                          {c.affiliation} • {timeAgo(c.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                  {!c.affiliation && (
                    <span className="font-label-md text-label-md text-outline">
                      {timeAgo(c.created_at)}
                    </span>
                  )}
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {c.content}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
