// lib/server/profile.ts — profile editor read/write (session-scoped, RLS).
//
// STEP 4a: the users + researcher_works reads/writes moved verbatim from
// profile/setup/page.tsx. Everything goes through requireUser(), so the uid is
// derived from the validated session and RLS scopes every op to the caller — a
// user can only ever read/write their OWN profile and works. See
// [[project-researcher-profiles]] for the users/researcher_works shape.
//
// The slug decision (preserve on edit, mint only on first publish) stays in the
// page — it's deterministic (generateSlug) and drives client routing; the final
// profile_slug is passed in the patch and written verbatim. name→auth metadata
// is NOT involved here (this page never called auth.updateUser).

import { requireUser } from "./supabaseServer";

// One researcher_works row as edited in the profile setup form. No user_id here:
// the owner is always stamped from the session in replaceResearcherWorks.
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
  profile: Record<string, unknown> | null;
  works: ResearcherWork[];
};

// Read the caller's own profile row + their works (works ordered oldest-first,
// matching the original preload). Either may be empty for a brand-new profile.
export async function getProfile(): Promise<ProfileData> {
  const { supabase, user } = await requireUser();

  const { data: profile, error: profileErr } = await supabase
    .from("users")
    .select("name, title, affiliation, bio, research_focus, linkedin_url, website_url, scholar_url, orcid_url, github_url, interests, is_public, profile_slug")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr) throw profileErr;

  const { data: works, error: worksErr } = await supabase
    .from("researcher_works")
    .select("id, type, title, journal, year, url, description")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });
  if (worksErr) throw worksErr;

  return {
    profile: (profile ?? null) as Record<string, unknown> | null,
    works: (works ?? []) as ResearcherWork[],
  };
}

// Update the caller's users row. The patch is built in the page (nullable
// columns, interests, is_public, profile_slug) and written verbatim; ownership
// is enforced by the session uid + RLS.
export async function updateProfile(patch: Record<string, unknown>): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("users").update(patch).eq("id", user.id);
  if (error) throw error;
}

// Reconcile researcher_works: delete the caller's existing rows, then reinsert
// the current set. Both steps are scoped to the SESSION user — the incoming
// rows never carry a user_id; it is stamped here from the session, so a caller
// can never delete or insert another user's works. Same order as the original.
export async function replaceResearcherWorks(rows: ResearcherWork[]): Promise<void> {
  const { supabase, user } = await requireUser();

  const { error: deleteErr } = await supabase
    .from("researcher_works")
    .delete()
    .eq("user_id", user.id);
  if (deleteErr) throw deleteErr;

  if (rows.length > 0) {
    const insertRows = rows.map((w) => ({
      user_id: user.id,
      type: w.type,
      title: w.title,
      journal: w.journal,
      year: w.year,
      url: w.url,
      description: w.description,
    }));
    const { error: worksErr } = await supabase.from("researcher_works").insert(insertRows);
    if (worksErr) throw worksErr;
  }
}
