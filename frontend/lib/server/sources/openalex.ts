// lib/server/sources/openalex.ts — OpenAlex works fetcher.
// STEP 4a SCAFFOLD: signature only. fetchOpenAlex moves here from app/api/discover/route.ts.
import type { RawDiscoverItem } from "@/lib/server/discovery";

export async function fetchOpenAlex(_term: string, _cap: number): Promise<RawDiscoverItem[]> {
  throw new Error("lib/server/sources/openalex: not implemented yet (Step 4a migration pending)");
}
