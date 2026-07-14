import { supabase } from "@/lib/supabase";
import type { ResearcherMini } from "@/types/navigator";

export async function fetchPublicResearchers(): Promise<ResearcherMini[]> {
  const { data } = await supabase
    .from("users")
    // email deliberately EXCLUDED (PII) — this is an anon-readable public read
    // and email is never consumed downstream (see ResearcherMini).
    .select("id, name, research_focus, interests, profile_slug")
    .eq("is_public", true)
    .limit(50);
  return data ?? [];
}

// Match researchers by keyword overlap between the given keyword source
// (e.g. step/iteration/level name + tools) and each researcher's interests.
// Falls back to the first 3 researchers if nothing matches.
export function matchResearchers(
  all: ResearcherMini[],
  keywordSource: string[]
): ResearcherMini[] {
  if (all.length === 0) return [];
  const keywords = keywordSource
    .join(" ")
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 3);

  const scored = all
    .map((r) => {
      const interestStr = (r.interests ?? []).join(" ").toLowerCase();
      const score = keywords.filter((k) => interestStr.includes(k)).length;
      return { r, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return (scored.length > 0 ? scored.map(({ r }) => r) : all).slice(0, 3);
}
