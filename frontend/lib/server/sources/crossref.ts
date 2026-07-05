// lib/server/sources/crossref.ts — Crossref works fetcher.
// STEP 4a SCAFFOLD: signature only. fetchCrossref moves here from app/api/discover/route.ts.
import type { RawDiscoverItem } from "@/lib/server/discovery";

export async function fetchCrossref(_term: string, _cap: number): Promise<RawDiscoverItem[]> {
  throw new Error("lib/server/sources/crossref: not implemented yet (Step 4a migration pending)");
}
