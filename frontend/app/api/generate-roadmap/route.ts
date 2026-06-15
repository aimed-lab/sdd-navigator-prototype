import { NextRequest, NextResponse } from "next/server";

const TARGET_SYSTEM_PROMPT = `You are an expert in biological target assessment for drug discovery at UAB SPARC.
Generate a target ranking and assessment roadmap.
Return ONLY valid JSON, no markdown, no explanation, in this exact shape:
{
  "space": "target",
  "title": "string",
  "summary": "string",
  "steps": [
    {
      "id": "string (one of: identify, score, assess, fine-tune)",
      "name": "string",
      "description": "string",
      "scoring_criteria": ["string"],
      "tools": ["string"],
      "providers": [
        { "name": "string", "type": "string", "description": "string", "website": "string", "free": boolean }
      ]
    }
  ]
}
The "steps" array must contain exactly 4 entries, in this order, with ids "identify", "score", "assess", "fine-tune".
For each step, suggest 2-3 REAL globally known service providers or tools researchers actually use, with real website URLs.
Mix free tools with paid options and include at least one free option per step.`;

const DISCOVERY_SYSTEM_PROMPT = `You are an expert in drug discovery and compound optimization at UAB SPARC.
Generate a discovery space roadmap with iterative hit-to-lead optimization.
Return ONLY valid JSON, no markdown, no explanation, in this exact shape:
{
  "space": "discovery",
  "title": "string",
  "summary": "string",
  "entry_points": ["string"],
  "iterations": [
    {
      "id": "string (one of: hit-finding, lead-optimization)",
      "name": "string",
      "description": "string",
      "tools": ["string"],
      "providers": [
        { "name": "string", "type": "string", "description": "string", "website": "string", "free": boolean }
      ]
    }
  ]
}
The "iterations" array must contain exactly 2 entries, in this order, with ids "hit-finding" and "lead-optimization".
For each iteration, suggest 2-3 REAL globally known service providers or tools researchers actually use, with real website URLs.
Mix free tools with paid CROs and include at least one free option per iteration.`;

const VALIDATION_SYSTEM_PROMPT = `You are an expert in preclinical validation and drug candidate assessment at UAB SPARC.
Determine the current context level (1-10) based on what the researcher describes.
Return ONLY valid JSON, no markdown, no explanation, in this exact shape:
{
  "space": "validation",
  "title": "string",
  "summary": "string",
  "current_level": "number",
  "context_levels": [
    {
      "level": "number",
      "name": "string",
      "description": "string",
      "is_current": "boolean",
      "experiments": ["string"],
      "cost_range": "string",
      "timeline": "string",
      "tools": ["string"],
      "providers": [
        { "name": "string", "type": "string", "description": "string", "website": "string", "free": boolean }
      ]
    }
  ]
}
The "context_levels" array must contain exactly 10 entries with "level" values 1 through 10 in ascending order.
Exactly one entry must have "is_current": true, matching "current_level".
Use this standard validation ladder for the "name" fields, in order: 1 Computational Binding, 2 In Vitro Binding, 3 Cell Phenotype, 4 Multi-Cell / Co-Culture, 5 Organoid / Tissue Model, 6 Animal Model (Mouse), 7 Non-Human Primate Study, 8 Phase I Safety, 9 Phase II Efficacy, 10 All Patients / Approval.
For each level, suggest 2-3 REAL globally known service providers, CROs, or academic resources researchers actually use, with real website URLs.
Mix free/academic resources with paid CROs and include at least one free or academic option per level.`;

function buildTargetUserMessage(body: Record<string, unknown>) {
  const {
    disease,
    targets,
    targetVolume,
    budgetRange,
    scoringCriteria,
    patientCohort,
  } = body as {
    disease?: string;
    targets?: string;
    targetVolume?: string;
    budgetRange?: string;
    scoringCriteria?: string[];
    patientCohort?: string;
  };

  if (!disease || !targets) return null;

  return `Generate a target space roadmap for a researcher with the following details:
Disease or condition: ${disease}
Candidate targets: ${targets}
Target volume: ${targetVolume ?? "Not specified"}
Budget range: ${budgetRange ?? "Not specified"}
Scoring criteria priorities: ${(scoringCriteria ?? []).join(", ") || "Not specified"}
Patient cohort specifics: ${patientCohort ?? "Not specified"}

Return only the JSON roadmap.`;
}

function buildDiscoveryUserMessage(body: Record<string, unknown>) {
  const { target, approach, currentCompounds, optimizationGoals, timeline, budget } = body as {
    target?: string;
    approach?: string;
    currentCompounds?: string;
    optimizationGoals?: string[];
    timeline?: string;
    budget?: string;
  };

  if (!target || !approach) return null;

  return `Generate a discovery space roadmap for a researcher with the following details:
Validated target: ${target}
Discovery approach: ${approach}
${currentCompounds ? `Current compounds: ${currentCompounds}\n` : ""}Key optimization goals: ${(optimizationGoals ?? []).join(", ") || "Not specified"}
Timeline: ${timeline ?? "Not specified"}
Budget range: ${budget ?? "Not specified"}

Return only the JSON roadmap.`;
}

function buildValidationUserMessage(body: Record<string, unknown>) {
  const { compoundDetails, validationDone, targetIndication, milestone, budget, timeline } = body as {
    compoundDetails?: string;
    validationDone?: string[];
    targetIndication?: string;
    milestone?: string;
    budget?: string;
    timeline?: string;
  };

  if (!compoundDetails || !targetIndication) return null;

  return `Generate a validation space roadmap for a researcher with the following details:
Compound details: ${compoundDetails}
Validation already completed: ${(validationDone ?? []).join(", ") || "None"}
Target indication: ${targetIndication}
Next milestone: ${milestone ?? "Not specified"}
Budget for wet lab: ${budget ?? "Not specified"}
Timeline: ${timeline ?? "Not specified"}

Determine the current context level (1-10) based on the validation already completed, then return only the JSON roadmap.`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { space } = body as { space?: string };

  let systemPrompt: string;
  let userMessage: string | null;

  switch (space) {
    case "target":
      systemPrompt = TARGET_SYSTEM_PROMPT;
      userMessage = buildTargetUserMessage(body);
      break;
    case "discovery":
      systemPrompt = DISCOVERY_SYSTEM_PROMPT;
      userMessage = buildDiscoveryUserMessage(body);
      break;
    case "validation":
      systemPrompt = VALIDATION_SYSTEM_PROMPT;
      userMessage = buildValidationUserMessage(body);
      break;
    default:
      return NextResponse.json({ error: "Invalid or missing 'space' field" }, { status: 400 });
  }

  if (!userMessage) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
  }

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
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
