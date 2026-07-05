// lib/server/sources/pubmed.ts — PubMed E-utilities fetcher.
// STEP 4a SCAFFOLD: signature only. fetchPubMed moves here from app/api/discover/route.ts.
import type { RawDiscoverItem } from "@/lib/server/discovery";

export async function fetchPubMed(_term: string, _cap: number): Promise<RawDiscoverItem[]> {
  throw new Error("lib/server/sources/pubmed: not implemented yet (Step 4a migration pending)");
}
