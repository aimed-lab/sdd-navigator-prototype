# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SDD Navigator is a drug-discovery research roadmap platform with two fully independent parts:
- **Frontend**: Next.js 16 app (App Router, React 19, TypeScript, Tailwind CSS, `@supabase/ssr`)
- **Backend**: Python pipeline — podcast RSS → Whisper transcription → Groq LLM extraction → Supabase REST

---

## Commands

### Frontend (`cd frontend`)
```bash
npm run dev      # dev server on localhost:3000
npm run build    # production build (also type-checks)
npm run lint     # ESLint
npx tsc --noEmit # type-check only
```

### Backend (`cd backend`)
```bash
# Activate venv first (Windows: venv\Scripts\activate)
pip install -r requirements.txt   # requires ffmpeg on PATH (winget install ffmpeg)

cd agent
python pipeline.py                # latest unprocessed episode
python pipeline.py --episode N    # specific episode
python pipeline.py --all          # all unprocessed episodes
python pipeline.py --retry-failed # retry failed episodes
python graph_agent.py             # rebuild knowledge graph only
```

---

## Environment Variables

**Frontend** — `frontend/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

**Backend** — `backend/.env`:
```
SUPABASE_URL=
SUPABASE_KEY=     # service-role key (not anon)
GROQ_API_KEY=
RSS_URL=          # optional override; defaults to the UAB SPARC podcast feed
```

---

## Architecture

### Frontend

**Route protection** via `frontend/middleware.ts`:
- Only `/navigator` is protected — middleware calls `supabase.auth.getUser()` (validates JWT server-side) and redirects unauthenticated users to `/login?callbackUrl=/navigator`.
- `/graph` is intentionally **public** — it shows an inline lock-screen component when the user is not logged in, not a middleware redirect.
- Everything else is public.

**Auth flow**:
- `lib/supabase.ts` exports a singleton created with `createBrowserClient` from `@supabase/ssr` (cookie-based storage — required for middleware to read the session).
- `context/AuthContext.tsx` exposes `{ user, session, loading, displayName, signOut }` via `useAuth()`. `displayName` reads from `user.user_metadata.name`, falls back to email prefix. Must be used inside `"use client"` components only.
- Login reads `?callbackUrl=` and redirects there after sign-in (default `/knowledge-hub`).
- Register calls `supabase.auth.signUp()` with user metadata + inserts a row into `public.users`, then redirects to `/knowledge-hub`.

**App Router pages** (`frontend/app/`):
- `layout.tsx` — root layout, wraps everything in `<AuthProvider>`, loads Inter + Material Symbols fonts from Google CDN.
- `page.tsx` — landing page (server component, uses `ParticleCanvas`).
- `knowledge-hub/page.tsx` — episode card grid, client component (search state).
- `topics/[slug]/page.tsx` — wiki article server component; `CommentsSection` is a nested `"use client"` child.
- `graph/page.tsx` — D3.js force-directed knowledge graph; fetches from `nodes`, `edges`, and `wiki_pages` tables; D3 owns the SVG DOM inside a `<div ref>`, React owns the sidebar/modal/controls.
- `navigator/page.tsx` — protected by middleware.

**Design system** (defined in `tailwind.config.ts`, UAB green theme):
- Key colors: `primary` `#00523c`, `primary-container` `#1e6b52`, `on-primary` `#ffffff`, `background` `#f8f9fa`, `secondary-container` `#b4ecd3`.
- Knowledge graph node colors (not in Tailwind — used as inline styles): episode `#1E6B52`, concept `#0d9488`, resource `#FFD602`.
- All custom spacing/font tokens (`font-body-md`, `font-label-md`, `stack-md`, `gutter`, `margin-desktop`, etc.) come from `tailwind.config.ts`.
- Icons: `<span className="material-symbols-outlined">{icon_name}</span>`.

### Backend Pipeline (`backend/agent/`)

Five modules; `pipeline.py` orchestrates all of them:

1. **`transcribe.py`** — parses RSS (feedparser), three-strategy episode number extraction (iTunes tag → title regex → position), downloads MP3 to a temp file, runs local Whisper `base` model, writes `backend/output/episode_{N}.json` with `{metadata, transcript}`. Skips download if the JSON already exists (cache).

2. **`extract.py`** — sends transcript to Groq `llama-3.3-70b-versatile`, returns structured JSON: `{ title, episode_number, slug, description, summary[], concepts[{title, bullets[]}], tags[], entities{drugs, proteins, targets, tools} }`. Auto-retries once if required fields are empty or JSON parse fails. Transcript trimmed to ~24k chars if too long.

3. **`validator.py`** — quality gate: checks transcript word count ≥ 500, concepts ≥ 3, each concept has ≥ 2 bullets, summary ≥ 4 bullets, entities non-empty, slug URL-safe. Prints PASS/FAIL per check; never blocks saving.

4. **`pipeline.py`** — orchestrates steps 1–3, saves to Supabase via raw REST (`requests` only — `supabase-py` excluded due to Python 3.14 / httpcore incompatibility), then calls `graph_agent`. Tracks state in `backend/output/progress.json` as `{ processed: [], failed: [], remaining: [] }` so runs are resumable.

5. **`graph_agent.py`** — reads all `wiki_pages` from Supabase, creates/updates `nodes` and `edges` tables. Loads all existing node labels and edge pairs at startup to avoid duplicates. Node types: `episode` (label = page title), `concept`, `resource`. Edges: `episode→concept` (`has_concept`), `concept→concept` (`shared_concept`, when co-occurring in same episode), `concept→resource` (`related_to`).

### Supabase Tables

| Table | Key columns |
|---|---|
| `wiki_pages` | `id, slug, title, episode_number, transcript, description, summary (jsonb), concepts (jsonb[{title,bullets}]), tags (text[]), entities (jsonb), episode_url` |
| `nodes` | `id, label, type (episode\|concept\|resource), description` |
| `edges` | `id, source_id (→nodes), target_id (→nodes), relationship` |
| `comments` | `id, wiki_page_slug, user_id, author_name, affiliation, content, created_at` |
| `users` | `id (= auth.uid), name, email, affiliation, institution, country` |

**Required migration** (run once in Supabase SQL editor if not already applied):
```sql
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS entities JSONB DEFAULT '{}';
```

### Key Constraints

- **No `supabase-py`** anywhere in the backend — use raw `requests` to the PostgREST REST API. The pattern is in `pipeline.py`: `_sb_url(table)`, `_sb_headers()`, `_sb_post()`.
- **No `nodes`/`edges` fields** in the Groq extraction prompt — graph construction is entirely `graph_agent`'s responsibility, driven by `wiki_pages.concepts` and `wiki_pages.entities`.
- **`"use client"`** boundary: `useAuth()`, `useRouter()`, `useSearchParams()` are client-only. `useSearchParams()` must be wrapped in `<Suspense>` (see `login/page.tsx`).
- The frontend `supabase` singleton must stay as `createBrowserClient` (not `createClient` from `supabase-js`) so middleware cookie sync works.
