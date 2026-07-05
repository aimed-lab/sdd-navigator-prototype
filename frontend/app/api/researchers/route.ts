import { NextResponse } from "next/server";
import { listPublicResearchers } from "@/lib/server/researchers";

// GET /api/researchers — public researcher directory (+ researcher_works rows for
// per-user counts). Thin wrapper over lib/server/researchers.listPublicResearchers
// so the client directory page fetches through an API instead of calling Supabase
// directly. force-dynamic keeps the list live on every request.
export const dynamic = "force-dynamic";

export async function GET() {
  const data = await listPublicResearchers();
  return NextResponse.json(data);
}
