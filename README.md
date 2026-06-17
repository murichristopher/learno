# `learno` — a stateful, multi-session tutoring skill

A Claude Code skill that teaches **any** subject across multiple sessions, with AI-validated
answers, spaced repetition (SM-2), inline SVG diagrams, and a live mastery dashboard.

This repo is the **engine only** — the reusable part. It carries *how* to teach, not *what*.
The subject-specific content (mission, notes, lessons, progress) is generated per study and
lives **outside** this folder, in the study workspace that wraps it.

---

## How it's meant to be used

This skill is designed to live as the **`skill/` subdirectory of a study workspace**:

```
my-study/                     ← the study workspace (one git repo PER subject, or just a folder)
├── .env                      ← secrets (Gemini key + MongoDB URI)   ← NOT committed
├── MISSION.md                ← why the user is learning this
├── NOTES.md                  ← preferences, stack, teaching style
├── RESOURCES.md              ← trusted sources
├── lessons/                  ← generated lesson HTML (starts empty)
├── learning-records/         ← human-readable progress notes (starts empty)
├── reference/
│   ├── glossary.html         ← canonical vocabulary (grows with the subject)
│   └── my-learning.html      ← mastery dashboard (generic, reusable as-is)
└── skill/                    ← THIS REPO  ── the engine, identical for every subject
    ├── SKILL.md              ← the brain: session loop, philosophy, mastery rules
    ├── PLAN.md               ← curriculum scaffolding
    ├── LESSON-FORMAT.md      ← mandatory HTML template + design-system classes
    ├── .env.example          ← copy to <workspace-root>/.env
    ├── original/             ← format templates for the workspace files
    │   ├── SKILL.md               (the canonical/original skill spec)
    │   ├── MISSION-FORMAT.md
    │   ├── RESOURCES-FORMAT.md
    │   ├── GLOSSARY-FORMAT.md
    │   └── LEARNING-RECORD-FORMAT.md
    ├── templates/            ← generic, subject-agnostic starting files
    │   └── reference/
    │       ├── glossary.html      ← empty glossary scaffold ([SUBJECT] + example term)
    │       └── my-learning.html   ← mastery dashboard (server-driven, [SUBJECT] placeholders)
    └── server/               ← local Express server (Gemini proxy + MongoDB bridge)
        ├── index.js
        ├── routes/{validate,progress}.js
        └── package.json
```

> ⚠️ **Path contract — do not flatten this repo to a workspace root.**
> The engine assumes it sits one level under the workspace:
> - `skill/server/index.js` loads env from `../../.env` (i.e. the **workspace root**, two levels up).
> - `SKILL.md` reads `../MISSION.md`, `../NOTES.md`, `../lessons/`, `../reference/glossary.html`, etc.
> - Lessons call the server at a **hardcoded** `http://localhost:9990`.
>
> So consume this repo as a subfolder named `skill/` (copy it in, or add it as a **git submodule**).
> If you clone it as a standalone repo root, those relative paths break.

---

## Prerequisites

| Requirement | Why |
|---|---|
| **Node.js ≥ 18** | runs `skill/server` (Express + native `fetch`) |
| **MongoDB** (Atlas or local) | persists mastery, lessons, SM-2 schedule, conversation events |
| **`mongosh`** on PATH | `SKILL.md`'s "before every session" step queries Mongo directly |
| **Gemini API key** | server proxies Gemini 2.5-flash to score free-text answers |
| **Claude Code** | the skill itself is driven by Claude reading `SKILL.md` |

---

## Bootstrap a new study (start here)

1. **Create the workspace and drop this engine in as `skill/`:**
   ```bash
   mkdir my-study && cd my-study
   git submodule add <THIS_REPO_URL> skill      # or: cp -r /path/to/skill ./skill
   ```

2. **Create the secrets file at the workspace root** — copy `skill/.env.example`
   to `my-study/.env` and fill it in:
   ```bash
   cp skill/.env.example .env
   # then edit: GEMINI_API_KEY, MONGODB_URI, and set MONGODB_DB per study.
   # Keep PORT=9990 — lessons hardcode http://localhost:9990 (see Gotchas).
   ```

3. **Install and start the server** (from the workspace root):
   ```bash
   cd skill/server && npm install && npm start
   # → listening on :9990, Gemini + MongoDB wired up
   ```

4. **Seed the workspace from the generic templates:**
   ```bash
   mkdir -p lessons learning-records reference
   cp skill/templates/reference/*.html reference/
   # then replace the [SUBJECT] placeholders in reference/glossary.html and
   # reference/my-learning.html with this study's name.
   ```
   Scaffold `MISSION.md` / `NOTES.md` / `RESOURCES.md` using the formats in
   `skill/original/`. *You don't have to write `MISSION.md` by hand — if it's
   missing or vague, the skill runs its "grill-me" interview to build it with you.*

