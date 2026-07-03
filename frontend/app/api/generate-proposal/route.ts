import { NextRequest, NextResponse } from "next/server";
import type { InternalProvider, SparcStepContribution } from "@/types/navigator";
import type {
  ProposalInput,
  ProposalDocument,
  ProposalPhase,
  ProposalProvider,
  ProposalPaper,
  ProposalRecap,
} from "@/types/proposal";
import type { DiscoverItem } from "@/app/api/discover/route";
import { cleanText } from "@/lib/sanitizeText";

// =============================================================================
// Unified Navigator proposal engine.
// =============================================================================
// Replaces the 3-space model (target/discovery/validation → /api/generate-roadmap)
// with ONE input shape (the 7 RFA sections) → ONE phased-document output.
//
// Provider rule — VERIFIED ONLY: providers come exclusively from the real
// `providers` DB table. The LLM never invents providers. It only selects, per
// phase, which of SPARC's REAL capabilities/tools apply (grounded + re-validated
// verbatim by sanitizeSparcSelection). We then map the surviving capabilities
// back to their actual DB rows to build the Verified provider cards. A phase
// with no matching verified provider returns an empty providers[] — honest, not
// padded with invented providers.
// =============================================================================

// ── SPARC providers (DB) ──────────────────────────────────────────────────────

// Read the real internal providers (SPARC) from the `providers` table. Public-
// read RLS → anon key is fine. Fully isolated in try/catch: any failure returns
// [] and never blocks generation. NOTE: the live table has no description/
// website cols — `speciality` holds the description, `contact` holds the URL.
// SPARC is modelled as multiple rows (one per service area), so this returns an
// array and grounding spans ALL rows (not just the first).
async function fetchInternalProviders(): Promise<InternalProvider[]> {
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

// Union of every capability / tool across all internal provider rows. This is
// the ONLY vocabulary the LLM may draw SPARC selections from, and the set
// sanitizeSparcSelection re-validates against.
function collectGrounding(providers: InternalProvider[]) {
  const caps = new Set<string>();
  const tools = new Set<string>();
  for (const p of providers) {
    for (const c of p.capabilities ?? []) if (c) caps.add(c);
    for (const t of p.tools ?? []) if (t) tools.add(t);
  }
  return { capabilities: [...caps], tools: [...tools] };
}

// ── SPARC grounding (carried forward from generate-roadmap) ───────────────────

// Build the grounding addendum injected into the prompt so the LLM can decide,
// per phase, WHICH of SPARC's real capabilities/tools apply. The lists below are
// the ONLY values the model may use — reinforced server-side by
// sanitizeSparcSelection(), which drops anything not present verbatim.
function buildSparcGrounding(caps: string[], tools: string[]): string {
  if (caps.length === 0 && tools.length === 0) return "";
  return `

UAB SPARC — INTERNAL PROVIDER (grounded data — DO NOT INVENT):
SPARC is UAB's real internal drug-discovery support center. These are its ONLY real capabilities and tools:
Capabilities: ${caps.join("; ")}
Tools: ${tools.join("; ")}

For EACH object in the "phases" array, add a "sparc" field selecting which of SPARC's capabilities/tools genuinely help at THAT phase:
  "sparc": { "relevant": boolean, "capabilities": ["subset of the capabilities above"], "tools": ["subset of the tools above"], "how": "1-2 sentences on how SPARC helps at THIS specific phase" }

HARD RULES for the "sparc" field:
- You may ONLY copy capability/tool strings VERBATIM from the two lists above. NEVER invent, rename, paraphrase, abbreviate, or add new capabilities, tools, or providers.
- Pick only the subset genuinely relevant to that specific phase. Different phases MUST get different selections — choose what actually applies to each.
- "how" must explain SPARC's role at THAT phase specifically, referencing the selected capabilities/tools.
- If SPARC genuinely does not help at a phase, set "relevant": false with empty "capabilities"/"tools" arrays and an empty "how". Do not force a fit.
- Do NOT output any other providers, CROs, companies, tools, or papers anywhere in the JSON — those are added by the system, not by you.`;
}

// Re-validate the LLM-selected SPARC subset against the REAL DB arrays. Any
// capability/tool not present verbatim (case-insensitive) is dropped — the hard
// guarantee that the model cannot invent tools/capabilities. Identical in spirit
// to generate-roadmap's sanitizeSparc, but validates against the union of all
// SPARC rows rather than a single row.
function sanitizeSparcSelection(
  raw: unknown,
  allowedCaps: string[],
  allowedTools: string[],
): SparcStepContribution {
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

  const capabilities = pick(r.capabilities, allowedCaps);
  const tools = pick(r.tools, allowedTools);
  const how = typeof r.how === "string" ? r.how.trim() : "";
  // Relevant only if the model said so AND at least one grounded item survived.
  const relevant = r.relevant === true && (capabilities.length > 0 || tools.length > 0);

  return { relevant, capabilities, tools, how: relevant ? how : "" };
}

// Derive a $–$$$$ symbol from a raw DB cost string, or null when absent. Buckets
// are absolute-dollar based on the first numeric value found — derived from real
// data, never fabricated.
function costSymbol(cost: string | null | undefined): string | null {
  if (!cost) return null;
  const m = cost.replace(/,/g, "").match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  if (!(n > 0)) return null;
  if (n < 1500) return "$";
  if (n < 3000) return "$$";
  if (n < 10000) return "$$$";
  return "$$$$";
}

// Map a phase's VALIDATED SPARC selection back to the real DB rows, producing
// Verified provider cards. A row is included only if it actually owns at least
// one of the surviving capabilities — so providers are built entirely from DB
// rows, never from LLM free text. Returns [] when nothing matches.
function buildPhaseProviders(
  contribution: SparcStepContribution,
  providers: InternalProvider[],
): ProposalProvider[] {
  if (!contribution.relevant) return [];
  const selectedCaps = new Set(contribution.capabilities.map((c) => c.toLowerCase()));
  const selectedTools = new Set(contribution.tools.map((t) => t.toLowerCase()));

  const cards: ProposalProvider[] = [];
  for (const row of providers) {
    const rowCaps = (row.capabilities ?? []).filter((c) => selectedCaps.has(c.toLowerCase()));
    if (rowCaps.length === 0) continue; // this SPARC service isn't relevant to this phase
    const rowTools = (row.tools ?? []).filter((t) => selectedTools.has(t.toLowerCase()));
    cards.push({
      name: row.name,
      verified: true,
      speciality: row.speciality,
      capabilities: rowCaps,
      tools: rowTools,
      how: contribution.how,
      estimated_cost: row.estimated_cost,
      cost_symbol: costSymbol(row.estimated_cost),
      estimated_timeline: row.estimated_timeline,
      is_free: row.is_free ?? false,
      contact: row.contact,
    });
  }
  return cards;
}

// ── Relevant research (reuses the live /api/discover engine) ──────────────────

// Pull real papers once for the whole proposal (scoped to the therapeutic
// target), then distribute across phases. Reuses /api/discover wholesale via an
// internal request so we don't duplicate or destabilise the source fetchers.
// Any failure returns [] and never blocks the proposal.
async function fetchPaperPool(origin: string, query: string): Promise<ProposalPaper[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `${origin}/api/discover?q=${encodeURIComponent(query.slice(0, 200))}`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: DiscoverItem[] };
    return (data.items ?? [])
      .filter((i) => i.type === "paper")
      // Source APIs embed HTML/XML in titles (<scp>, <i>, &amp;) — clean to plain
      // text here so output_data, the PDF, and saved projects are all clean.
      .map((i) => ({
        id: i.id,
        title: cleanText(i.title),
        source: cleanText(i.source),
        date: i.date,
        url: i.url,
      }));
  } catch {
    return [];
  }
}

