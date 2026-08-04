# learno

Teaching yourself something usually fails the same way. Three good chapters one week, nothing
for two, and by the time you come back you have lost the thread and the momentum together.
Nothing was checking whether you actually understood any of it — you were, and you are a
generous marker.

**learno is a tutor that keeps the thread for you.** You say what you want to learn; it asks
why, and what changes in your life when you have it, until the goal is concrete enough to
teach against. It finds the field's canonical books rather than a blog post. Then it teaches
in sessions you can finish in one sitting, and every session opens by telling you where you
stand — what is due today, what you keep getting wrong, what comes next — because it read
your record before you arrived.

You answer in your own words, not by highlighting. Each section asks you to explain the idea
and a model scores what you wrote, so *"yeah, I get it"* has to survive contact with a
sentence. Weeks later that concept comes back for review on roughly the day you were about
to lose it. When a whole topic closes you get a project: build the real thing under a
constraint nobody taught you, against a rubric you can read before you start.

And it notices what you cannot. The mistake you made in lesson 3 and again in lesson 7 is
the same mistake, and it says so — a misconception that repeats is worth more than any score.

What you keep is yours: every lesson, every answer, every score, on your own disk and in
your own git history. Bring any subject — chess openings, Kubernetes, Kant, options pricing,
the Portuguese subjunctive.

---

## What it looks like

<table>
  <tr>
    <td width="50%" valign="top">
      <img width="100%" alt="A lesson: analogy before the term, then a themed diagram" src="docs/images/lesson.png" />
      <sub><b>A lesson.</b> The analogy lands before the concept is named. Sections unlock as you answer.</sub>
    </td>
    <td width="50%" valign="top">
      <img width="100%" alt="The dashboard, opening with the decision from NEXT.md" src="docs/images/dashboard.png" />
      <sub><b>The dashboard.</b> Opens with the decision, then what needs attention <i>and why</i> — a misconception seen three times, a review two days overdue.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img width="100%" alt="A project brief: the deliverable and the rubric, before the attempt" src="docs/images/project.png" />
      <sub><b>A project.</b> When a pattern closes, you build the thing. The rubric is in the brief, before you start.</sub>
    </td>
    <td width="50%" valign="top">
      <img width="100%" alt="The library: every lesson, review and project with its score" src="docs/images/library.png" />
      <sub><b>The library.</b> Everything on disk, with what you scored and when — or “not started”.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img width="100%" alt="An inline SVG diagram using the design system's classes" src="docs/images/diagram.png" />
      <sub><b>Diagrams are inline SVG</b> drawn with the design system's classes, so they follow the theme and work offline.</sub>
    </td>
    <td width="50%" valign="top">
      <img width="100%" alt="Theme and accent picker in the top bar" src="docs/images/settings.png" />
      <sub><b>Light, dark or system</b>, and three accents. Every page follows, including the diagrams.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <img width="100%" alt="The component gallery, rendered from each component's own demo" src="docs/images/components.png" />
      <sub><b>The component gallery</b> is generated from each component's own <code>meta.demo</code> — it cannot go stale.</sub>
    </td>
    <td width="50%" valign="top">
      <img width="100%" alt="The dashboard on a phone" src="docs/images/phone.png" />
      <sub><b>On a phone.</b> <code>make start</code> opens a Cloudflare tunnel so lessons read on the sofa.</sub>
    </td>
  </tr>
</table>

---

## Start everything, in one command

Paste your credentials, then hand the rest to Claude. It forks the repo, writes `.env`,
starts the server, installs the progress analyst and opens the first session.

```bash
export GEMINI_API_KEY="AIza…"                                    # aistudio.google.com/apikey
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net" # Atlas free tier is enough
export MONGODB_DB="chess_learn"                                  # one database per subject
export PORT=9990

claude "fork murichristopher/learno into ~/projects/chess, write .env from my exported
GEMINI_API_KEY / MONGODB_URI / MONGODB_DB / PORT, run make local, symlink the
learno-analyst agent into ~/.claude/agents/, then start teaching me chess openings"
```

Already have a workspace? From its root, any of these is enough:

```bash
claude "start learno and tell me what is due today"
claude "/learno"                       # the skill, by name
claude "teach me the next thing"
```

The first session interviews you — why you are learning this, by when, how you learn — and
writes `MISSION.md`, `NOTES.md` and a tiered `RESOURCES.md` with the field's canonical
sources. You do not have to know the books; finding them is the skill's job.

---

## How a study is laid out

**Fork this repo. The fork is your study workspace** — your content and the engine share the
root, nothing is vendored, and there is no submodule to initialise.

You never write a lesson by hand, and you never write HTML: Claude authors the structure and
the words, and the engine supplies the design system, the progress bar, the section gating,
the offline fallback and the voice dictation.

