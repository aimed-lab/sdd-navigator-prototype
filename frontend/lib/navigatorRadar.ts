import type { DiscoverItem } from "@/app/api/discover/route";

export type RadarResult = {
  items: DiscoverItem[];
  query: string;
  fromCache: boolean;
};

// Live, scope-specific research pull — reuses the existing /api/discover
// live-fetch + cache (the same engine behind the Knowledge Hub's Discover tab).
// Deliberately a standalone function taking an arbitrary query string: today
// the Discovery Space roadmap calls this once with the whole project target,
// but nothing here is project-level-specific — a later per-step radar can
// call this N times, once per step's own narrower query.
export async function fetchRadar(query: string, signal?: AbortSignal): Promise<RadarResult> {
  const qs = new URLSearchParams({ q: query }).toString();
  const res = await fetch(`/api/discover?${qs}`, { signal });
  if (!res.ok) throw new Error(`Radar fetch failed (${res.status})`);
  const data = (await res.json()) as { items?: DiscoverItem[]; query?: string; fromCache?: boolean };
  return { items: data.items ?? [], query: data.query ?? query, fromCache: Boolean(data.fromCache) };
}
