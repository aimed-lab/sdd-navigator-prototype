import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are an expert drug discovery research roadmap generator at UAB SPARC. Given a researcher's starting point and goal, generate a detailed roadmap.
Return ONLY valid JSON, no markdown, no explanation:
{
  "title": "string",
  "summary": "string",
  "stages": [
    {
      "id": "number",
      "name": "string",
      "duration": "string",
      "description": "string",
      "tools": ["string"],
      "bottleneck": "string",
      "providers": [
        {
          "name": "string",
          "type": "string",
          "description": "string",
          "website": "string",
          "free": "boolean"
        }
      ]
    }
  ]
}
For each stage suggest 2-3 REAL globally known service providers or tools researchers actually use. Include real website URLs.
Mix free tools with paid CROs.
Always include at least one free option.
Examples:
Target Validation: ChEMBL(free), UniProt(free), STRING DB(free)
Hit Discovery: Schrödinger, AutoDock(free), ChemBridge
Lead Optimization: Evotec, Charles River, Covance
IND Filing: Parexel, ICON, PPD
Clinical Trials: Medidata, Veeva, Oracle Clinical`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { what_have, have_description, what_want, timeline, budget } = body as {
    what_have?: string;
    have_description?: string;
    what_want?: string;
    timeline?: string;
    budget?: string;
  };

  if (!what_have || !what_want || !timeline || !budget) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
  }

  const userMessage = `Generate a drug discovery roadmap for a researcher with the following details:
Starting point: ${what_have}
Description: ${have_description ?? ""}
Goal: ${what_want}
Timeline: ${timeline}
Budget: ${budget}

Return only the JSON roadmap.`;

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!groqRes.ok) {
    const detail = await groqRes.text();
    console.error("Groq API error:", groqRes.status, detail);
    return NextResponse.json({ error: "AI service unavailable. Please try again." }, { status: 502 });
  }

  const groqData = await groqRes.json();
  const content: string = groqData.choices?.[0]?.message?.content ?? "";

  // Parse JSON — handle cases where the model wraps it in markdown fences
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    const roadmap = JSON.parse(cleaned);
    return NextResponse.json(roadmap);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return NextResponse.json(JSON.parse(match[0]));
      } catch {
        // fall through
      }
    }
    console.error("Failed to parse Groq response:", content);
    return NextResponse.json({ error: "Failed to parse AI response. Please try again." }, { status: 500 });
  }
}
