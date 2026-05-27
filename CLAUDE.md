# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SDD Navigator is a research roadmap platform for drug discovery. It has two independent parts:
- **Frontend**: Next.js 16 app (App Router, React 19, TypeScript, Tailwind CSS, Supabase JS)
- **Backend**: Python pipeline that ingests podcast RSS → Whisper transcription → Groq LLM extraction → Supabase REST insertion

---

## Commands

### Frontend (`cd frontend`)
```bash
npm run dev      # dev server on localhost:3000
npm run build    # production build
npm run lint     # ESLint
```

### Backend (`cd backend`)
```bash
# Activate venv first (Windows: venv\Scripts\activate)
pip install -r requirements.txt           # one-time setup; also requires ffmpeg on PATH

python agent/pipeline.py                  # transcribe + extract latest episode
python agent/pipeline.py --all            # process every episode not yet in Supabase
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
SUPABASE_KEY=          # service-role key (not anon)
GROQ_API_KEY=
RSS_URL=               # optional override for podcast RSS feed
```

---

## Architecture

### Frontend

**App Router layout** (`frontend/app/`):
- `layout.tsx` — root layout, wraps everything in `<AuthProvider>`
- `page.tsx` — landing page (server component)
- `knowledge-hub/page.tsx` — episode card grid, client component (search state)
- `topics/[slug]/page.tsx` — wiki article, server component; `CommentsSection` is a nested client component
- `login/`, `register/`, `navigator/`, `graph/` — other pages

**Key shared modules**:
- `lib/supabase.ts` — singleton `supabase` client (anon key, works in both server and client contexts)
- `context/AuthContext.tsx` — `useAuth()` hook providing `{ user, session, loading, signOut }`; must be used inside client components only
- `components/Navbar.tsx` — `"use client"`, consumes `useAuth()`
- `components/ParticleCanvas.tsx` — canvas animation, `"use client"`

**Design system** (all defined in `tailwind.config.ts`):
- Dark cyan theme: `primary` = `#e9feff`, `primary-container` = `#00f5ff`, `background` = `#0e1322`
- Custom fonts: `font-body-md` (Inter), `font-headline-lg`/`font-display-lg` (Hanken Grotesk), `font-data-label`/`font-code-sm` (JetBrains Mono)
- Utility class `.glass-card` (in `globals.css`): frosted glass card with `backdrop-filter: blur(20px)`
- Icons: Material Symbols Outlined, loaded via Google Fonts CDN in `layout.tsx` — use `<span className="material-symbols-outlined">{icon_name}</span>`
- `status-pulse` color + `.status-pulse-ring` animation for live-indicator dots

### Backend Pipeline (`backend/agent/`)

Three modules run in sequence via `pipeline.py`:

1. **`transcribe.py`** — parses podcast RSS (feedparser), downloads MP3s to a temp file, runs local Whisper `base` model (CPU, ~140 MB download on first run), writes `backend/output/episode_{N}.json`

2. **`extract.py`** — sends transcript to Groq (`llama-3.3-70b-versatile`), returns structured JSON: `{ title, slug, summary, concepts[{title, bullets}], tags, entities, nodes, edges }`; transcript is trimmed to ~24k chars if too long

3. **`pipeline.py`** — orchestrates the above, then persists to Supabase via raw REST API (no `supabase-py` — it's excluded due to Python 3.14 httpcore incompatibility):
   - `wiki_pages` table: `slug, title, episode_number, transcript, concepts (text[]), tags (text[])`
   - `nodes` table: `label, type, description`
   - `edges` table: `source_id, target_id, relationship`

### Supabase Tables

| Table | Key columns |
|---|---|
| `wiki_pages` | `id, slug, title, episode_number, transcript, concepts (text[]), tags (text[])` |
| `nodes` | `id, label, type (episode\|concept\|resource), description` |
| `edges` | `id, source_id, target_id, relationship` |
| `comments` | `id, wiki_page_slug, user_id, author_name, affiliation, content, created_at` |

`concepts` in `wiki_pages` is a flat `text[]` of concept titles (bullet points are not persisted by the current pipeline).
