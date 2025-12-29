# Reddit Mastermind

AI‑powered Reddit content planning that turns a company brief, personas, and subreddit targets into a realistic weekly calendar of posts + threaded conversations.

Built for teams who care about narrative quality, not just volume.

---

## Why it stands out

- **Multi‑persona realism**: OP + commenters are assigned with constraints that prevent obvious coordination.
- **Quality guardrails**: Anti‑promo checks, voice consistency, timing realism, and duplication detection.
- **Calendar‑first workflow**: View weeks at a glance, drill into threads, and edit in context.
- **Seeded demo data**: Slideforge is auto‑seeded so reviewers can explore immediately after login.

---

## Product tour

1. **Login** → see the full dashboard (no empty state).
2. **Overview** → calendar + thread preview.
3. **Generate** → multi‑week calendars with quality scoring.
4. **Edit** → inline edits for posts and comments.
5. **Import** → bring CSVs (company + calendar) and persist to Supabase.

---

## Tech stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + Framer Motion
- Clerk (Auth) + Supabase (Persistence)
- LLM providers: Cerebras / Gemini (optional mock mode)

---

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

### Environment variables

```env
# LLM provider (optional for mock mode)
LLM_PROVIDER=cerebras
CEREBRAS_API_KEY=your_cerebras_api_key
CEREBRAS_MODEL=llama-3.3-70b

# Gemini (optional)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash

# Supabase (recommended for persistence)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Optional
MOCK_AI=true
```

---

## How the planner works (high‑level)

```
1) Slot Allocation     → distribute posts across the week
2) Subreddit Matching  → map keywords → subreddit fit
3) Persona Assignment  → OP + commenters based on constraints
4) Thread Generation   → AI writes post + comments
5) Quality Scoring     → authenticity + promo checks + timing
```

Key guardrails:
- No overposting in the same subreddit
- Max posts per persona
- Avoid repeated persona pairings
- Realistic comment delays

---

## Project structure (high‑signal)

```
src/
  app/                  # Next.js App Router
  components/           # UI + calendar/thread views
  lib/
    planner/            # Core planning algorithm
    ai/                 # Prompting + LLM calls
    supabase/           # Persistence layer
  types/                # Shared types
supabase/schema.sql     # DB schema
```

---

## Production checklist

1. Add env vars in your host (Vercel/Render/etc.).
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Enable RLS + policies (optional but recommended).
4. Verify `/api/seed-slideforge` succeeds for demo data.

---

## About

Built by **Anirudh Manjesh** as a full‑stack product + AI systems project.
