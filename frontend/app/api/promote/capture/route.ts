import { NextRequest, NextResponse } from "next/server";
import { parseCaptureInput, createPromoteCapture } from "@/lib/server/promote/capture";
import { errorResponse } from "@/lib/server/supabaseServer";

// POST /api/promote/capture — optionally capture a researcher's identity
// (ORCID / LinkedIn) tied to a promoted paper into promote_captures. PUBLIC (no
// requireUser): matches the low-friction Promote funnel, and the subject is an
// external researcher rather than the logged-in caller (public-insert RLS). Thin
// wrapper over lib/server/promote/capture, mapping failures via errorResponse.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const input = parseCaptureInput(body);
  if (!input) {
    return NextResponse.json(
      { error: "Provide at least an ORCID or a LinkedIn URL." },
      { status: 400 },
    );
  }

  try {
    await createPromoteCapture(input);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return errorResponse(e, "Could not save your details. Please try again.");
  }
}
