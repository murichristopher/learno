# `learno` — a stateful, multi-session tutoring skill

A Claude Code skill that teaches **any** subject across multiple sessions, with AI-validated
answers, spaced repetition, inline SVG diagrams, and a live mastery dashboard.

This repo is the **engine only** — the reusable part. It carries *how* to teach, not *what*.
The subject-specific content (mission, notes, lessons, progress) is generated per study and
lives **outside** this folder, in the study workspace that wraps it.

## Screenshots:

<img width="731" height="708" alt="image" src="https://github.com/user-attachments/assets/c02a869e-5213-4c3a-b845-2889444b6f0a" /> -> example of a lesson

<img width="567" height="683" alt="image" src="https://github.com/user-attachments/assets/3cf3c1e5-8aad-46cc-ae37-8f26772abed2" /> -> example of a lesson

<img width="630" height="712" alt="image" src="https://github.com/user-attachments/assets/0b4c70a1-9b68-4e15-aac6-ca2fc3bddd53" /> -> example of the dashboard

 <img width="1080" height="570" alt="image" src="https://github.com/user-attachments/assets/88ebd28a-7840-46b8-8937-dd7a4d341b5a" /> -> example of flashcards

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
    ├── CLAUDE.md             ← working agreement: always ground answers in real data
    ├── PLAN.md               ← curriculum scaffolding
    ├── LESSON-FORMAT.md      ← mandatory HTML template + design-system classes
    ├── agents/
    │   └── learno-analyst.md ← read-only progress analyst (install into .claude/agents/)
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
   *And you don't need to know the field's key books — once the mission is set, the
   skill runs **Source Discovery**: it researches the canonical sources (textbooks,
   papers, primary docs), asks if you already own any, and (after you approve) writes
   them into a tiered `RESOURCES.md`. Lessons are then grounded in those Tier 1 sources.*

5. **Install the progress analyst** (once — works for every study afterwards):
   ```bash
   ln -s "$(pwd)/skill/agents/learno-analyst.md" ~/.claude/agents/learno-analyst.md
   # and inherit the working agreement at the workspace root:
   echo '@skill/CLAUDE.md' >> CLAUDE.md
   ```

6. **Start learning.** In Claude Code, from the workspace root, invoke the skill
   (`/learno` or "teach me X"). It reads `SKILL.md`, checks the server health, queries
   Mongo for what's due, and picks the next lesson in your zone of proximal development.

---

## Progress analyst (`learno-analyst`)

A read-only Claude Code subagent (`skill/agents/learno-analyst.md`) that grounds every
answer about your learning in **real data** instead of assumptions. It knows the MongoDB
schema (`lessons`, `concepts`, `section_results`, `conversations`) and the workspace layout,
and is **subject-agnostic** — install it once and it works for every learno study.

Ask things like *"valida minhas respostas da lição X"*, *"como estou no geral?"*, *"o que
vence pra revisar?"*, *"onde estou patinando?"*. It returns a verdict + a table of real
scores/dates + 1–3 insights (recurring misconceptions, stagnation, what's due).

`skill/CLAUDE.md` instructs the main agent to consult it before any progress/validation/
recommendation answer — so the tutor never invents how you're doing.

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
