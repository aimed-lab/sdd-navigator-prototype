# SDD Navigator
> AI-powered research roadmap platform built at UAB SPARC

## Overview
SDD Navigator connects researchers worldwide to
personalized research roadmaps — from their current
assets to their end goals — powered by AI with
matched global service providers at each stage.

Built under Prof. Jake Chen at UAB SPARC.

## Live Site
https://sdd-navigator-six.vercel.app

## Tech Stack
- Frontend: Next.js 15 + Tailwind CSS
- Database: Supabase (PostgreSQL)
- Auth: Supabase Auth
- AI: Groq API (llama-3.3-70b-versatile)
- Transcription: OpenAI Whisper
- Graph: D3.js
- Hosting: Vercel
- Pipeline: Python + feedparser

## Project Structure
```
sdd-navigator/
├── frontend/     → Next.js application
├── backend/      → Python pipeline agents
├── database/     → SQL schema
└── .github/      → GitHub Actions workflows
```

## Setup

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend Pipeline
```bash
cd backend
pip install -r requirements.txt
python agent/pipeline.py --episode 43
```

### Environment Variables

`frontend/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GROQ_API_KEY=
GITHUB_TOKEN=
```

`backend/.env`:
```
GROQ_API_KEY=
SUPABASE_URL=
SUPABASE_KEY=
RSS_URL=
```

## Running the Pipeline
```bash
# Process latest episode
python agent/pipeline.py

# Process specific episode
python agent/pipeline.py --episode 43

# Process all episodes
python agent/pipeline.py --all

# Retry failed episodes
python agent/pipeline.py --retry-failed
```

## Database
Schema available in `database/schema.sql`. Run in Supabase SQL Editor to recreate.

## Built By
Karthikeya Thimirishetty  
UAB SPARC — University of Alabama at Birmingham
