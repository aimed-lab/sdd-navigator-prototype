// lib/server/discovery.ts — the live discovery aggregation engine.
//
// STEP 4a SCAFFOLD: signatures only. Logic moves here from app/api/discover/route.ts
// during Phase B (pure logic, no auth). The 6 source fetchers live in ./sources/*;
// dedupe/score/quality/cache helpers will move alongside this file. The in-process
// cache Map must remain module-scoped here so it survives across requests exactly
// as it does today.
//
// NOTE: DiscoverItem is imported from the route for now; it will be relocated to a
// dedicated types module when the route is thinned (import-path change only).

import type { DiscoverItem } from "@/app/api/discover/route";

const NOT_IMPLEMENTED = "lib/server/discovery: not implemented yet (Step 4a migration pending)";

// A source item before relevance scoring — what each ./sources fetcher returns.
export type RawDiscoverItem = Omit<DiscoverItem, "relevance">;

export type DiscoverParams = {
  q?: string;
  interests?: string[];
  forceRefresh?: boolean;
};

export type DiscoverResponse = {
  items: DiscoverItem[];
  personalized: boolean;
  query: string;
  cachedAt: number;
  fromCache: boolean;
};

export async function runDiscover(_params: DiscoverParams): Promise<DiscoverResponse> {
  throw new Error(NOT_IMPLEMENTED);
}
