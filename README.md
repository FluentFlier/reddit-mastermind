# Reddit Mastermind

AI‑powered Reddit content planning that turns a company brief, personas, and subreddit targets into a realistic weekly calendar of posts + threaded conversations.

Built for teams who care about narrative quality, not just volume.

---

## Why it stands out

- **Multi‑persona realism**: OP + commenters are assigned with constraints that prevent obvious coordination.
- **Quality guardrails**: Anti‑promo checks, voice consistency, timing realism, duplication, over‑agreement, and low‑effort detection.
- **Calendar‑first workflow**: View weeks at a glance, drill into threads, edit in context, and group by subreddit.
- **Intent metadata**: Each post includes goal, persona rationale, subreddit fit, expected replies, and SEO intent.
- **Seeded demo data**: Slideforge is auto‑seeded so reviewers can explore immediately after login.

---

## Product tour

![Product tour demo](public/media/demo.gif)

1. **Login** → see the full dashboard (no empty state).
2. **Overview** → calendar + thread preview.
3. **Generate** → multi‑week calendars with quality scoring + intent metadata.
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

---

## Docker

Build and run locally:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=your_supabase_url \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_publishable_key \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key \
  -t reddit-mastermind:latest .

docker run --rm -p 3000:3000 --env-file .env.local reddit-mastermind:latest
```

Or with Docker Compose:

```bash
docker compose up --build
```

> If you keep values in `.env.local`, pass it explicitly so build args are populated:
> `docker compose --env-file .env.local up --build`

---

## Kubernetes (basic)

1. Build + push your image to a registry.
2. Update `k8s/deployment.yaml` with your image path.
3. Apply manifests:

```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/serviceaccount.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/pdb.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/networkpolicy.yaml
kubectl apply -f k8s/ingress.yaml
```

> Note: `NEXT_PUBLIC_*` variables are baked at build time in Next.js. Pass them as Docker build args in CI/CD.

---

## Kubernetes (TLS + Ingress)

If you're using nginx + cert-manager, apply the ClusterIssuer and set your domain:

```bash
kubectl apply -f k8s/cluster-issuer.yaml
```

Then update `k8s/ingress.yaml` with your domain (host) and apply it.

---

## CI/CD (GitHub Actions)

Workflow: `.github/workflows/deploy.yml`

Required secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `KUBECONFIG` (base64-encoded kubeconfig)

CI deploy notes:
- Create `k8s/configmap.yaml` and `k8s/secret.yaml` once per cluster with real values; the workflow does not apply them to avoid overwriting secrets.
- The workflow sets the image to `ghcr.io/<owner>/<repo>:latest` after applying the deployment.

---

## Security defaults

- Non-root container user with read-only filesystem.
- Dropped Linux capabilities + `RuntimeDefault` seccomp profile.
- Health probes wired to `/api/health`.
- NetworkPolicy limits egress to DNS + HTTPS only.
- Autoscaling + PDB for resilience.

Notes:
- HPA requires metrics-server in your cluster.
- NetworkPolicy assumes kube-dns labels and ingress namespaces `ingress-nginx` or `nginx-ingress`; adjust if yours differ.

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
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_publishable_key

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
4) Thread Generation   → AI writes post + comments with weekly goal context
5) Quality Scoring     → authenticity + promo checks + timing + over‑agreement + repetition
```

Key guardrails:
- No overposting in the same subreddit
- Max posts per persona
- Avoid repeated persona pairings
- Realistic comment delays
- Subreddit sensitivity and min‑karma/account‑age checks (when provided)

---

## What you can configure (today)

- **Weekly goals** (text list, used to steer post and comment prompts)
- **Risk tolerance** (low/medium/high, tunes promo risk + guardrails)
- **Preferences** (anti‑promo checks, min/max lengths, banned phrases, campaign brief, disagreement requirement)
- **Constraints** (posting cadence, persona limits, timing ranges)
- **Subreddit rules** (min account age / karma, self‑promo allowed)

---

## What you get per thread

- **Post + comments** with realistic scheduling
- **Quality score + breakdown**
- **Issues, warnings, and suggestions** (per post)
- **Intent metadata** (goal, persona rationale, subreddit fit, expected replies, SEO intent)

---

## UI highlights

- Calendar grid, list, and heatmap views
- Subreddit‑grouped list view with warning counts
- Thread preview with inline edit + regeneration
- Quality panel with issues, warnings, and suggestions

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
