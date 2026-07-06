import { NextRequest, NextResponse } from "next/server";
import { runDiscover } from "@/lib/server/discovery";

// =============================================================================
// /api/discover — live external-feed aggregator (thin handler).
// =============================================================================
// Parses the query params (?q= / ?interests= / ?refresh=1), delegates to
// lib/server/discovery.runDiscover (fan-out over PubMed / OpenAlex / Crossref /
// Grants.gov / ClinicalTrials.gov / GitHub → quality filter → dedup → score →
// scope cache), and returns the same JSON shape as before:
//   { items: DiscoverItem[], personalized, query, cachedAt, fromCache }
// Two consumers depend on this contract: the Discovery page/radar and
// generate-proposal's research pipeline. The Cache-Control header is preserved.
// =============================================================================

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = params.get("q")?.trim();
  const interests = (params.get("interests") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const forceRefresh = params.get("refresh") === "1";

  const result = await runDiscover({ q, interests, forceRefresh });

  return NextResponse.json(result, {
    // Caching is handled by our own scope-keyed store in runDiscover, not HTTP/CDN
    // caching — that would otherwise fight with `refresh=1` bypassing the cache.
    headers: { "Cache-Control": "private, no-store" },
  });
}
