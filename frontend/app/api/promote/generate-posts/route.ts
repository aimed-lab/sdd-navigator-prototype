import { NextRequest, NextResponse } from "next/server";
import { generatePromoPosts } from "@/lib/server/promote/generatePosts";
import { generateExtraOutputs } from "@/lib/server/promote/generateExtras";
import { errorResponse } from "@/lib/server/supabaseServer";
import type { PaperMetadata } from "@/lib/server/promote/fetchPaper";

// POST /api/promote/generate-posts — generate the 4 LinkedIn post variants AND
// the two extra outputs (funding pitch + lay summary) from one paper's metadata.
// PUBLIC (no requireUser): matches the low-friction Promote funnel of the fetch
// route. Body is a PaperMetadata object (the exact shape /api/promote/fetch-paper
// returns). Thin wrapper over generatePromoPosts + generateExtraOutputs, run in
// parallel, mapping failures via errorResponse. force-dynamic keeps every
// generation live (no route caching).
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
    // Run the LinkedIn tone variants and the extra outputs in parallel — both
    // read the same PaperMetadata and are independent Groq calls. If either
    // throws, errorResponse maps it (so the whole response fails together, which
    // keeps the client's { variants, fundingPitch, laySummary } contract intact).
    const [variants, extras] = await Promise.all([
      generatePromoPosts(paper),
      generateExtraOutputs(paper),
    ]);
    return NextResponse.json({
      variants,
      fundingPitch: extras.fundingPitch,
      laySummary: extras.laySummary,
    });
  } catch (e) {
    return errorResponse(e, "Could not generate posts. Please try again.");
  }
}
