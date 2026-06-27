-- =============================================================================
-- SDD Navigator — Complete Database Schema
-- =============================================================================
-- Run this in the Supabase SQL editor to recreate the database from scratch.
-- Order matters: tables with foreign keys come after their dependencies.
-- auth.users is managed by Supabase Auth and is not recreated here.
-- =============================================================================


-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid() on older PG versions


-- =============================================================================
-- TABLE: users
-- =============================================================================
-- One row per registered researcher.
-- id mirrors auth.users.id so we can JOIN on it from any table.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id             UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    name           TEXT,
    email          TEXT        NOT NULL DEFAULT '',
    affiliation    TEXT,                               -- "Researcher" | "Laboratory Head" | etc.
    institution    TEXT,
    country        TEXT,
    bio            TEXT,
    research_focus TEXT,
    linkedin_url   TEXT,
    website_url    TEXT,
    interests      TEXT[]      DEFAULT '{}',
    is_public      BOOLEAN     NOT NULL DEFAULT false,
    profile_slug   TEXT        UNIQUE,
    notify_weekly  BOOLEAN     NOT NULL DEFAULT false,    -- /settings → Notifications
    notify_daily   BOOLEAN     NOT NULL DEFAULT false,    -- /settings → Notifications
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read and manage only their own profile row.
CREATE POLICY "users_select_own"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "users_insert_own"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own"
    ON public.users FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);


-- =============================================================================
-- TABLE: wiki_pages
-- =============================================================================
-- One row per processed podcast episode.
-- Populated exclusively by the Python backend pipeline (service-role key).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.wiki_pages (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug           TEXT        NOT NULL UNIQUE,          -- URL-safe identifier
    title          TEXT        NOT NULL,
    episode_number INTEGER     UNIQUE,
    transcript     TEXT,                                 -- full Whisper transcript
    episode_url    TEXT,                                 -- Spotify/Anchor episode link
    image_url      TEXT,                                 -- RSS feed artwork URL
    description    TEXT,                                 -- one-sentence summary from LLM
    summary        TEXT[]      DEFAULT '{}',             -- string[]
    concepts       JSONB       DEFAULT '[]',             -- {title: string, bullets: string[]}[]
    tags           TEXT[]      DEFAULT '{}',
    entities       JSONB       DEFAULT '{}',             -- {drugs, proteins, targets, tools}
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wiki_pages ENABLE ROW LEVEL SECURITY;

-- Public read access — episode wiki pages are open to everyone.
CREATE POLICY "wiki_pages_select_public"
    ON public.wiki_pages FOR SELECT
    USING (true);

-- Only the service-role key (backend pipeline) may write rows.
-- Authenticated users and anon have no INSERT/UPDATE/DELETE.
-- (No explicit policy needed to block; RLS denies by default.)


-- =============================================================================
-- TABLE: nodes
-- =============================================================================
-- Knowledge graph nodes built by graph_agent.py from wiki_pages data.
-- Three types: episode, concept, resource (drug/protein/target/tool).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.nodes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    label       TEXT        NOT NULL UNIQUE,    -- display name; unique across all types
    type        TEXT        NOT NULL            -- 'episode' | 'concept' | 'resource'
                    CHECK (type IN ('episode', 'concept', 'resource')),
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;

-- Public read — the knowledge graph is visible to all (incl. unauthenticated users).
CREATE POLICY "nodes_select_public"
    ON public.nodes FOR SELECT
    USING (true);


-- =============================================================================
-- TABLE: edges
-- =============================================================================
-- Directed relationships between knowledge graph nodes.
--   episode  → concept   (has_concept)
--   concept  → concept   (shared_concept — co-occur in same episode)
--   concept  → resource  (related_to)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.edges (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id    UUID        NOT NULL REFERENCES public.nodes (id) ON DELETE CASCADE,
    target_id    UUID        NOT NULL REFERENCES public.nodes (id) ON DELETE CASCADE,
    relationship TEXT        NOT NULL,   -- 'has_concept' | 'shared_concept' | 'related_to'
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_id, target_id)        -- prevent duplicate edges
);

ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "edges_select_public"
    ON public.edges FOR SELECT
    USING (true);


