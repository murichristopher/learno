# `learno` — a stateful, multi-session tutoring skill

A Claude Code skill that teaches **any** subject across multiple sessions, with AI-validated
answers, spaced repetition, inline SVG diagrams, and a live mastery dashboard.

This repo is the **engine only** — the reusable part. It carries *how* to teach, not *what*.
The subject-specific content (mission, notes, lessons, progress) is generated per study and
lives **outside** this folder, in the study workspace that wraps it.

## Screenshots

<table>
  <tr>
    <td align="center" width="50%">
      <img width="100%" alt="Lesson example" src="https://github.com/user-attachments/assets/c02a869e-5213-4c3a-b845-2889444b6f0a" />
      <br /><sub><b>Lesson</b> — analogy + AI-validated answer box</sub>
    </td>
    <td align="center" width="50%">
      <img width="100%" alt="Lesson example" src="https://github.com/user-attachments/assets/3cf3c1e5-8aad-46cc-ae37-8f26772abed2" />
      <br /><sub><b>Lesson</b> — inline SVG diagram</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img width="100%" alt="Mastery dashboard example" src="https://github.com/user-attachments/assets/0b4c70a1-9b68-4e15-aac6-ca2fc3bddd53" />
      <br /><sub><b>Dashboard</b> — live mastery tracking</sub>
    </td>
    <td align="center" width="50%">
      <img width="100%" alt="Flashcards example" src="https://github.com/user-attachments/assets/88ebd28a-7840-46b8-8937-dd7a4d341b5a" />
      <br /><sub><b>Flash cards</b> — spaced-repetition review</sub>
    </td>
  </tr>
</table>

---

## How it's meant to be used

**Fork this repo. The fork is your study workspace.** Your lessons, notes and
progress live at the root beside the engine — there is no `skill/` subdirectory,
nothing is vendored, and no submodule to initialise.

```
learno/                       ← your fork
│
│  yours ─────────────────────────────────────────
├── .env                      ← Gemini key + MongoDB URI   (never committed)
├── MISSION.md                ← why you are learning this
├── NOTES.md                  ← preferences, stack, teaching style
├── RESOURCES.md              ← trusted sources
├── lessons/                  ← 0011-name.json + .yml + .html
├── review/                   ← spaced-repetition revisions
├── learning-records/         ← human-readable progress notes
├── reference/
│   ├── glossary.html         ← canonical vocabulary
│   └── my-learning.html      ← mastery dashboard
│
│  engine ────────────────────────────────────────
├── SKILL.md                  ← the brain: session loop, philosophy, mastery rules
├── CLAUDE.md                 ← working agreement
├── COMPONENTS.md             ← the component vocabulary  (generated)
├── LESSON-FORMAT.md          ← authoring contract
├── components/core/          ← upstream's components
├── components/local/         ← yours; wins on a name collision
├── build/                    ← the renderer
├── assets/                   ← design system + lesson runtime
├── sandbox/                  ← fixtures for working on the engine itself
├── agents/learno-analyst.md  ← read-only progress analyst
└── server/                   ← Express: Gemini proxy + MongoDB bridge
```

Upstream ships `lessons/`, `review/`, `learning-records/` and `reference/`
empty, so `git pull upstream main` never touches your content. What your Claude
invents under `components/local/` stays in your fork.

---

## Prerequisites

| Requirement | Why |
|---|---|
| **Node.js ≥ 18** | runs the server and the lesson renderer |
| **MongoDB** (Atlas or local) | persists mastery, lessons, SM-2 schedule, conversation events |
| **`mongosh`** on PATH | `SKILL.md`'s "before every session" step queries Mongo directly |
| **Gemini API key** | server proxies Gemini 2.5-flash to score free-text answers |
| **Claude Code** | the skill itself is driven by Claude reading `SKILL.md` |

---

## Bootstrap a new study (start here)

1. **Fork this repo and clone your fork.**
   ```bash
   gh repo fork murichristopher/learno --clone
   cd learno
   ```
   Forking rather than cloning matters: your lessons get committed to a remote
   you own, and `upstream` stays a separate remote you pull engine fixes from.

2. **Create `.env` at the root:**
   ```bash
   cp .env.example .env
   # then edit: GEMINI_API_KEY, MONGODB_URI, and set MONGODB_DB per study.
   # PORT is free to change — lessons read the API base from their own origin.
   ```

