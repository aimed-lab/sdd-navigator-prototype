// lib/server/sources/github.ts — GitHub repository search fetcher.
// STEP 4a SCAFFOLD: signature only. fetchGitHubTools moves here from app/api/discover/route.ts.
import type { RawDiscoverItem } from "@/lib/server/discovery";

export async function fetchGitHubTools(_term: string, _cap: number): Promise<RawDiscoverItem[]> {
  throw new Error("lib/server/sources/github: not implemented yet (Step 4a migration pending)");
}
