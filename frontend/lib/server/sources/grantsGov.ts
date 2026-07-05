// lib/server/sources/grantsGov.ts — Grants.gov search2 fetcher.
// STEP 4a SCAFFOLD: signature only. fetchGrantsGov moves here from app/api/discover/route.ts.
import type { RawDiscoverItem } from "@/lib/server/discovery";

export async function fetchGrantsGov(_term: string, _cap: number): Promise<RawDiscoverItem[]> {
  throw new Error("lib/server/sources/grantsGov: not implemented yet (Step 4a migration pending)");
}
