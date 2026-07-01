import { NextRequest, NextResponse } from "next/server";

// Turns a researcher's free-text answers (field / current work / topics) into a
// small set of clean, search-friendly keywords that drive the multi-term
// Discovery feed (see /api/discover). Same Groq call pattern as
// /api/generate-roadmap, but constrained to return ONLY a JSON array of short
// strings so the output drops straight into users.interests.

const EXTRACT_SYSTEM_PROMPT = `You extract concise, search-friendly research keywords for a biomedical drug-discovery literature feed.
Given a researcher's answers, return 3 to 5 short keyword phrases (each 1-4 words) that work well as search queries against PubMed, ClinicalTrials.gov, and patent databases.
Prefer SPECIFIC diseases, targets, proteins, pathways, techniques, or compound classes over generic words like "research", "biology", or "science".
Return ONLY a JSON array of strings. No prose, no markdown, no object, no keys.
Example: ["Alzheimer's disease","protein aggregation","PHGDH inhibitors","tau phosphorylation"]`;

// Best-effort parse of the model output into a clean string[]. Tolerates
// markdown fences and a stray leading/trailing sentence by falling back to the
// first [...] block. Returns [] on any failure so the caller can 502 cleanly.
function parseKeywords(content: string): string[] {
  const tryParse = (s: string): string[] | null => {
    try {
      const v = JSON.parse(s);
      return Array.isArray(v) ? (v as unknown[]).filter((x) => typeof x === "string") as string[] : null;
    } catch {
      return null;
    }
  };

  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  let arr = tryParse(cleaned);
  if (!arr) {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) arr = tryParse(match[0]);
  }
  if (!arr) return [];

  // Normalize: trim, drop empties, dedupe case-insensitively, cap at 5.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of arr) {
    const kw = raw.trim().replace(/^["']|["']$/g, "").slice(0, 60);
    const key = kw.toLowerCase();
    if (!kw || seen.has(key)) continue;
    seen.add(key);
    out.push(kw);
    if (out.length >= 5) break;
  }
  return out;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { field, working, topics } = body as {
    field?: string;
    working?: string;
    topics?: string;
  };

  const parts = [
    field?.trim() ? `Field / discipline: ${field.trim()}` : "",
    working?.trim() ? `Currently working on: ${working.trim()}` : "",
    topics?.trim() ? `Wants to follow: ${topics.trim()}` : "",
  ].filter(Boolean);

  if (parts.length === 0) {
    return NextResponse.json({ error: "Please answer at least one question." }, { status: 400 });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
  }

  const userMessage = `Extract search keywords from this researcher's answers:
${parts.join("\n")}

Return only the JSON array of 3-5 keywords.`;

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: EXTRACT_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 256,
    }),
  });

  if (!groqRes.ok) {
    const detail = await groqRes.text();
    console.error("Groq API error (extract-interests):", groqRes.status, detail);
    return NextResponse.json({ error: "AI service unavailable. Please try again." }, { status: 502 });
  }

  const groqData = await groqRes.json();
  const content: string = groqData.choices?.[0]?.message?.content ?? "";
  const keywords = parseKeywords(content);

  if (keywords.length === 0) {
    console.error("Failed to parse keywords from Groq response:", content);
    return NextResponse.json(
      { error: "Couldn't turn that into keywords. Try rephrasing your answers." },
      { status: 502 },
    );
  }

  return NextResponse.json({ keywords });
}