// ── Prompt ────────────────────────────────────────────────────────────────────

const PROPOSAL_SYSTEM_PROMPT = `You are a drug-discovery program strategist at UAB SPARC. A researcher gives you a project described across the 7 sections of an RFA proposal. Produce a PHASED discovery plan that turns their project into a sequence of concrete phases.

Return ONLY valid JSON, no markdown, no explanation, in this exact shape:
{
  "title": "string — a concise proposal title",
  "summary": "string — one sentence summarising the strategy",
  "phases": [
    {
      "id": "string — slug like phase-1",
      "title": "string — e.g. Target Validation & Feasibility",
      "goal": "string — what this phase achieves",
      "estimated_duration": "string — e.g. 6-9 weeks",
      "sparc": { "relevant": boolean, "capabilities": ["..."], "tools": ["..."], "how": "string" }
    }
  ]
}

PHASES: Aim for 3 phases that follow the natural arc — typically (1) Target Validation & Feasibility, (2) AI-Enabled Design & Candidate Generation, (3) Validation Planning & Translational Path — but you MAY use 2 or 4 phases if the project clearly warrants it. Do NOT lock to exactly 3, and there is no special "final phase" treatment.

Each phase's "goal" must be specific to THIS researcher's target and rationale, not generic boilerplate.

You do NOT choose providers or papers — the system attaches real, verified providers and real research to each phase. Your ONLY provider-related job is the "sparc" field per phase (see the SPARC rules below). Never output company names, CROs, tools, or papers anywhere else in the JSON.`;

