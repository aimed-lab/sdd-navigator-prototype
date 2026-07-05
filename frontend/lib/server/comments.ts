// lib/server/comments.ts — comments read/write (session-scoped, RLS).
//
// STEP 4a SCAFFOLD: signatures only. Logic moves here from CommentsSection.tsx
// during Phase C. uid for writes is derived from the session, never passed in.

const NOT_IMPLEMENTED = "lib/server/comments: not implemented yet (Step 4a migration pending)";

// A comment with its author fields (joined from users at query time).
export type Comment = {
  id: string;
  content: string;
  created_at: string;
  users: { name: string | null; affiliation: string | null } | null;
};

export async function listComments(_wikiId: string): Promise<Comment[]> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function addComment(_wikiId: string, _content: string): Promise<Comment> {
  throw new Error(NOT_IMPLEMENTED);
}
