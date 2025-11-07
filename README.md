# English Context SRS

A local-first study companion that turns your daily situations into contextual English flashcards. It asks Gemini for cloze (fill-in-the-blank) sentences and vocabulary prompts, stores everything in PostgreSQL, and schedules reviews with a lightweight SM‑2 algorithm. No accounts, no cloud storage—everything runs on your machine.

---

## Table of Contents

1. [Features](#features)
2. [Architecture Overview](#architecture-overview)
3. [Stack & Tooling](#stack--tooling)
4. [System Requirements](#system-requirements)
5. [Getting Started (Docker)](#getting-started-docker)
6. [Manual Development Workflow](#manual-development-workflow)
7. [Environment Variables](#environment-variables)
8. [Prisma & Database Lifecycle](#prisma--database-lifecycle)
9. [Testing](#testing)
10. [Application Tour](#application-tour)
11. [Troubleshooting](#troubleshooting)
12. [Roadmap Ideas](#roadmap-ideas)

---

- **Email magic link auth (hardened)** – Tokens are hashed-at-rest, rate-limited per email + IP, and can be delivered via SMTP or Resend. `/api/*` routes stay behind JWT middleware.
- **Context library sidebar** – Search, filter, and jump across multi-user contexts. Each context tracks due counts, activity, and total cards.
- **Context editors** – Edit titles/notes/levels, batch delete or regenerate questions, and call Gemini (or its deterministic mock) to add new cloze/vocab cards per context.
- **Study filters + SM-2** – `/study` now respects context filters, surfaces per-card metadata (context, ease, interval, due date), and keeps keyboard shortcuts for fast grading.
- **Analytics dashboard** – Ease and interval histograms, daily review counts, accuracy %, and lapse totals rendered with Recharts once you opt in below the fold.
- **Local-first data** – Prisma + PostgreSQL persist everything on your machine; Adminer is bundled at `http://localhost:85` for quick inspections.
- **Playwright e2e coverage** – Auth happy/error paths, review flow, contexts CRUD, and Adminer availability are covered in `pnpm e2e`, with a dev-only `/api/dev/last-email` helper.

---

## Architecture Overview

```
┌─────────────┐      ┌───────────────┐      ┌──────────────┐
│   Browser   │ <--> │  Next.js App  │ <--> │ Prisma Client│
└─────────────┘      └──────┬────────┘      └──────┬───────┘
                            │                    │
                            │  SQL (SM-2 data)   │
                            │                    ▼
                        ┌───────────┐      ┌───────────────┐
                        │ Postgres  │      │ Adminer (UI)  │
                        └───────────┘      └───────────────┘
                             ▲
                             │
                       Gemini API
```

- **App Router (Next.js 15)** organizes pages (hero generator, `/study`, `/contexts/[id]`, `/login`) and API routes (`/api/auth/*`, `/api/contexts/*`, `/api/due`, `/api/review`, `/api/analytics/overview`).
- **Prisma** defines the schema (`Item`, `Review`, `ItemType`) and exposes a type-safe client. `docker-entrypoint.sh` runs `prisma migrate deploy` and seeds sample data automatically.
- **Gemini client** (`src/lib/gemini.ts`) wraps the Google Generative AI SDK with:
  - Hard prompts for cloze & vocab generation
  - Retry-on-invalid JSON
  - Sanitization for responses wrapped in markdown/code fences
- **Scheduler** (`src/lib/sm2.ts`) implements the simplified SM‑2 algorithm (`Grade` ∈ {0,3,4,5}).
- **State management** uses TanStack Query for `/study` so cards stay reactive and cache-friendly.

---

## Stack & Tooling

| Layer            | Technology                                                                 |
|------------------|-----------------------------------------------------------------------------|
| UI / SSR         | Next.js 15 App Router, React 19 RC, TailwindCSS, shadcn-inspired components |
| State / Data     | TanStack Query, Zod (validation)                                            |
| Backend / DB     | Prisma ORM, PostgreSQL 16                                                   |
| AI Integration   | Google Generative AI SDK (Gemini models)                                    |
| Testing          | Vitest (unit), Playwright (smoke), SM‑2 unit spec                           |
| Containerization | Docker Compose (app + Postgres + Adminer)                                   |

---

## System Requirements

- Docker Desktop 4.30+ (buildkit enabled) or compatible container runtime
- Node.js 20 (if running outside Docker)
- pnpm 8+
- Google AI Studio API key with access to the desired Gemini model

---

## Getting Started (Docker)

```bash
git clone https://github.com/your-org/english-context-srs.git
cd english-context-srs

cp .env.example .env
# edit .env:
#   GEMINI_API_KEY=your_key
#   GEMINI_MODEL=gemini-1.5-flash-latest (or whichever your key supports)

docker compose up --build -d
```

- App: http://localhost:3005 (Docker maps container port 3000 → host 3005)
- Adminer: http://localhost:85 (System: PostgreSQL, Server: postgres, User/Pass: postgres, DB: english_srs)

The entrypoint automatically:
1. Rewrites `DATABASE_URL` to point at `postgres:5432`.
2. Runs `prisma migrate deploy`.
3. Executes `pnpm prisma db seed`.
4. Starts `pnpm start`.

Stop everything with `docker compose down` (add `-v` to drop the Postgres volume).

---

## Manual Development Workflow

Use this only if you prefer running services natively:

```bash
pnpm install
docker compose up -d postgres adminer  # keep DB in Docker

cp .env.example .env
# set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/english_srs
pnpm migrate:deploy
pnpm db:seed
pnpm dev
```

The dev server listens on `http://localhost:3005`. Ensure the `.env` matches your local Postgres host/port.

---

## Environment Variables

| Variable        | Description                                                                      |
|-----------------|----------------------------------------------------------------------------------|
| `GEMINI_API_KEY`| Required in production. Google AI Studio key.                                    |
| `GEMINI_MODEL`  | Gemini model ID (e.g., `gemini-1.5-flash-latest`).                               |
| `DATABASE_URL`  | Postgres connection string. In Docker, defaults to `postgres:5432`.              |
| `ADMINER_PORT`  | Optional. Host port for Adminer (default `85`).                                  |
| `JWT_SECRET`    | HS256 secret used to sign the session JWT cookie.                                |
| `APP_BASE_URL`  | Base URL for building magic links (e.g., `http://localhost:3005`).               |
| `MAIL_FROM`     | Email sender shown in magic link emails.                                         |
| `SMTP_URL`      | Optional SMTP connection string (e.g., `smtp://user:pass@smtp.server.com:587`).  |
| `RESEND_API_KEY`| Alternative to SMTP. If set, messages are sent via Resend’s API (great on Vercel).|
| `ALLOW_DEV_EMAIL_FALLBACK` | Set to `1` to allow the JSON/dev transport even when `NODE_ENV=production` (useful for previews/tests only). |
| `MOCK_GEMINI`   | Set to `1` to use deterministic mock data instead of calling Gemini (ideal for tests). |
| `SKIP_PRISMA_SEED` | Set to `1` to skip the seed step in the entrypoint (useful for large datasets).|

> Dev tip: `/api/dev/last-email` returns the last magic link token while `NODE_ENV !== "production"`, which powers the Playwright auth tests.

---

### Email delivery (SMTP or Resend)

- **Production**: set either `SMTP_URL` *or* `RESEND_API_KEY`. On Vercel, the quickest path is enabling [Resend](https://resend.com/) and pasting the API key into your project env vars so `/api/auth/request` can send real emails.
- **Local / Preview / CI**: if neither env var is set you can opt in to the JSON transport by setting `ALLOW_DEV_EMAIL_FALLBACK=1`. This is already enabled for `pnpm dev` and the CI workflow.
- `/api/dev/last-email` only works when the fallback is enabled, so secrets are not leaked on production deployments.

---

## Prisma & Database Lifecycle

- **Schema** lives in `prisma/schema.prisma`.
- **Migrations** are manually authored SQL files in `prisma/migrations/<timestamp>_init/migration.sql`.
- Entry point runs `prisma migrate deploy` every start, so the DB stays in sync.
- **Adding fields**:
  1. Update `schema.prisma`.
  2. Create a new migration folder (e.g., `prisma/migrations/0002_add_interval/...`).
  3. Rebuild: `docker compose up --build -d`.

Adminer (`http://localhost:85`) is available for quick inspection and manual tweaks.

---

## Testing

| Command      | Description                                  |
|--------------|----------------------------------------------|
| `pnpm lint`  | ESLint (Next + TS + React hooks).            |
| `pnpm test`  | Vitest (currently covers SM‑2 scheduler).    |
| `pnpm e2e`   | Playwright suite (auth happy/error paths, review flow, contexts CRUD, Adminer check). |

> Tip: run `docker compose up -d` and `pnpm dev` before `pnpm e2e`. The tests rely on the dev-only `/api/dev/last-email` route and the seeded `demo@example.com` account.

---

## Continuous Integration

`.github/workflows/ci.yml` runs on pushes/PRs to `main`/`master`:

1. Boots PostgreSQL 16 as a service.
2. Installs dependencies with pnpm, runs `prisma migrate deploy` + `db:seed`.
3. Executes `pnpm lint`, `pnpm test`, and `pnpm build` with production-like env vars (mock Gemini + dev email fallback).

This keeps schema, tests, and the production build in sync with every commit.

---

## Deploying to Vercel

1. **Provision Postgres** (Neon, Supabase, Vercel Postgres, etc.) and copy the `DATABASE_URL`.
2. **Configure env vars** in the Vercel dashboard:
   - `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`
   - `JWT_SECRET` (32+ bytes), `APP_BASE_URL` (e.g., `https://english-context-srs.vercel.app`)
   - `MAIL_FROM`, plus either `RESEND_API_KEY` *or* `SMTP_URL`
   - Optional: `MOCK_GEMINI=0` (use real Gemini), `ALLOW_DEV_EMAIL_FALLBACK=0`
3. **Apply migrations** locally against the hosted database:  
   `DATABASE_URL=... pnpm prisma migrate deploy && pnpm db:seed`
4. **Connect the GitHub repo to Vercel** and let it build with `pnpm build`.

Resend is the easiest email provider on Vercel—install the integration, grab the API key, and you have production-ready magic links without running SMTP infrastructure.

---

## Application Tour

1. **Home (`/`)**
   - Badge row communicates “Local-first · Single learner · Gemini assisted”.
   - `GenerateForm.tsx` contains context textarea, CEFR level select, and optional counts.
  - Submission hits `POST /api/contexts` which validates with Zod, stores the context, and (optionally) calls Gemini to seed cards.
   - Results saved in `Item` table; duplicates removed by lemma/prompt.
   - Success panel links to `/study`.

2. **Study (`/study`)**
   - TanStack Query (`fetchDueItem`) polls `/api/due`.
   - `StudyCard` renders `ClozeCard` or `VocabCard` depending on type.
   - Keyboard controls: 1/2/3 to answer multiple choice, `Enter` to submit vocab guess, `A/H/G/E` for grades.
   - Grades call `/api/review`, which runs `updateSchedule` and inserts a `Review` record.
   - When no items are due, shows a “Nothing due right now” state.

3. **API routes**
  - `POST /api/contexts`: validates input, creates the context, invokes Gemini (or the mock generator) and inserts non-duplicate items tied to the user.
   - `GET /api/due`: returns the oldest `Item` whose `due` ≤ now.
   - `POST /api/review`: updates ease/interval/due via SM‑2, logs `Review`.

---

## Troubleshooting

| Symptom                                                         | Resolution                                                                                      |
|------------------------------------------------------------------|--------------------------------------------------------------------------------------------------|
| Gemini 404 or `Model ... not available`                         | Set `GEMINI_MODEL` to an ID your key supports (`ListModels` in Google AI Studio).               |
| `Model returned invalid JSON`                                    | Models 2.x sometimes wrap output in Markdown. The sanitizer handles most cases now; if it persists, double-check the prompt or prefer `*-latest`. |
| Prisma complains about OpenSSL                                  | Our Dockerfile installs `openssl` on Debian slim; make sure you rebuild after pulling updates.   |
| App says “Couldn’t find any pages” inside Docker                | Make sure the `app` service runs `pnpm start` (already configured) rather than `pnpm dev`.       |
| Adminer port 85 already in use                                  | Set `ADMINER_PORT=8081` (or any free port) before `docker compose up`.                           |

---

## Roadmap Ideas

- User profile switch (multiple learners) with shared deck.
- Audio prompts via TTS for listening practice.
- Export/import deck as JSON/CSV.
- Partial offline generation with prebuilt phrase templates.
- Rich review analytics dashboard.

---

Enjoy your contextual study sessions! With a Gemini key + Docker you can go from repo → studying in under five minutes. Contributions and feedback welcome. 😊