3. **Start it.**
   ```bash
   make local     # http://localhost:9990 — installs dependencies on first run
   ```
   Or `make start` to also open a Cloudflare tunnel, which makes lessons
   readable on your phone. Read the warning in the Makefile first: that URL is
   public and unauthenticated.

4. **Install the progress analyst** (once — it then works for every study):
   ```bash
   ln -s "$(pwd)/agents/learno-analyst.md" ~/.claude/agents/learno-analyst.md
   ```

5. **Start learning.** In Claude Code, from the repo root, invoke the skill
   (`/learno` or "teach me X"). It reads `SKILL.md`, checks the server, queries
   Mongo for what is due, and picks the next lesson in your zone of proximal
   development.

   *You do not have to write `MISSION.md` by hand — if it is missing or vague,
   the skill interviews you and writes it with you. And you do not need to know
   the field's key books: once the mission is set, it researches the canonical
   sources, asks which you already own, and writes a tiered `RESOURCES.md`.*

### Keeping up with upstream

```bash
git remote add upstream https://github.com/murichristopher/learno.git
git pull upstream main
```

Upstream never writes to `lessons/`, `review/`, `learning-records/` or
`reference/`, so your content is not in the way. If your Claude has edited
engine files, expect to resolve those — that is the cost of the engine being
editable in place, and it was chosen deliberately.

---

## Progress analyst (`learno-analyst`)

A read-only Claude Code subagent (`agents/learno-analyst.md`) that grounds every
answer about your learning in **real data** instead of assumptions. It knows the MongoDB
schema (`lessons`, `concepts`, `section_results`, `conversations`) and the workspace layout,
and is **subject-agnostic** — install it once and it works for every learno study.

Ask things like *"valida minhas respostas da lição X"*, *"como estou no geral?"*, *"o que
vence pra revisar?"*, *"onde estou patinando?"*. It returns a verdict + a table of real
scores/dates + 1–3 insights (recurring misconceptions, stagnation, what's due).

`CLAUDE.md` instructs the main agent to consult it before any progress/validation/
recommendation answer — so the tutor never invents how you're doing.

---

## Environment variables

Read from `.env` at the repo root.

| Var | Required | Default | Used for |
|---|---|---|---|
| `GEMINI_API_KEY` | yes | — | scoring free-text answers (`/api/validate`) |
| `GEMINI_MODEL` | no | `gemini-2.5-flash` | which Gemini model to call |
| `MONGODB_URI` | yes | — | connection string for persistence |
| `MONGODB_DB` | no | `system_design_learn` | database name — **change per study** |
| `PORT` | no | `9990` | server port — **keep at 9990** (lessons hardcode it) |

---

## The server (`server/`)

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

### Serving the workspace

The server statically serves the study workspace, so lessons open over
`http://localhost` (a secure context — the mic needs one) instead of `file://`.
The workspace is the repo root. **`LEARNO_WORKSPACE`** overrides that and exists
for exactly one caller — the engine's own sandbox, which serves fixtures instead
of your real content.

---

## Developing the engine (`sandbox/`)

Changing the lesson format, the styles, or the dashboard means testing against
content — but you should never have to touch a real study workspace, spend a
Gemini call, or provision a database to see whether a layout still renders.

```sh
make sandbox     # serves the sandbox + a public Cloudflare URL (no MongoDB, no API key)
make local       # same, localhost only — no tunnel
make check       # syntax-check the server, validate the seed fixture
```

`LEARNO_MODE=sandbox` swaps two things and nothing else:

- **the store** — an in-memory stand-in seeded from `sandbox/fixtures/seed.json`.
  The routes are untouched, so the real SM-2 scheduling code runs against it.
- **the validator** — a deterministic verdict instead of the Gemini call, so
  scoring is free, instant and repeatable. Prefix an answer with `!0`, `!p`,
  `!ok` or `!m` to force each score band.

State resets on every restart, so the sandbox always starts from the same place
and a visual difference means a real regression. `sandbox/lessons/0001-kitchen-sink.html`
holds one instance of every block `LESSON-FORMAT.md` defines — see
[`sandbox/README.md`](sandbox/README.md).

> When you add a block to the lesson format, add it to the kitchen-sink lesson in
> the same commit. The fixture is only useful while it stays exhaustive.

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