```
learno/                       ← your fork
│
│  yours ─────────────────────────────────────────
├── .env                      ← Gemini key + MongoDB URI   (never committed)
├── MISSION.md                ← why you are learning this, and the curriculum as patterns
├── NOTES.md                  ← preferences, stack, teaching style, what to avoid
├── NEXT.md                   ← what to do now; the dashboard opens with it
├── RESOURCES.md              ← trusted sources, tiered
├── lessons/                  ← NNNN-name.json + .yml → .html
├── review/                   ← spaced-repetition revisions, same pipeline
├── projects/                 ← briefs: the artifact you build when a pattern closes
├── learning-records/         ← human-readable notes on what you demonstrated
├── reference/
│   ├── glossary.html         ← canonical concept vocabulary
│   ├── my-learning.html      ← the dashboard
│   └── library.html          ← everything on disk, with scores
│
│  engine ────────────────────────────────────────
├── SKILL.md                  ← the brain: session loop, mastery rules, authoring rules
├── CLAUDE.md                 ← working agreement for the agent
├── LESSON-FORMAT.md          ← the authoring contract
├── COMPONENTS.md             ← the component vocabulary  (generated)
├── components/core/          ← upstream's components
├── components/local/         ← yours; wins on a name collision
├── build/                    ← the renderer, validators and catalog
├── assets/                   ← design system + lesson runtime
├── sandbox/                  ← fixtures for working on the engine itself
├── agents/learno-analyst.md  ← read-only progress analyst
└── server/                   ← Express: Gemini proxy + MongoDB bridge
```

Upstream ships `lessons/`, `review/`, `projects/`, `learning-records/` and `reference/`
empty, so `git pull upstream master` never touches your content. What your Claude invents
under `components/local/` stays in your fork.

---

## Lessons are authored, not written

A lesson is two files. The `.json` decides structure — which components, in what order. The
`.yml` holds everything a human reads. Anything starting with `@` in the JSON is a path into
the YAML.

```json
{ "component": "recall",
  "props": { "conceptId": "hash_ring", "phase": "2",
             "question": "@p2.question", "summary": "@p2.summary" } }
```

The build refuses to write a page that has any error, because **a lesson missing a block
still looks finished**. It checks that every component exists, that props match the declared
shape, that every `@` reference resolves, that no YAML key is written and then never used,
that diagram geometry fits its `viewBox`, and that every concept id a `recall` cites is
declared in the envelope — the server drops undeclared ids when scoring, so the lesson would
appear to work and quietly record nothing.

```sh
make lesson SRC=lessons/0011-async-jobs   # must report no errors AND no warnings
make build                                # every lesson, review and project
make catalog                              # regenerate COMPONENTS.md + the gallery
```

There are **15 components** — `analogy`, `phase`, `prose`, `code`, `diagram`, `quiz`,
`recall`, `teachback`, `flashcards`, `table`, `compare`, `callout`, `source`, `rubric`,
`deliverable`. Naming anything outside that list fails the build, which is what keeps the
vocabulary meaningful rather than a suggestion. Need something genuinely new? Drop a file in
`components/local/` and it joins the registry and the gallery automatically. See
[`COMPONENTS.md`](COMPONENTS.md) and [`LESSON-FORMAT.md`](LESSON-FORMAT.md).

---

## Mastery, and the schedule

A concept counts as learned when **any** of three sources confirms it, and the dashboard
always shows which one:

| Source | How |
|---|---|
| **AI-validated** | you score ≥ 75 on the lesson's teach-back; Gemini scores the free text |
| **Conversation** | you use the concept correctly, unprompted, in chat — recorded immediately, no lesson needed |
| **Project** | you applied it under a constraint it was never taught under, and the delivery met the rubric |

SM-2 then schedules the review. Projects are deliberately **asymmetric**: passing pushes the
interval 1.5× further than the same score from a lesson, because applying is stronger
evidence than explaining — while failing demotes *only* the concepts named, since a project
touches several at once and the delivery does not say which one broke.

`/api/progress` also groups **misconceptions** across every section you have ever answered.
That data was recorded from the first lesson and displayed nowhere; a mistake that shows up
twice is worth more than any score, so the dashboard leads with it.

---

## Prerequisites

| Requirement | Why |
|---|---|
| **Node.js ≥ 18** | runs the server and the renderer |
| **MongoDB** (Atlas or local) | persists mastery, SM-2 schedule, section results |
| **`mongosh`** on PATH | the session loop queries Mongo directly |
| **Gemini API key** | scores free-text answers |
| **Claude Code** | the skill is Claude reading `SKILL.md` |
| **`cloudflared`** (optional) | `make start` publishes a URL so lessons open on a phone |

---

## Language

One workspace, one language. It lives in `learno.json` at the root:

```json
{ "lang": "en" }
```

`pt` (the default) or `en`. It sets every word the engine puts on a page, the
`<html lang>` the dictation reads, the date format, and — the one that is not
cosmetic — **the language the model writes its feedback in**. Without it, an
answer written in English came back scored in Portuguese.

Lesson *content* is separate: it is whatever the author wrote, and `NOTES.md` is
where you say which language that should be.

Adding a language is one entry in `build/strings.js`.

---

## Environment variables

Read from `.env` at the repo root. Start from [`.env.example`](.env.example).

