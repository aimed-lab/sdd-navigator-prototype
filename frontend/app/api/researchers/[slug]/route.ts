import { NextRequest, NextResponse } from "next/server";
import { getResearcherProfile } from "@/lib/server/researchers";

// GET /api/researchers/[slug] — one public researcher profile (+ works + related
// pool). Thin wrapper over lib/server/researchers.getResearcherProfile so the
// client profile page fetches through an API instead of calling Supabase
// directly. Returns 404 when the profile is missing or not public, matching the
// page's prior not-found handling. force-dynamic keeps the read live.
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const profile = await getResearcherProfile(slug);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}
