// lib/server/comments.ts — comments read/write.
//
// STEP 4a: logic moved verbatim from CommentsSection.tsx.
//
// READ (listComments) is PUBLIC — the comments SELECT policy is USING (true),
// so it runs through the anon server client and returns every comment on a wiki
// page to anyone (matching the logged-out browser behavior today).
//
// WRITE (addComment) is AUTH-GATED — it goes through requireUser() so the author
// (user_id) is derived from the validated session, never from the caller. RLS
// (WITH CHECK auth.uid() = user_id) then guarantees a user can only post as
// themselves. Same table/columns/join/ordering as before.

import { getAnonServerClient, requireUser, ServerConfigError } from "./supabaseServer";

type Author = { name: string | null; affiliation: string | null };

// The users(...) join can surface as an object or a single-element array
// depending on how PostgREST resolves the relationship; callers normalize with
// Array.isArray (see CommentsSection). Kept permissive to preserve that shape.
export type Comment = {
  id: string;
  content: string;
  created_at: string;
  users: Author | Author[] | null;
};

export async function listComments(wikiId: string): Promise<Comment[]> {
  const supabase = getAnonServerClient();
  if (!supabase) throw new ServerConfigError();

  const { data, error } = await supabase
    .from("comments")
    .select("id, content, created_at, users(name, affiliation)")
    .eq("wiki_id", wikiId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}

export async function addComment(wikiId: string, content: string): Promise<void> {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("comments").insert({
    wiki_id: wikiId,
    user_id: user.id,
    content: content.trim(),
  });
  if (error) throw error;
}
