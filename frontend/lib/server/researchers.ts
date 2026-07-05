// lib/server/researchers.ts — public researcher directory + profiles (anon).
//
// STEP 4a SCAFFOLD: signatures only. `fetchPublicResearchers` moves here from
// lib/navigatorResearchers.ts (whose PURE matchResearchers() stays put, client-
// safe). Profile reads move here from researchers/[slug]. Do not implement yet.

const NOT_IMPLEMENTED = "lib/server/researchers: not implemented yet (Step 4a migration pending)";

// Directory card: a public user + their work counts by type.
export type ResearcherCard = {
  id: string;
  name: string | null;
  email: string;
  research_focus: string | null;
  interests: string[] | null;
  profile_slug: string | null;
  work_counts?: Record<string, number>;
};

// Full public profile (users row + researcher_works). Shape finalized on migration.
export type ResearcherProfile = {
  profile: Record<string, unknown>;
  works: Record<string, unknown>[];
};

export async function listPublicResearchers(): Promise<ResearcherCard[]> {
  throw new Error(NOT_IMPLEMENTED);
}

export async function getResearcherProfile(_slug: string): Promise<ResearcherProfile | null> {
  throw new Error(NOT_IMPLEMENTED);
}
