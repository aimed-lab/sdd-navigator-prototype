import { NextRequest, NextResponse } from "next/server";
import { fetchPaperById } from "@/lib/server/promote/fetchPaper";

// GET /api/promote/fetch-paper?id=<doi-or-pmid> — resolve one paper's metadata
// (title/authors/abstract/…) for the Promote feature. PUBLIC (no requireUser):
// non-authenticated researchers must be able to look up a paper. Thin wrapper
// over lib/server/promote/fetchPaper.fetchPaperById, mirroring app/api/graph.
// Returns 400 when ?id= is missing, 404 when nothing resolves. force-dynamic
// keeps every lookup live (no route caching).
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json(
      { error: "Missing required query param: id (a DOI or PubMed ID)." },
      { status: 400 },
    );
  }

  const paper = await fetchPaperById(id);
  if (!paper) {
    return NextResponse.json(
      { error: `No paper found for "${id}". Check the DOI or PubMed ID and try again.` },
      { status: 404 },
    );
  }

  return NextResponse.json(paper);
}
