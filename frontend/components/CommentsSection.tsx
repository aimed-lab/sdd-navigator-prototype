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
    <section className="flex flex-col gap-8">
      <h2 className="font-headline-lg text-headline-lg text-on-surface">
        Researcher Discussion
      </h2>

      {/* Comment input / login gate */}
      {user ? (
        <form onSubmit={handleSubmit} className="glass-card p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-surface-container-high border border-primary/30 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-primary text-sm">person</span>
            </div>
            <span className="font-data-label text-data-label text-primary truncate">
              {user.email}
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your research insights or questions…"
            rows={4}
            className="bg-surface-container-lowest border border-[rgba(255,255,255,0.1)] p-4 text-on-surface placeholder:text-on-surface-variant/50 font-body-md resize-none focus:outline-none focus:border-primary transition-colors"
          />
          {error && (
            <p className="font-data-label text-[11px] text-error">{error}</p>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="px-6 py-2 bg-primary text-background font-bold hover:shadow-[0_0_15px_rgba(233,254,255,0.4)] transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Posting…" : "Post Comment"}
            </button>
          </div>
        </form>
      ) : (
        <div className="glass-card p-8 flex flex-col items-center justify-center gap-4 text-center border-dashed">
          <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center border border-[rgba(255,255,255,0.1)]">
            <span className="material-symbols-outlined text-primary">lock</span>
          </div>
          <p className="text-on-surface-variant">
            Access restricted to verified researchers.
          </p>
          <Link href="/login">
            <button className="text-primary font-bold border-b border-primary hover:border-b-2 transition-all">
              Login to comment
            </button>
          </Link>
        </div>
      )}

      {/* Comments list */}
      {loadingComments ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {comments.length === 0 ? (
            <p className="text-on-surface-variant text-center py-4 font-body-md">
              No comments yet — be the first to share your insights.
            </p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="glass-card p-6 flex gap-4">
                <div className="w-12 h-12 rounded-full border-2 border-primary/20 bg-surface-container-high flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-surface-variant">
                    person
                  </span>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface">{c.author_name}</span>
                      {c.affiliation && (
                        <span className="font-data-label text-[10px] text-primary bg-primary/10 px-2 py-0.5 self-start mt-1">
                          {c.affiliation}
                        </span>
                      )}
                    </div>
                    <span className="font-data-label text-[10px] text-on-surface-variant">
                      {timeAgo(c.created_at)}
                    </span>
                  </div>
                  <p className="text-on-surface-variant text-sm mt-2 italic border-l-2 border-primary/30 pl-4">
                    &ldquo;{c.content}&rdquo;
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
