import { NextRequest, NextResponse } from "next/server";
import { generatePromoPosts } from "@/lib/server/promote/generatePosts";
import { errorResponse } from "@/lib/server/supabaseServer";
import type { PaperMetadata } from "@/lib/server/promote/fetchPaper";

// POST /api/promote/generate-posts — generate 4 LinkedIn post variants from one
// paper's metadata. PUBLIC (no requireUser): matches the low-friction Promote
// funnel of the fetch route. Body is a PaperMetadata object (the exact shape
// /api/promote/fetch-paper returns). Thin wrapper over
// lib/server/promote/generatePosts.generatePromoPosts, mapping failures via
// errorResponse. force-dynamic keeps every generation live (no route caching).
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const paper = body as PaperMetadata;
  if (typeof paper.title !== "string" || !paper.title.trim()) {
    return NextResponse.json(
      { error: "A paper 'title' is required (send the PaperMetadata from fetch-paper)." },
      { status: 400 },
    );
  }

  try {
    const variants = await generatePromoPosts(paper);
    return NextResponse.json({ variants });
  } catch (e) {
    return errorResponse(e, "Could not generate posts. Please try again.");
  }
}
