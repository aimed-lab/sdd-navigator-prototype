// lib/server/interests.ts — users.interests read/write (session-scoped, RLS).
//
// STEP 4a SCAFFOLD: signatures only. Logic moves here from discovery/page.tsx
// and HomeDashboard.tsx during Phase C. uid is derived from the session.

const NOT_IMPLEMENTED = "lib/server/interests: not implemented yet (Step 4a migration pending)";

export async function getInterests(): Promise<string[]> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function setInterests(_next: string[]): Promise<void> {
  throw new Error(NOT_IMPLEMENTED);
}
