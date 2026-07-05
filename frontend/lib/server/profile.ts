// lib/server/profile.ts — profile editor read/write (session-scoped, RLS).
//
// STEP 4a SCAFFOLD: signatures only. Logic moves here from profile/setup/page.tsx
// during Phase C. Writes are user-scoped; uid derived from the session.

const NOT_IMPLEMENTED = "lib/server/profile: not implemented yet (Step 4a migration pending)";

// One researcher_works row as edited in the profile setup form.
export type ResearcherWork = {
  id?: string;
  type: string;
  title: string;
  journal: string | null;
  year: number | null;
  url: string | null;
  description: string | null;
};

export type ProfileData = {
  profile: Record<string, unknown>;
  works: ResearcherWork[];
};

export async function getProfile(): Promise<ProfileData> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function updateProfile(_patch: Record<string, unknown>): Promise<void> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function replaceResearcherWorks(_rows: ResearcherWork[]): Promise<void> {
  throw new Error(NOT_IMPLEMENTED);
}
