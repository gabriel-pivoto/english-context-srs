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

## Features

- **Context-driven sessions** – Describe today’s scenario (“airport check-in,” “coffee break stand-up meeting”) and choose a CEFR level. The app asks Gemini for curated cloze/vocab items tailored to that scenario.
- **Mixed practice** – Cloze cards show a sentence with a blank and three options; vocabulary cards test meaning/translation plus example sentences.
- **Immediate feedback + SM‑2 grading** – After each item, pick Again/Hard/Good/Easy; scheduling uses a simplified SM‑2 algorithm and stores reviews for history.
- **Local-only data** – Prisma + PostgreSQL keep every item, review, and schedule on your machine.
- **Tailwind + shadcn UI** – Focused, keyboard-friendly interface with sensible defaults (hotkeys for answers/grades).
- **Adminer bundled** – Inspect the database at `http://localhost:85` without extra setup.
- **Fully containerized** – `docker compose up --build -d` starts Postgres, Adminer, and the Next.js app; migrations + seed happen automatically.
- **Gemini guardrails** – Automatic retries + JSON sanitization keep invalid model responses under control (and emit actionable errors when something goes wrong).

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

- **App Router (Next.js 15)** organizes pages (`/` for generation, `/study` for due cards) and API routes (`/api/generate`, `/api/due`, `/api/review`).
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
| `GEMINI_API_KEY`| Required. Google AI Studio key.                                                  |
| `GEMINI_MODEL`  | Gemini model ID (e.g., `gemini-1.5-flash-latest`).                               |
| `DATABASE_URL`  | Postgres connection string. In Docker, defaults to `postgres:5432`.              |
| `ADMINER_PORT`  | Optional. Host port for Adminer (default `85`).                                  |
| `SKIP_PRISMA_SEED` | Set to `1` to skip the seed step in the entrypoint (useful for large datasets).|

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
| `pnpm e2e`   | Playwright smoke script (mocks Gemini, navigates flow). |

> Tip: run `pnpm e2e` when no other dev server is occupying ports. The script starts its own Next.js instance on a random available port, mocks the API, selects a card, and grades it.

---

## Application Tour

1. **Home (`/`)**
   - Badge row communicates “Local-first · Single learner · Gemini assisted”.
   - `GenerateForm.tsx` contains context textarea, CEFR level select, and optional counts.
   - Submission hits `/api/generate` → `generateClozeAndVocab` → `Gemini`.
   - Results saved in `Item` table; duplicates removed by lemma/prompt.
   - Success panel links to `/study`.

2. **Study (`/study`)**
   - TanStack Query (`fetchDueItem`) polls `/api/due`.
   - `StudyCard` renders `ClozeCard` or `VocabCard` depending on type.
   - Keyboard controls: 1/2/3 to answer multiple choice, `Enter` to submit vocab guess, `A/H/G/E` for grades.
   - Grades call `/api/review`, which runs `updateSchedule` and inserts a `Review` record.
   - When no items are due, shows a “Nothing due right now” state.

3. **API routes**
   - `POST /api/generate`: validates input with Zod, calls Gemini for cloze + vocab, sanitizes JSON, inserts non-duplicate items.
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
