# SDD Navigator

> AI-powered drug-discovery research roadmap platform, built at UAB SPARC.

SDD Navigator turns a researcher's current assets and goals into a personalized,
stage-by-stage drug-discovery roadmap — pairing each step with the right
computational tools, real internal UAB SPARC services, and external CRO
partners. It also runs a living knowledge base built from the lab's research
podcast and a real-time radar of new papers, preprints, grants, trials, and
patents across the field.

Built under Prof. Jake Chen at UAB SPARC (Systems Pharmacology AI Research Center,
University of Alabama at Birmingham).

**Live site:** https://sdd-navigator-six.vercel.app

---

## Features

- **Navigator — 3-space AI roadmap generator.** Three independent guided spaces
  (Target, Discovery, Validation). The researcher describes their project and an
  LLM (Groq `llama-3.3-70b-versatile`) generates a structured, stage-by-stage
  roadmap with scoring criteria, recommended software, and matched providers.
- **Step-specific UAB SPARC matching (from the database).** SPARC's real
  capabilities and tools are read from the `providers` table and passed to the
  model as grounding. For each roadmap step the model selects only the SPARC
  services genuinely relevant to that step (with a short "how it helps"
  explanation) — it cannot invent tools; the server re-validates every selection
  against the database. External CROs are AI-matched per project.
- **Live Research Radar.** Inside the Discovery space, a project-scoped feed
  pulls fresh signals beside the generated roadmap, independent of roadmap
  generation, with a request-sequence guard so a stale response can't overwrite
  a newer query.
- **Discovery live-feed engine.** Aggregates PubMed, OpenAlex, Crossref, NIH
  Reporter, ClinicalTrials.gov, Google Patents, and bioRxiv into one sorted,
  relevance-scored list. A separate Python collection engine dedupes, ranks, and
  persists these signals to Supabase.
- **Knowledge Hub.** Searchable grid of processed podcast episodes plus Discover,
  Researchers, and Graph tabs, with per-episode wiki pages and threaded comments.
- **D3 knowledge graph.** Force-directed graph of episodes, concepts, and
  resources, built automatically from extracted episode data.
- **Podcast pipeline.** RSS → Whisper transcription → Groq LLM extraction →
  Supabase, producing the wiki pages and graph above. Resumable and idempotent.
- **Researcher profiles.** Public researcher pages with a profile-editing flow;
  the Navigator surfaces researchers whose focus matches a roadmap step.
- **Auth & settings.** Supabase email/password auth (cookie-based, middleware
  route protection) and an account settings area (profile, account, notifications).
- **PostHog analytics.** Pageviews plus funnel event tracking, fully optional and
  never load-bearing.

> The Navigator's "guided placement" tile is an intentional **Coming soon**
> placeholder for a future roadmapped feature.

---

## Tech Stack

- **Frontend:** Next.js 16.2.6 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS
- **Auth & Database:** Supabase (PostgreSQL, Row Level Security, `@supabase/ssr`)
- **AI:** Groq API (`llama-3.3-70b-versatile`)
- **Transcription:** OpenAI Whisper (`large-v3`, run locally)
- **Knowledge graph:** D3.js
- **Analytics:** PostHog
- **Backend pipeline:** Python (feedparser, requests)
- **Hosting:** Vercel

---

## Project Structure

```
sdd-navigator/
├── frontend/     → Next.js application
├── backend/      → Python pipeline
└── database/     → SQL schema (schema.sql)
```

---

## Setup

### Frontend

```bash
cd frontend
npm install
npm run dev          # dev server on http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build (also type-checks)
npm run lint         # ESLint
npx tsc --noEmit     # type-check only
```

### Backend

Requires **Python 3.12+** and **ffmpeg** on your PATH (Whisper needs it):

```bash
# Windows: winget install ffmpeg     |  macOS: brew install ffmpeg

cd backend
python -m venv venv
venv\Scripts\activate                # Windows
# source venv/bin/activate           # macOS / Linux
pip install -r requirements.txt
```

**Podcast pipeline** (RSS → Whisper → Groq → Supabase):

```bash
cd podcast-agent
python pipeline.py                   # latest unprocessed episode
python pipeline.py --episode 43      # a specific episode
python pipeline.py --all             # all unprocessed episodes
python pipeline.py --retry-failed    # retry failed episodes
python graph_agent.py                # rebuild the knowledge graph only
```

---

## Environment Variables

**`frontend/.env.local`:**

```
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase anon (public) key
GROQ_API_KEY=                      # server-side, used by /api/generate-roadmap
GITHUB_TOKEN=                      # server-side, used by /api/feedback to file issues
SUPABASE_SERVICE_ROLE_KEY=         # server-side ONLY, used by /api/delete-account — never expose to the client
NEXT_PUBLIC_POSTHOG_KEY=           # optional — enables analytics when set
NEXT_PUBLIC_POSTHOG_HOST=          # optional — defaults to https://us.i.posthog.com
```

**`backend/.env`:**

```
SUPABASE_URL=                      # same project URL
SUPABASE_KEY=                      # service-role key (not the anon key)
GROQ_API_KEY=
RSS_URL=                           # optional — defaults to the UAB SPARC podcast feed
```

---

## Database

The complete schema lives in [`database/schema.sql`](database/schema.sql) — run
it in the Supabase SQL editor to recreate every table (users, wiki_pages, nodes,
edges, providers, comments) with Row Level Security policies,
indexes, and the UAB SPARC provider seed. `auth.users` is managed by Supabase
Auth and is not recreated by the script.

---

## Built By

**Karthikeya Thimirishetty**
UAB SPARC — University of Alabama at Birmingham