| Var | Required | Default | Used for |
|---|---|---|---|
| `GEMINI_API_KEY` | yes | — | scoring free-text answers (`/api/validate`) |
| `GEMINI_MODEL` | no | `gemini-2.5-flash` | which Gemini model to call |
| `MONGODB_URI` | yes | — | connection string for persistence |
| `MONGODB_DB` | no | `system_design_learn` | **change per study** — one database per subject |
| `PORT` | no | `9990` | any port works; pages derive the API base from their own origin |
| `LEARNO_WORKSPACE` | no | repo root | which directory to serve. Exists for one caller: the engine's own sandbox |
| `LEARNO_MODE` | no | — | `sandbox` swaps in an in-memory store and a stubbed validator |

---

## The server (`server/`)

Local Express app: Gemini proxy plus MongoDB bridge. It also serves the workspace
statically, so lessons open over `http://localhost` — a secure context, which the microphone
needs — instead of `file://`.

| Route | Purpose |
|---|---|
| `GET  /api/health` | liveness — lessons call it on load to decide online/offline |
| `POST /api/validate` | score a free-text answer via Gemini (score, feedback, misconceptions) |
| `POST /api/progress` | record a completed lesson or project → triggers SM-2 |
| `GET  /api/progress` | mastery state + grouped misconceptions → the dashboard |
| `GET  /api/catalog` | every lesson / review / project on disk → the library |
| `GET  /api/next` | parses `NEXT.md` into a decision, a button and a reason |
| `GET  /debug/mic` | standalone mic / Web Speech diagnostics page |

**Collections:** `concepts` (per-concept mastery, `interval_days`, `ease_factor`,
`next_review`, score history), `lessons` (completions, `final_score`, `kind`),
`section_results` (per-section scores and misconceptions), `conversations`.

**Offline is a supported state.** Lessons detect the server on load; when it is down the
free-text boxes are replaced by multiple-choice fallbacks and a banner says what is
unavailable. The lesson still works — it degrades.

---

## Progress analyst (`learno-analyst`)

A read-only Claude Code subagent that grounds every answer about your learning in **real
data** instead of assumptions. It knows the MongoDB schema and the workspace layout, and it
is subject-agnostic — install it once and it serves every study.

```bash
ln -s "$(pwd)/agents/learno-analyst.md" ~/.claude/agents/learno-analyst.md
```

Ask *"how did I do on lesson 9?"*, *"what is due?"*, *"where am I stuck?"* and it returns a
verdict, a table of real scores and dates, and one to three insights — recurring
misconceptions, stagnation, what is overdue. `CLAUDE.md` instructs the main agent to consult
it before answering anything about progress, so the tutor never invents how you are doing.

---

## Developing the engine (`sandbox/`)

Changing the lesson format, the styles or the dashboard means testing against content — but
you should never have to touch a real study, spend a Gemini call, or provision a database to
see whether a layout still renders.

```sh
make sandbox        # fixtures + a public Cloudflare URL   (no MongoDB, no API key)
make sandbox-local  # same, localhost only
make check          # syntax-check the server and the build, validate the seed
make check-errors   # prove the build still refuses every kind of broken lesson
make compare HAND='../study/lessons/*.html' SRC=lessons/0011-name
```

`LEARNO_MODE=sandbox` swaps exactly two things: the **store** becomes an in-memory stand-in
seeded from `sandbox/fixtures/seed.json`, so the real SM-2 code runs against it; and the
**validator** returns a deterministic verdict instead of calling Gemini, so scoring is free,
instant and repeatable. Prefix an answer with `!0`, `!p`, `!ok` or `!m` to force each score
band. State resets on restart, so a visual difference means a real regression.

`sandbox/lessons/0001-kitchen-sink.html` holds one instance of every component — see
[`sandbox/README.md`](sandbox/README.md).

> When you add a component, add it to the kitchen sink in the same commit. The fixture is
> only useful while it stays exhaustive.

---

## How a session works

1. Read `MISSION.md`, `NOTES.md`, `learning-records/` — ground everything in the goal.
2. Query Mongo: what is **due**, what has a **recurring misconception**, what is **stagnant**.
3. Open by saying where you stand, from the data. Not a greeting.
4. Pick: (a) reviews due today → (b) a concept with a recurring misconception → (c) the next
   step toward the mission.
5. Author one tightly-scoped lesson: analogy **before** the term → 2–5 phases, each with a
   diagram and a practice block → teach-back, which drives SM-2 → flash cards → the source it
   stands on.
6. On completion, read the **per-section** results, ask what was confusing and what felt too
   easy, and compare the two — a section they found easy and scored 55 on is the gap they
   cannot see. Write the learning record, then write `NEXT.md`.
7. When a pattern closes, propose the project.

The full loop, with the queries and the rules, is [`SKILL.md`](SKILL.md).

---

## Keeping up with upstream

```bash
git remote add upstream https://github.com/murichristopher/learno.git
git pull upstream master
```

Upstream never writes to your content directories. If your Claude has edited engine files,
expect to resolve those — that is the cost of the engine being editable in place, and it was
chosen deliberately.
