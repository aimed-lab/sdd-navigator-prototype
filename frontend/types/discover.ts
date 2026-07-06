// Shared discovery types — used by the /api/discover engine (lib/server/discovery
// + lib/server/sources/*), by generate-proposal's research pipeline, and by the
// client feed components (DiscoverCard, HomeDashboard, LandingLiveStrip, the
// Discovery page, navigatorRadar). Relocated here from app/api/discover/route.ts
// in Step 4a so no consumer imports a type from a route module.

export type DiscoverItem = {
  id: string;
  type: "paper" | "grant" | "trial" | "tool";
  title: string;
  description: string;
  source: string;
  date: string;
  dateISO: string;
  url: string;
  tags: string[];
  relevance: number; // 1-5
};

// A source item before relevance scoring — what each lib/server/sources fetcher returns.
export type RawDiscoverItem = Omit<DiscoverItem, "relevance">;