function buildUserMessage(input: ProposalInput): string {
  const chips = (input.support_chips ?? []).filter(Boolean).join(", ") || "None specified";
  return `Generate a phased discovery proposal for this project:

Title / Team: ${input.title_and_team}
Therapeutic target / what they have: ${input.therapeutic_target}
Scientific rationale: ${input.scientific_rationale}
Support needed from SPARC/providers: ${input.sparc_support_needed || "Not specified"}
Validation plan: ${input.validation_plan || "Not specified"}
Expected impact: ${input.expected_impact || "Not specified"}
Project readiness: ${input.project_readiness || "Not specified"}
Type of support requested (chips): ${chips}

Return only the JSON proposal document.`;
}

// ── Input parsing ─────────────────────────────────────────────────────────────

function parseInput(body: Record<string, unknown>): ProposalInput | null {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const input: ProposalInput = {
    title_and_team: str(body.title_and_team),
    therapeutic_target: str(body.therapeutic_target),
    scientific_rationale: str(body.scientific_rationale),
    sparc_support_needed: str(body.sparc_support_needed),
    validation_plan: str(body.validation_plan),
    expected_impact: str(body.expected_impact),
    project_readiness: str(body.project_readiness),
    support_chips: Array.isArray(body.support_chips)
      ? body.support_chips.filter((c): c is string => typeof c === "string")
      : [],
  };
  // Core science fields are required; the rest are recommended but optional.
  if (!input.title_and_team || !input.therapeutic_target || !input.scientific_rationale) {
    return null;
  }
  return input;
}

function buildRecap(input: ProposalInput): ProposalRecap {
  return {
    title: input.title_and_team,
    therapeutic_target: input.therapeutic_target,
    scientific_rationale: input.scientific_rationale,
    sparc_support_needed: input.sparc_support_needed,
    validation_plan: input.validation_plan,
    expected_impact: input.expected_impact,
    project_readiness: input.project_readiness,
    support_chips: input.support_chips ?? [],
  };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const input = parseInput(body as Record<string, unknown>);
  if (!input) {
    return NextResponse.json(
      { error: "Missing required fields: title, therapeutic target, and scientific rationale." },
      { status: 400 },
    );
  }

  // Fetch SPARC first — its real capabilities/tools must be in hand BEFORE the
  // LLM call so we can inject them as grounding for the per-phase selection.
  const internalProviders = await fetchInternalProviders();
  const grounding = collectGrounding(internalProviders);

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    return NextResponse.json({ error: "GROQ_API_KEY not configured" }, { status: 500 });
  }

  const systemPrompt =
    PROPOSAL_SYSTEM_PROMPT + buildSparcGrounding(grounding.capabilities, grounding.tools);

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
        { role: "user", content: buildUserMessage(input) },
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

  // Parse JSON — tolerant of markdown fences (carried forward from generate-roadmap).
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        parsed = null;
      }
    }
  }
  if (!parsed) {
    console.error("Failed to parse Groq response:", content);
    return NextResponse.json({ error: "Failed to parse AI response. Please try again." }, { status: 500 });
  }

  // Pull real papers once (scoped to the therapeutic target) and distribute
  // across phases — top-ranked papers to the earliest phases.
  const paperPool = await fetchPaperPool(req.nextUrl.origin, input.therapeutic_target);
  const PAPERS_PER_PHASE = 2;
  let paperCursor = 0;

  const rawPhases = Array.isArray(parsed.phases) ? (parsed.phases as Record<string, unknown>[]) : [];
  const phases: ProposalPhase[] = rawPhases.map((p, i) => {
    const contribution = sanitizeSparcSelection(p.sparc, grounding.capabilities, grounding.tools);
    const providers = buildPhaseProviders(contribution, internalProviders);
    const papers = paperPool.slice(paperCursor, paperCursor + PAPERS_PER_PHASE);
    paperCursor += PAPERS_PER_PHASE;
    return {
      id: typeof p.id === "string" && p.id.trim() ? p.id.trim() : `phase-${i + 1}`,
      title: typeof p.title === "string" ? p.title : `Phase ${i + 1}`,
      goal: typeof p.goal === "string" ? p.goal : "",
      estimated_duration: typeof p.estimated_duration === "string" ? p.estimated_duration : "",
      providers,
      papers,
    };
  });

  const document: ProposalDocument = {
    title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : input.title_and_team,
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
    recap: buildRecap(input),
    phases,
  };

  return NextResponse.json(document);
}