5. **Start learning.** In Claude Code, from the workspace root, invoke the skill
   (`/learno` or "teach me X"). It reads `SKILL.md`, checks the server health, queries
   Mongo for what's due, and picks the next lesson in your zone of proximal development.

---

## Environment variables

Read from `<workspace-root>/.env` (path is `../../.env` relative to `skill/server/index.js`).

| Var | Required | Default | Used for |
|---|---|---|---|
| `GEMINI_API_KEY` | yes | — | scoring free-text answers (`/api/validate`) |
| `GEMINI_MODEL` | no | `gemini-2.5-flash` | which Gemini model to call |
| `MONGODB_URI` | yes | — | connection string for persistence |
| `MONGODB_DB` | no | `system_design_learn` | database name — **change per study** |
| `PORT` | no | `9990` | server port — **keep at 9990** (lessons hardcode it) |

---

## The server (`skill/server`)

Local Express app: Gemini proxy + MongoDB bridge. Routes used by the lessons/dashboard:

| Route | Purpose |
|---|---|
| `GET  /api/health` | liveness check — lessons call this on load to decide online/offline |
| `POST /api/validate` | score a user's free-text answer via Gemini (returns score + misconceptions) |
| `POST /api/progress` | record lesson completion → triggers SM-2 scheduling |
| `GET  /api/progress` | read mastery state — powers `reference/my-learning.html` |

**Offline degradation:** if the server is down, lessons hide AI-validation blocks and show
multiple-choice fallbacks (a yellow banner appears). The lesson still works; offline answers
just don't persist.

### MongoDB collections

- `concepts` — per-concept mastery, SM-2 `interval_days` / `ease_factor` / `next_review`, score history
- `lessons` — completed lessons, `final_score`, section misconceptions
- `conversations` — mastery demonstrated in chat (recorded immediately, no lesson needed)

`SKILL.md` queries these directly via `mongosh` at the start of every session.

---

## How a session works (the loop)

1. Read `MISSION.md` / `NOTES.md` / `learning-records/` — ground everything in the goal.
2. Query Mongo: what's **due for review**, what has **recurring misconceptions**, what's **stagnant**.
3. Check server health (`curl localhost:9990/api/health`).
4. Pick next: (a) SM-2 reviews due → (b) recurring-misconception concept → (c) next step toward the mission.
5. Generate one tightly-scoped lesson (`lessons/NNNN-name.html`) per `LESSON-FORMAT.md`:
   analogy first (before naming the concept) → 2–5 sections each with an inline SVG diagram and an
   AI-validated answer box → teach-back (drives SM-2) → inline flash cards → source citation.
6. On completion, `POST /api/progress` schedules the next review; update the glossary and, when
   warranted, write a `learning-records/NNNN-*.md`.

Mastery is recorded from **two** sources: AI-validated teach-back (≥75), **or** unprompted
correct use in conversation. Both show provenance in the dashboard.

---

## What's reusable vs. what's per-study

| Reusable as-is (the engine — this repo) | Regenerated per study (the workspace) |
|---|---|
| `SKILL.md`, `PLAN.md`, `LESSON-FORMAT.md` | `MISSION.md`, `NOTES.md`, `RESOURCES.md` |
| `original/*-FORMAT.md` templates | `lessons/*.html` |
| `server/` (Gemini proxy + Mongo bridge) | `learning-records/*.md` |
| `templates/reference/my-learning.html` (generic dashboard) | `reference/my-learning.html` (subject name filled in) |
| `templates/reference/glossary.html` (generic scaffold) | `reference/glossary.html` (subject vocabulary, grows) |
| `.env.example` | `.env` (real secrets, gitignored) |

To start a new subject: copy/submodule this `skill/`, write a new `MISSION.md`, point `MONGODB_DB`
at a fresh database. The teaching method transfers 100%; only the content changes.

---

## Gotchas (verified, not theoretical)

1. **The server port is fixed at `9990`.** Every lesson and the dashboard hardcode
   `http://localhost:9990`. `.env.example` ships with `PORT=9990` — don't change it, or the
   server will run on a different port while the lessons keep calling 9990 → everything looks
   "offline." (The original project's `.env.example` shipped `PORT=4242`, which was the bug.)

2. **`SKILL.md` references `skill/design-system/SPEC.md`, which does not exist in this repo.** The
   actual design-system classes (`analogy-box`, `diagram-wrap`, `compare-grid`, `phase-badge`, …)
   live inline in **`LESSON-FORMAT.md`** and inside each self-contained lesson's `<style>`. Treat
   `LESSON-FORMAT.md` as the source of truth for components until a dedicated `SPEC.md` is extracted.

3. **`node_modules/` is gitignored** — run `npm install` in `skill/server` on every fresh clone.

4. **Secrets never travel with the repo.** `.env` lives at the workspace root and is gitignored.
   Recreate it from the table above on each machine / each new study.
