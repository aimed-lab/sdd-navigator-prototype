// lib/server/sources/clinicalTrials.ts — ClinicalTrials.gov v2 fetcher.
// STEP 4a SCAFFOLD: signature only. fetchClinicalTrials moves here from app/api/discover/route.ts.
import type { RawDiscoverItem } from "@/lib/server/discovery";

export async function fetchClinicalTrials(_term: string, _cap: number): Promise<RawDiscoverItem[]> {
  throw new Error("lib/server/sources/clinicalTrials: not implemented yet (Step 4a migration pending)");
}
