// ── Shared types for the Navigator (Target / Discovery / Validation spaces) ───

export type Provider = {
  name: string;
  type: string;
  description: string;
  website: string;
  free: boolean;
};

export type ResearcherMini = {
  id: string;
  name: string;
  email: string;
  research_focus: string | null;
  interests: string[] | null;
  profile_slug: string | null;
};

// ── Target Space ────────────────────────────────────────────────────────────

export type TargetStep = {
  id: string; // identify | score | assess | fine-tune
  name: string;
  description: string;
  scoring_criteria: string[];
  tools: string[];
  providers: Provider[];
};

export type TargetRoadmap = {
  space: "target";
  title: string;
  summary: string;
  steps: TargetStep[];
};

// ── Discovery Space ─────────────────────────────────────────────────────────

export type PrioritizedMolecule = {
  id: string;
  priority_rank: number;
  reasoning: string;
};

export type CROPartner = {
  name: string;
  description: string;
  website: string;
  estimated_cost: string;
  estimated_timeline: string;
  free: false;
};

export type DiscoveryIteration = {
  id: string; // hit-finding | lead-optimization
  name: string;
  description: string;
  tools_and_software: Provider[];
  cro_partners: CROPartner[];
};

export type DiscoveryRoadmap = {
  space: "discovery";
  title: string;
  summary: string;
  prioritized_molecules: PrioritizedMolecule[];
  entry_points: string[];
  iterations: DiscoveryIteration[];
};

// ── Validation Space ────────────────────────────────────────────────────────

export type ContextLevel = {
  level: number;
  name: string;
  description: string;
  is_current: boolean;
  experiments: string[];
  cost_range: string;
  timeline: string;
  tools: string[];
  providers: Provider[];
};

export type ValidationRoadmap = {
  space: "validation";
  title: string;
  summary: string;
  current_level: number;
  context_levels: ContextLevel[];
};
