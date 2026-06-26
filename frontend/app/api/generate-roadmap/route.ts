import { NextRequest, NextResponse } from "next/server";
import type { InternalProvider, SparcStepContribution } from "@/types/navigator";

// Real internal providers (SPARC) live in the `providers` table — read here
// server-side and grafted onto the roadmap so SPARC is grounded in the DB,
// while external CROs stay LLM-generated. Public-read RLS → anon key is fine.
// Fully isolated in try/catch: any failure returns [] and never blocks the
// roadmap. NOTE: live table has no description/website cols — `speciality`
// holds the description, `contact` holds the URL.
async function fetchInternalProviders() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const res = await fetch(
      `${url}/rest/v1/providers?type=eq.internal` +
        `&select=name,speciality,capabilities,tools,estimated_cost,estimated_timeline,is_free,contact`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// Build the grounding addendum injected into the discovery prompt so the LLM
// can decide, per iteration, WHICH of SPARC's real capabilities/tools apply.
// The capabilities/tools lists below are the ONLY values the model may use —
// this is reinforced server-side by sanitizeSparc(), which drops anything not
// present verbatim in the DB arrays, so even a misbehaving model can't invent.
function buildSparcGrounding(sparc: InternalProvider | null): string {
  if (!sparc) return "";
  const caps = (sparc.capabilities ?? []).filter(Boolean);
  const tools = (sparc.tools ?? []).filter(Boolean);
  if (caps.length === 0 && tools.length === 0) return "";

  return `

UAB SPARC — INTERNAL PROVIDER, STEP-SPECIFIC RELEVANCE (grounded data — DO NOT INVENT):
SPARC is UAB's real internal drug-discovery support center. These are its ONLY real capabilities and tools:
Capabilities: ${caps.join("; ")}
Tools: ${tools.join("; ")}

For EACH object in the "iterations" array, add a "sparc" field describing how SPARC specifically helps at THAT iteration:
  "sparc": { "relevant": boolean, "capabilities": ["subset of the capabilities above"], "tools": ["subset of the tools above"], "how": "1-2 sentences on how SPARC helps at THIS specific step" }

HARD RULES for the "sparc" field:
- You may ONLY copy capability/tool strings VERBATIM from the two lists above. NEVER invent, rename, paraphrase, abbreviate, or add new capabilities, tools, or providers for SPARC.
- Pick only the subset genuinely relevant to that specific iteration. Different iterations (e.g. hit-finding vs lead-optimization) MUST get different selections — choose what actually applies to each, not the same list for both.
- "how" must explain SPARC's role at THAT step specifically, referencing the selected capabilities/tools.
- If SPARC genuinely does not help at an iteration, set "relevant": false with empty "capabilities"/"tools" arrays and an empty "how". Do not force a fit.`;
}

// Re-validate the LLM-selected SPARC subset against the REAL DB arrays. Any
// capability/tool not present verbatim (case-insensitive) in SPARC's actual
// arrays is dropped — this is the hard grounding guarantee that the model
// cannot invent tools/capabilities, regardless of what it returned.
function sanitizeSparc(
  raw: unknown,
  sparc: InternalProvider | null,
): SparcStepContribution | undefined {
  if (!sparc) return undefined;
  const r = (raw ?? {}) as Record<string, unknown>;

  const pick = (value: unknown, allowed: string[]): string[] => {
    if (!Array.isArray(value)) return [];
    const canonical = new Map(allowed.map((a) => [a.toLowerCase().trim(), a]));
    const out: string[] = [];
    for (const v of value) {
      if (typeof v !== "string") continue;
      const hit = canonical.get(v.toLowerCase().trim());
      if (hit && !out.includes(hit)) out.push(hit);
    }
    return out;
  };

  const capabilities = pick(r.capabilities, sparc.capabilities ?? []);
  const tools = pick(r.tools, sparc.tools ?? []);
  const how = typeof r.how === "string" ? r.how.trim() : "";
  // Relevant only if the model said so AND at least one grounded item survived.
  const relevant = r.relevant === true && (capabilities.length > 0 || tools.length > 0);

  return { relevant, capabilities, tools, how: relevant ? how : "" };
}

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

If the researcher provided a molecule_list, you MUST analyze and rank the SPECIFIC molecules they listed. Reference them by their exact names/IDs in your output. Do not give generic advice — explicitly state which molecules to prioritize and why, based on the properties given (IC50, MW, binding score, etc). If no molecules were provided, return an empty array for prioritized_molecules.

For service providers, ONLY suggest real-world Contract Research Organizations (CROs) that actually perform compound synthesis or screening services. Real examples: Southern Research, WuXi AppTec, Evotec, Charles River, Enamine, Sigma-Aldrich Custom Synthesis, Pharmaron, WuXi STA. Do NOT include databases (ChEMBL, PubChem, Zinc) or software tools (Schrodinger, AutoDock) in the cro_partners section — those belong only in tools_and_software. Each suggested CRO must include a brief reason why it fits (synthesis capability, turnaround time, typical cost range, relevant experience) based on the researcher's budget and timeline.

CRITICAL — budget and timeline matching:
The researcher will give you a specific budget range and timeline. You MUST treat these as hard constraints, not background context.
For each CRO you suggest:
- estimated_cost and estimated_timeline must be your best real-world estimate for that specific CRO doing this specific batch of work, not a generic company profile.
- In the description field, explicitly state whether this CRO's realistic cost/timeline FITS the researcher's stated budget and timeline, or explain the gap. Example: 'Standard turnaround is 2-6 months; your 2-week timeline will require a rush/priority service tier, which most CROs offer at a 30-50% cost premium — confirm with Southern Research directly.'
- If no real CRO can realistically meet the researcher's stated timeline, say so explicitly instead of silently giving a longer estimate. Suggest the closest realistic option and name the trade-off clearly.
- Never give a cost/timeline range so wide it could apply to any project. Avoid generic ranges like '2-6 months' unless you also explain why this specific case lands at a particular point in that range given the researcher's constraints.

Return ONLY valid JSON, no markdown, no explanation, in this exact shape:
{
  "space": "discovery",
  "title": "string",
  "summary": "string",
  "prioritized_molecules": [
    {
      "id": "string (e.g. Mol-007)",
      "priority_rank": number,
      "reasoning": "string"
    }
  ],
  "entry_points": ["string"],
  "iterations": [
    {
      "id": "string (one of: hit-finding, lead-optimization)",
      "name": "string",
      "description": "string",
      "tools_and_software": [
        { "name": "string", "type": "string", "description": "string", "website": "string", "free": boolean }
      ],
      "cro_partners": [
        { "name": "string", "description": "string", "website": "string", "estimated_cost": "string", "estimated_timeline": "string", "free": false }
      ]
    }
  ]
}
The "iterations" array must contain exactly 2 entries, in this order, with ids "hit-finding" and "lead-optimization".
For each iteration, suggest 2-3 REAL tools/software in tools_and_software and EXACTLY 2 REAL CROs in cro_partners with real website URLs — never just 1. The two CROs must be genuinely different options (different cost tiers, different turnaround speeds, or different specialties) so the researcher has an actual choice, not two near-identical options.
In each CRO's description, briefly note how it compares to the other listed CRO for this specific case (e.g. faster but more expensive, cheaper but longer lead time, better track record with this compound class). The researcher should be able to read both descriptions and understand which one fits their situation better and why.`;

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
  const { target, approach, currentCompounds, molecule_list, optimizationGoals, timeline, budget } = body as {
    target?: string;
    approach?: string;
    currentCompounds?: string;
    molecule_list?: string;
    optimizationGoals?: string[];
    timeline?: string;
    budget?: string;
  };

  if (!target || !approach) return null;

  return `Generate a discovery space roadmap for a researcher with the following details:
Validated target: ${target}
Discovery approach: ${approach}
${currentCompounds ? `Current compounds: ${currentCompounds}\n` : ""}${molecule_list ? `Candidate molecules with properties:\n${molecule_list}\n` : ""}Key optimization goals: ${(optimizationGoals ?? []).join(", ") || "Not specified"}
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

  // Fetch SPARC first — its real capabilities/tools must be in hand BEFORE the
  // LLM call so we can inject them as grounding for the per-step selection.
  const internalProviders: InternalProvider[] = await fetchInternalProviders();
  const sparc: InternalProvider | null = internalProviders[0] ?? null;

  let systemPrompt: string;
  let userMessage: string | null;

  switch (space) {
    case "target":
      systemPrompt = TARGET_SYSTEM_PROMPT;
      userMessage = buildTargetUserMessage(body);
      break;
    case "discovery":
      // Discovery is the only space that renders SPARC per-iteration, so it's
      // the only one that gets the grounding addendum.
      systemPrompt = DISCOVERY_SYSTEM_PROMPT + buildSparcGrounding(sparc);
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

  // Graft the real SPARC provider onto the roadmap and, for discovery, replace
  // each iteration's LLM-returned `sparc` with a DB-validated, grounded subset.
  function finalizeRoadmap(roadmap: Record<string, unknown>) {
    roadmap.internal_providers = internalProviders;
    if (space === "discovery" && Array.isArray(roadmap.iterations)) {
      for (const iter of roadmap.iterations as Record<string, unknown>[]) {
        iter.sparc = sanitizeSparc(iter.sparc, sparc);
      }
    }
    return roadmap;
  }

  // Parse JSON — handle cases where the model wraps it in markdown fences
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return NextResponse.json(finalizeRoadmap(JSON.parse(cleaned)));
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return NextResponse.json(finalizeRoadmap(JSON.parse(match[0])));
      } catch {
        // fall through
      }
    }
    console.error("Failed to parse Groq response:", content);
    return NextResponse.json({ error: "Failed to parse AI response. Please try again." }, { status: 500 });
  }
}
