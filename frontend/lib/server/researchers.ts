// lib/server/researchers.ts — public researcher directory + profiles (anon).
//
// listPublicResearchers is LIVE (migrated from researchers/page.tsx in Step 4a —
// same queries, same is_public=true filter, same ordering). getResearcherProfile
// remains a stub for the researchers/[slug] migration.
//
// RLS NOTE: this relies on the live DB permitting the ANON role to SELECT
// users rows where is_public=true (and to read researcher_works). The committed
// database/schema.sql does NOT define such a policy (only users_select_own), so
// this read's correctness depends on a live policy not reflected in the repo —
// see the review notes for the verification step. This module never uses the
// service-role key to bypass RLS.

import { getAnonServerClient } from "@/lib/server/supabaseServer";

const NOT_IMPLEMENTED = "lib/server/researchers: not implemented yet (Step 4a migration pending)";

// One public researcher row for the directory grid.
export type ResearcherCard = {
  id: string;
  name: string;
  email: string;
  affiliation: string | null;
  institution: string | null;
  bio: string | null;
  research_focus: string | null;
  interests: string[] | null;
  is_public: boolean;
  profile_slug: string | null;
};

// A single researcher_works row (only the columns the directory counts by).
export type ResearcherWorkRow = { user_id: string; type: string };

// Both raw query results, so the client keeps its exact per-user work-count
// aggregation unchanged (the counting is presentation, not data access).
export type PublicResearchersResult = {
  researchers: ResearcherCard[];
  works: ResearcherWorkRow[];
};

// Full public profile (users row + researcher_works). Shape finalized on migration.
export type ResearcherProfile = {
  profile: Record<string, unknown>;
  works: Record<string, unknown>[];
};

// Fetch the public researcher directory + all researcher_works rows, in parallel.
// Same queries as before, verbatim: users filtered to is_public=true, ordered by
// name; researcher_works selecting (user_id, type). Degrades to empty arrays.
export async function listPublicResearchers(): Promise<PublicResearchersResult> {
  const supabase = getAnonServerClient();
  if (!supabase) return { researchers: [], works: [] };

  const [resRes, worksRes] = await Promise.all([
    supabase
      .from("users")
      .select(
        "id, name, email, affiliation, institution, bio, research_focus, interests, is_public, profile_slug",
      )
      .eq("is_public", true)
      .order("name"),
    supabase.from("researcher_works").select("user_id, type"),
  ]);

  return {
    researchers: (resRes.data ?? []) as ResearcherCard[],
    works: (worksRes.data ?? []) as ResearcherWorkRow[],
  };
}

export async function getResearcherProfile(_slug: string): Promise<ResearcherProfile | null> {
  throw new Error(NOT_IMPLEMENTED);
}