-- =============================================================================
-- TABLE: providers
-- =============================================================================
-- Service-provider directory for the Navigator.
--   type = 'internal'  → UAB SPARC (computational / dry-lab).
--   type = 'external'  → CROs and other wet-lab services SPARC doesn't do.
-- The internal (SPARC) rows are wired into the Navigator: /api/generate-roadmap
-- reads them and the LLM selects, per roadmap step, which SPARC capabilities/
-- tools are relevant (see SparcStepCard). SPARC is modelled as ONE row PER
-- service area (speciality) — each row carries its own capability, in-house
-- tools, price and turnaround — so the roadmap can match the right service to
-- the right step. External CROs are still LLM-generated per project, not stored.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.providers (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name               TEXT        NOT NULL,
    type               TEXT        NOT NULL DEFAULT 'external'   -- 'internal' (SPARC) | 'external' (CRO)
                           CHECK (type IN ('internal', 'external')),
    speciality         TEXT,                                -- headline service area for this row
    capabilities       TEXT[]      NOT NULL DEFAULT '{}',   -- service areas / what they do
    tools              TEXT[]      NOT NULL DEFAULT '{}',   -- in-house software / methods
    estimated_cost     TEXT,                                -- typical price for this service
    estimated_timeline TEXT,                                -- typical turnaround for this service
    is_free            BOOLEAN     NOT NULL DEFAULT false,  -- free to UAB researchers?
    verified           BOOLEAN     NOT NULL DEFAULT false,  -- confirmed real internal provider
    stage_tags         TEXT[],                              -- drug-discovery stage labels (nullable)
    contact            TEXT,                                -- website URL or email (read by the app)
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

-- Public read — provider directory is openly browsable.
CREATE POLICY "providers_select_public"
    ON public.providers FOR SELECT
    USING (true);

-- Seed: UAB SPARC — the one real internal provider, modelled as six rows, one
-- per service area (speciality). Each row carries its own capability, in-house
-- tools, price and turnaround. This mirrors the live database exactly. External
-- CROs are LLM-generated per project in /api/generate-roadmap, not stored here.
INSERT INTO public.providers
    (name, type, speciality, capabilities, tools, estimated_cost, estimated_timeline, is_free, verified, contact)
SELECT v.name, v.type, v.speciality, v.capabilities, v.tools,
       v.estimated_cost, v.estimated_timeline, v.is_free, v.verified, v.contact
FROM (VALUES
    ('UAB SPARC', 'internal', 'Pathway & gene-set enrichment analysis',
        ARRAY['Pathway & gene-set enrichment analysis'], ARRAY['PAGER','PAGED','HPD'],
        '$1,200', '2–3 weeks', false, true, 'https://sites.uab.edu/sparc'),
    ('UAB SPARC', 'internal', 'Protein-interaction network analysis',
        ARRAY['Protein-interaction network analysis'], ARRAY['HAPPI','ProteoLens'],
        '$1,500', '2–4 weeks', false, true, 'https://sites.uab.edu/sparc'),
    ('UAB SPARC', 'internal', 'Network-based biomarker prioritization',
        ARRAY['Network-based biomarker prioritization'], ARRAY['WINNER','WIPER','BEERE'],
        '$1,800', '3–4 weeks', false, true, 'https://sites.uab.edu/sparc'),
    ('UAB SPARC', 'internal', 'Single-cell & spatial biomarker discovery',
        ARRAY['Single-cell & spatial biomarker discovery'], ARRAY['PGC','SpatialRSP'],
        '$2,000', '3–5 weeks', false, true, 'https://sites.uab.edu/sparc'),
    ('UAB SPARC', 'internal', 'Multi-omics visualization',
        ARRAY['Multi-omics visualization'], ARRAY['GeneTerrain','Mondrian Map'],
        '$1,000', '1–2 weeks', false, true, 'https://sites.uab.edu/sparc'),
    ('UAB SPARC', 'internal', 'Drug repositioning / network pharmacology',
        ARRAY['Drug repositioning / network pharmacology'], ARRAY['C2-Maps','HOMER'],
        '$1,600', '2–4 weeks', false, true, 'https://sites.uab.edu/sparc')
) AS v(name, type, speciality, capabilities, tools,
       estimated_cost, estimated_timeline, is_free, verified, contact)
WHERE NOT EXISTS (
    SELECT 1 FROM public.providers WHERE name = 'UAB SPARC' AND type = 'internal'
);


-- =============================================================================
-- TABLE: discovery_items
-- =============================================================================
-- Research signals (papers, preprints, grants, trials, patents, repos, news)
-- collected from external APIs by the Python Discovery engine (discover.py),
-- deduped + relevance-ranked, then upserted by dedup_key. Independent of the
-- podcast pipeline. Written only by the service-role key; openly readable.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.discovery_items (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    type           TEXT        NOT NULL,                 -- paper | preprint | grant | trial | patent | repo | news
    title          TEXT        NOT NULL,
    description    TEXT        DEFAULT '',
    source         TEXT        NOT NULL,                 -- PubMed | OpenAlex | Crossref | NIH Reporter | ...
    url            TEXT,
    published_date DATE,
    score          SMALLINT    NOT NULL DEFAULT 1,       -- relevance score 1-5
    topics         TEXT[]      NOT NULL DEFAULT '{}',
    dedup_key      TEXT        NOT NULL UNIQUE,          -- stable idempotent upsert key
    raw            JSONB       NOT NULL DEFAULT '{}',     -- original source payload
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    collected_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discovery_items ENABLE ROW LEVEL SECURITY;

-- Public read — the Discovery feed is openly browsable.
CREATE POLICY "discovery_items_select_public"
    ON public.discovery_items FOR SELECT
    USING (true);

-- Only the service-role key (backend Discovery engine) may write rows.
-- (RLS denies anon/authenticated writes by default — no explicit policy needed.)


-- =============================================================================
-- TABLE: comments
-- =============================================================================
-- Researcher discussion threads attached to individual wiki pages.
-- name and affiliation are read at display time via JOIN to users —
-- they are not stored in the comments row itself.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.comments (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    wiki_id    UUID        NOT NULL REFERENCES public.wiki_pages (id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES auth.users (id)        ON DELETE CASCADE,
    content    TEXT        NOT NULL CHECK (char_length(content) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Anyone (including unauthenticated visitors) can read comments.
CREATE POLICY "comments_select_public"
    ON public.comments FOR SELECT
    USING (true);

-- Authenticated users may insert comments attributed to themselves only.
CREATE POLICY "comments_insert_own"
    ON public.comments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Authors can edit their own comments.
CREATE POLICY "comments_update_own"
    ON public.comments FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Authors can delete their own comments.
CREATE POLICY "comments_delete_own"
    ON public.comments FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- =============================================================================
-- INDEXES
-- =============================================================================
-- Additional indexes on columns used in frequent queries / filters.

CREATE INDEX IF NOT EXISTS idx_wiki_pages_episode_number ON public.wiki_pages (episode_number);
CREATE INDEX IF NOT EXISTS idx_wiki_pages_slug           ON public.wiki_pages (slug);
CREATE INDEX IF NOT EXISTS idx_nodes_type                ON public.nodes (type);
CREATE INDEX IF NOT EXISTS idx_edges_source              ON public.edges (source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target              ON public.edges (target_id);
CREATE INDEX IF NOT EXISTS idx_comments_wiki_id          ON public.comments (wiki_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id          ON public.comments (user_id);
CREATE INDEX IF NOT EXISTS idx_providers_type            ON public.providers (type);
CREATE INDEX IF NOT EXISTS idx_discovery_items_type      ON public.discovery_items (type);
CREATE INDEX IF NOT EXISTS idx_discovery_items_collected ON public.discovery_items (collected_at DESC);


