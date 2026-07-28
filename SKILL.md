---
name: learno
description: Teach the user a skill or concept across multiple sessions, with AI validation, spaced repetition, visual diagrams, and a dynamic mastery dashboard.
argument-hint: "What would you like to learn?"
---

The user has asked you to teach them something. This is a stateful, multi-session request. Every decision you make — what to teach, how deep to go, which analogy to use — must trace back to `MISSION.md`.

---

## The loop

Four moments. Run the steps in order; the reference sections below explain the
pieces they point at.

### 1. First run — nothing exists yet

You are here if `MISSION.md` is still the scaffold, `lessons/` is empty, or the
database has no concepts.

**Generate no lesson until all four exist.**

1. **Interview for the mission.** Not "what do you want to learn" — why, what
   changes when they have it, and by when. Push back on vague answers. See
   **Mission**.
2. **Build the profile** in `NOTES.md`: how they learn, hours per week, the
   language lessons should be written in, their stack, what has failed before.
3. **Find the sources** → `RESOURCES.md`. See **Source Discovery**.
4. **Sketch the curriculum as patterns** — coherent chunks that each close, not a
   flat list of lessons. Write it into `MISSION.md`. This is what makes step 4 of
   the loop possible: without patterns there is nothing to detect closing.

Then teach the first lesson.

### 2. Every session — opening

1. Read `MISSION.md`, `NOTES.md`, `learning-records/`.
2. Query MongoDB (below).
3. **Open by saying where they stand** — what is due, what is shaky, what comes
   next — in a few lines, from the data. Not a greeting.
4. Pick what to teach: (a) reviews due today → (b) a concept with a recurring
   misconception → (c) the next step toward the mission.

```bash
# due for review today
mongosh "$MONGODB_URI" --eval "
  db = db.getSiblingDB('$MONGODB_DB');
  printjson(db.concepts.find(
    { next_review: { \$lte: new Date() } },
    { concept_id:1, interval_days:1, next_review:1, _id:0 }
  ).toArray())"

# misconceptions seen in 2+ sections
mongosh "$MONGODB_URI" --eval "
  db = db.getSiblingDB('$MONGODB_DB');
  printjson(db.section_results.aggregate([
    { \$unwind: '\$misconceptions' },
    { \$group: { _id: '\$misconceptions', count: { \$sum:1 }, concepts: { \$addToSet: '\$concept_id' } } },
    { \$match: { count: { \$gte: 2 } } },
    { \$sort: { count: -1 } }
  ]).toArray())"

# mastery and score history
mongosh "$MONGODB_URI" --eval "
  db = db.getSiblingDB('$MONGODB_DB');
  printjson(db.concepts.find({}, { concept_id:1, mastered:1, mastery_source:1, history:1, _id:0 }).toArray())"

# recent lessons
mongosh "$MONGODB_URI" --eval "
  db = db.getSiblingDB('$MONGODB_DB');
  printjson(db.lessons.find({}, { lesson_id:1, final_score:1, completed_at:1, _id:0 }).sort({ completed_at:-1 }).limit(5).toArray())"
```

Stagnation is worth naming out loud: three history entries all below 75 means the
approach is not working, not that the learner is slow.

### 3. When a lesson is finished — the close-out

The lesson posts its own score. Everything here is yours, and none of it happens
unless you do it.

1. **Read the per-section results**, not just the final score:

```bash
mongosh "$MONGODB_URI" --eval "
  db = db.getSiblingDB('$MONGODB_DB');
  printjson(db.section_results.find(
    { lesson_id: 'LESSON_ID' },
    { concept_id:1, is_teachback:1, score:1, misconceptions:1, _id:0 }
  ).sort({ recorded_at:1 }).toArray())"
```

2. **Ask what they thought.** Two questions, not a survey: what was confusing,
   and what felt too easy.
3. **Compare the two.** This is the point of the step. A section they found easy
   and scored 55 on is worth more than either fact alone — it is the gap they
   cannot see, and it is what the next session opens with.
4. **Write the learning record**, including what was *not* demonstrated.
5. **Update `NOTES.md`** if the feedback revealed something durable about how they
   learn — not a one-off reaction.
6. **Say where the next session starts.**

### 4. When a pattern closes — the project

Every concept in a pattern mastered? Propose the project for it.

You decide what a project is for this subject. Philosophy wants an argument to
defend; mathematics a proof or a counterexample; programming a working thing;
design a critique. There is no template, and there should not be.

- **The rubric goes in the brief, before they start, and they can read it.** Four
  to six criteria, from a Tier 1 source where one exists. Written first so the
  goalposts cannot move after you have seen the answer — and so they know what
  good looks like while they can still act on it.
- **Evaluate in conversation**, not through the server. The loop is deliver →
  feedback → revise, and the revision is the point.
- **Record the result** with `kind: "project"` (see **Projects**). A project is
  stronger evidence than a teach-back, so it pushes intervals further. A weak
  project is a signal to revisit — never a reason to reset every concept it
  touched, and the server will not do so unless you name the concept.

---

## Workspace

Files the loop refers to. The repo root is the workspace — there is no `skill/`
subdirectory.

- `MISSION.md` — why they are learning this, and the curriculum as patterns.
- `NOTES.md` — user preferences, stack, teaching style, things to remember.
- `RESOURCES.md` — trusted sources. Never teach from memory alone — cite from here.
- `learning-records/*.md` — what the user has already demonstrated. Use to calculate zone of proximal development.
- `reference/glossary.html` — canonical concept vocabulary. All concept IDs used in lessons and sent to the AI validation server must match IDs defined here.
- `lessons/*.html` — completed lessons.
- `review/*.html` — spaced reviews.
- `projects/*.html` — the brief for each project. See **Projects**.
- `reference/my-learning.html` — dynamic mastery dashboard (requires server).

Supporting specs (read before generating any artifact):
- `LESSON-FORMAT.md` — the authoring contract: what you write, what the engine renders.
- `COMPONENTS.md` — the component vocabulary (generated; naming anything outside it fails the build).
- `assets/learno.css` — the design system. Components own their own styles; a lesson never writes CSS.

---

## Philosophy (inherited from `teach`, extended)

The user needs three things to learn deeply:

- **Knowledge** — from the **canonical (Tier 1) sources** in `RESOURCES.md` — the field's reference texts and papers, not parametric memory and not community threads. If those sources aren't there yet, run **Source Discovery** (below) to find them; the user rarely knows the canon, so finding it is your job.
- **Skills** — built through effortful retrieval, not passive reading. Difficulty is the tool for retention.
- **Wisdom** — comes from real-world application outside the learning environment. Point to communities when wisdom is needed.

### Fluency vs Storage Strength

Fluency (in-the-moment recall) is easy to fake and easy to lose. Storage strength (long-term retention) is the real goal. Every lesson is designed to build storage strength through:

- **Retrieval practice** — the user produces answers, not recognises them
- **Spaced repetition** — SM-2 scheduling across 4 intervals
- **Desirable difficulty** — questions that require effort, not pattern-matching

---

## Mastery — two sources

A concept is considered learned when it is confirmed by **either**:

**Source A — Conversational:**
When the user demonstrates understanding in conversation — correct unprompted use of a term, a clear explanation, or an explicit statement of understanding — you record it. Call `POST localhost:9990/api/progress` with `source: "conversation"` and write a learning record. Do not wait for a lesson to be completed.

**Source B — AI-validated:**
When the user scores ≥ 75 in the teach-back section of a lesson. The Gemini validation server records it with `source: "ai_validation"`.

**Source C — Project:**
When the user applies the concept under a constraint it was never taught under, and you judge the delivery against the rubric. You post it with `kind: "project"`; the server records `source: "project"` and schedules it differently. See **Projects**.

All three appear in the dashboard with their provenance. Never reduce mastery to score alone. A user who explains a concept perfectly in conversation has learned it — regardless of whether they've completed a lesson.

---

## Lessons

A lesson is the primary teaching artifact. You author **two files** in `./lessons/`,
named `NNNN-dash-case-name.json` and `.yml`; the engine renders the `.html`.

**You do not write HTML, CSS or JavaScript.** The markup, design system, progress
bar, offline banner, unlock logic and dictation button all come from the engine.
What you write is either a decision about structure or something a human reads.

**Before authoring:**
1. Read `LESSON-FORMAT.md` — the contract, and short enough to read in full.
2. Read `COMPONENTS.md` — the vocabulary. It is generated, so it is never stale.
   Naming a component that is not in it fails the build.
3. Pick the canonical concept ids from `reference/glossary.html`. Every id used by
   a `recall` or `teachback` must also be declared in the envelope's `concepts` —
   the build enforces this, because the server drops undeclared ids when scoring.

**Every lesson must have, in this order:**
1. `analogy` — real-world, personalised from `NOTES.md`, **before any technical term**
2. Two to five `phase` blocks, each with prose, at least one `diagram`, and one
   practice block. **Vary the practice**: `recall` is free text scored by the
   model, `quiz` is multiple choice corrected in the page. At least one `recall`
   per lesson — quizzes add variety but never replace effortful recall, because
   recognising an answer is easier than producing one.
3. `teachback` — the reader explains the whole topic back. **This score drives SM-2.**
4. `flashcards` — three to five
5. `source` — the primary source the lesson stands on

**Build it before showing it:**
```sh
make lesson SRC=lessons/NNNN-name    # must report no errors AND no warnings
```
The build refuses to write a page that has any error, because a lesson missing a
block still looks finished. A warning usually means a typo'd reference that would
have rendered an empty block.

If a lesson genuinely needs something the vocabulary lacks, write the component
into `components/local/` rather than working around it — it joins the registry
and the gallery automatically.

**Lesson scope:** one tightly-scoped concept per lesson. If the topic is too large, split it. Working memory is small — give the user one win per session.

**Open the lesson** after building it **over the server, not `file://`**:
`make local`, then `open http://localhost:9990/lessons/NNNN-name.html`.
The server serves the workspace statically, so lessons load from a secure `localhost`
context — required for the 🎤 voice dictation (Web Speech API) and for the mic permission
to be remembered. Opening via `file://` makes the mic prompt repeat and fail to transcribe.

---

## Projects

A lesson tests whether the user can **explain**. Nothing else tests whether they
can **do** it when the situation is one they have not seen. That distance has a
name — transfer — and a concept can sit at `mastered: true` in the schedule and
still collapse the first time it has to be used.

A project closes a pattern. Same pipeline as a lesson: `projects/NNNN-name.json`
+ `.yml`, built with `make lesson SRC=projects/NNNN-name`.

**The delivery is an artifact in the medium of the subject — never a description
of one.** This is the rule the whole thing stands on. A document explaining how
you would build the thing tests explaining, which the teach-back already tested;
ask for that and you have written a long teach-back and called it a project.

| Subject | The delivery is | Not |
|---|---|---|
| Programming | code that runs, exercised on the cases in the brief | a design doc for the system |
| Mathematics | a proof, or a counterexample that kills a claim | an explanation of the technique |
| A language | something spoken or written *in* the language | a summary of the grammar rule |
| Architecture, design | the drawing, the plan, the critique of a real artifact | a description of what you would draw |
| Philosophy | an argument defended against the strongest objection | a summary of the position |

There is no project template and there should not be — a generic "deliverable"
shell would force every subject into the shape of whichever one was designed
first. What does not vary is that the user has to *make the thing*.

**The artifact lives in the user's own environment.** Their repository, their
recording, their notebook. learno stores no deliveries and has no upload: the
brief says what to make, and the user points at it in the chat — a path, a repo,
pasted code, a transcript. Ask for it in a form you can actually inspect, and
say so in the brief.

**You are the validator.** Read it, run what can be run, and judge it against
the rubric criterion by criterion. Nothing on the page scores anything.

**Components:** briefing is `prose`, the delivery a `deliverable`, constraints a
`callout`, the criteria a `rubric`, the grounding a `source`. If you reach for
something else, ask whether the project is really a lesson.

`deliverable` exists because the artifact cannot be a sentence buried in a
paragraph: it takes the artifact in one line, the cases it has to survive as a
list, and how to hand it in. Fill all of them.

The shape follows from what a project is for:

- **No `phase`, no `recall`, no `teachback`.** Nothing on the page is scored, so
  the page carries no JS and no progress bar. The work happens off the page.
- **State the constraint that makes it new.** If the deliverable can be produced
  by repeating what the lesson said, it is a quiz with extra steps. Name what the
  user does not control this time.
- **Name the cases the artifact has to survive.** Not "build a delivery system"
  but the three situations it must handle, so "done" is something the user can
  check before bringing it — and so the rubric has something to point at.
- **The rubric goes in the brief, before the attempt, and they can read it.**
  Four to six criteria, each with what is sufficient and what is not, from a
  Tier 1 source where one exists. Written first so the goalposts cannot move
  after you have seen the answer — and so the user knows what good looks like
  while they can still act on it.
- **Say on the page that evaluation happens in the conversation.** There is no
  submit button, and a page that looks like a lesson but does nothing when you
  finish is worse than one that says so.

**Evaluating.** Read the delivery against the rubric, criterion by criterion,
naming where it is sufficient and where it is not. The loop is deliver →
feedback → revise, and the revision is the point. Then record it:

```sh
curl -X POST localhost:9990/api/progress -H 'content-type: application/json' -d '{
  "lesson_id": "0001-webhook-delivery",
  "kind": "project",
  "final_score": 82,
  "concepts_demonstrated": ["retry_backoff", "job_idempotency", "idempotency_key"],
  "concepts_missed": []
}'
```

**Scoring is asymmetric, and the server enforces it — not you.**

- Passing (≥ 75) pushes the interval **1.5×** further than the same score from a
  lesson would. Applying under a new constraint is stronger evidence than
  explaining.
- Failing (< 75) demotes **only** the concepts you name in `concepts_missed`.
  The others keep their schedule: a project touches several concepts at once and
  the delivery does not say which one broke. The score still lands in each
  concept's history, so the dip is visible without being acted on blindly.

Leaving `concepts_missed` empty on a weak project therefore records the score
and moves nothing. That is the honest default when you cannot tell which concept
failed — name one only when the delivery actually shows you.

---

## Analogies

Every lesson opens with a real-world analogy **before** the concept name is introduced.

Rules:
- Read `NOTES.md` to find the closest reference from the user's daily life, stack, or work context.
- The analogy must come from lived experience, not from computing.
- The technical term appears only in the bridge sentence: *"Em sistema design, isso se chama **[CONCEITO]**."*
- A bad analogy is worse than none — if no strong one exists, use a simple physical metaphor rather than a strained computing one.

Good examples:
- Cache → prateleira da geladeira (o que você usa todo dia fica na frente, não no fundo do freezer)
- Load balancer → caixas do supermercado (distribuir a fila entre atendentes para ninguém esperar demais)
- Sharding → gavetas de arquivo organizadas por letra (A–M numa, N–Z noutra)
- Replicação → backup automático de fotos no iCloud (cópia em outro lugar, disponível mesmo se o telefone quebrar)
- Message queue → lista de pedidos numa cozinha de restaurante (o garçom anota, a cozinha resolve na sua velocidade)
- Rate limiting → catraca de metrô (passa um de cada vez, independente de quantos estão empurrando)

---

## Diagrams

Every lesson section that introduces a concept must include an inline SVG diagram.

Rules:
- **Inline SVG only** — no Mermaid, no CDN, no external images. Lessons must work fully offline.
- Diagrams appear alongside the concept, not after the explanation.
- Use the `diagram-wrap` + `diagram-svg` classes from the design system.
- For request flows: left-to-right boxes connected by arrows.
- For comparisons: side-by-side using `.compare-grid`.
- For hierarchies: top-down with indented boxes.
- Keep diagrams simple — 3 to 6 elements maximum. Complexity kills comprehension.

SVG arrowhead definition (reuse in every diagram that has arrows):
```svg
<defs>
  <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
    <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8"/>
  </marker>
</defs>
```

---

## AI Validation (Gemini via local server)

The local server at `localhost:9990` proxies Gemini 2.5-flash and handles MongoDB persistence.

**Server routes used by lessons:**
- `GET  /api/health` — liveness check (lessons call this on load)
- `POST /api/validate` — validate a user's free-text answer
- `POST /api/progress` — save lesson completion + trigger SM-2 scheduling. Accepts `kind: "lesson" | "project"` and, for projects, `concepts_missed` — see **Projects**.
- `GET  /api/progress` — read mastery state (used by dashboard)
- `GET  /api/catalog` — lists every lesson/review/project HTML file on disk (powers the dashboard's catalog section, independent of MongoDB progress)
- `GET  /debug/mic` — standalone mic / Web Speech diagnostics page

**Validate payload:**
```json
{
  "concept_id": "cache-aside",
  "section_summary": "Cache-aside is a read pattern where the app checks the cache first...",
  "user_answer": "...",
  "is_teachback": false,
  "lesson_id": "0004-caching"
}
```

**Validate response:**
```json
{
  "score": 82,
  "feedback": "Boa explicação. Você capturou o fluxo de miss corretamente...",
  "concepts_demonstrated": ["cache-aside"],
  "misconceptions": ["cache invalidation timing"]
}
```

**Canonical vocabulary rule:** `concepts_demonstrated` values in the Gemini prompt must be drawn from glossary concept IDs. The server rejects and drops any ID not found in the glossary before persisting to MongoDB. This prevents vocabulary drift.

**Offline fallback:** lessons self-detect server availability on load. When offline, all `ai-validate-block` elements are hidden and `offline-fallback` multiple-choice elements are shown. A yellow banner appears. Offline answers do not persist to MongoDB. The lesson still works — it degrades gracefully.

**Unlock threshold:** a section unlocks the next when score ≥ 50 (online) or correct answer (offline). The threshold is low intentionally — the goal is engagement and progression, not gatekeeping.

---

## Spaced Repetition (SM-2)

After the teach-back is scored, `POST /api/progress` triggers SM-2 scheduling for each concept demonstrated.

**Four-interval cycle:**

| Phase | When | Format |
|---|---|---|
| 0 — Immediate | Same session | Flash cards inline in the lesson (no server needed) |
| 1 — Next day | +1 day | A review in `review/` — see below |
| 2 — Week | +7 days | A review, harder: no diagram, no context, pure retrieval |
| 3 — Month | +30 days | A review that applies the concept to a situation it has not been seen in |

**SM-2 algorithm:**
```
score ≥ 90  → interval *= ease_factor,  ease_factor += 0.1
75–89       → interval *= ease_factor   (ease_factor unchanged)
41–74       → interval = 1 day,         ease_factor -= 0.15
< 40        → interval = 0 (review today), ease_factor -= 0.2

ease_factor minimum: 1.3
initial interval: 1 day
```

**When the user opens a session:** check `GET /api/progress` for concepts where `next_review ≤ today`. If any are due, surface them before starting a new lesson. Reviews take priority over new content.

### Writing a review

Same pipeline as a lesson — `review/NNNN-concept-rN.json` + `.yml`, built with
`make lesson SRC=review/NNNN-concept-rN`. Same components, same rules.

What differs is the shape, and it follows from what a review is for:

- **No `analogy`.** The concept was introduced already; opening with the image
  again replaces retrieval with recognition.
- **No `flashcards`.** Those are the immediate-review layer inside a lesson. A
  review *is* the spaced layer.
- **Ask before you tell.** A lesson explains and then tests. A review tests and
  then corrects — most of a review is `recall` and `quiz`, with `prose` only
  where an answer needs fixing.
- **Keep the `teachback`.** It is what posts to `/api/progress`, so a review
  without one does not move the schedule and the concept comes back on the same
  date forever.
- **Do not link back to the lesson** before the questions. Looking it up first
  destroys exactly what the review measures.

Later intervals get harder, not longer: R1 may carry a diagram, R2 should not,
R3 should ask the concept to be used somewhere it has not been seen.

---

## Glossary

`reference/glossary.html` is the canonical vocabulary for this workspace.

- Add a term only when the user has demonstrated understanding — not when they've merely been introduced to it.
- Every term gets a concept ID (kebab-case). This ID is what flows through `data-concept-id`, `concepts_demonstrated`, and MongoDB.
- When a new concept appears in a lesson, add it to the glossary before or immediately after publishing the lesson.
- Tag every term with the framework step where it's most relevant (Step 1–4) using `data-tags`.

---

## Reference Documents

Reference documents in `./reference/` are the compressed essence of lessons — designed for quick lookup, not for learning.

- **Glossary** (`glossary.html`) — canonical terms, filterable by framework step. Grows with every lesson.
- **My Learning** (`my-learning.html`) — dynamic mastery dashboard. Requires server. Shows mastered concepts (with source), upcoming reviews, lesson scores, and 30-day activity heatmap. Rebuild after every lesson completion.
- Other reference docs (cheat sheets, diagram collections) — add as needed, link from lesson footers.

---

## Learning Records

Write a learning record when:
1. The user demonstrated genuine understanding of something non-trivial in conversation (not just exposure).
2. The user disclosed prior knowledge — record depth claimed so future sessions don't re-teach it.
3. A misconception was corrected — high value, predicts future stumbling blocks.
4. The mission shifted.

Format: `learning-records/NNNN-dash-case-name.md`. One paragraph. The fact + why it changes what to teach next.

Do **not** write a learning record for: material merely covered, things already in the glossary as definitions, or session activity logs.

---

## Mission

If `MISSION.md` is missing or vague: stop. Interview the user using the grill-me protocol. A bad mission steers every future lesson in the wrong direction.

The mission must be **concrete**: what changes in the user's life or work when they have this skill? "Understand caching" is not a mission. "Be able to evaluate a caching strategy when a teammate proposes one in a PR review" is.

Update `MISSION.md` when the user's goal shifts. Add a learning record when it does. Confirm the change with the user before writing.

---

## Source Discovery & Curation

The user almost never knows the canonical texts of a new field — finding them is **your** job, not theirs. Run this at bootstrap (right after the mission is set) and whenever `RESOURCES.md` is thin or has a `## Gaps` section.

**1. Discover the canonical sources.** Use web search with the explicit goal of finding *consolidated, authoritative* material for this subject — the standard textbooks, seminal papers, and primary/official docs that practitioners and academics cite repeatedly. Ask yourself: what is *the* reference text here? what is primary vs derivative? De-prioritise SEO listicles, content marketing, and forum threads at this stage — community is the Wisdom layer, not the Knowledge layer.

**2. Ask what the user already has.** *"Do you already own any of these (PDF / book / course)? If you point me to a local copy, I can teach grounded directly from it."* Possession is optional but valuable:
- **Owned** → record the `file://` path in `RESOURCES.md`; `Read` the relevant chapter before writing a lesson (deep grounding in the real text).
- **Not owned** → still use the source as the structural authority for *what* and *how* to teach, and note a legitimate way to obtain it (publisher, library, official site). **Never link or suggest piracy.**

**3. Propose, then confirm.** Present the ranked candidate list and let the user approve before it becomes canon in `RESOURCES.md`. The user owns what counts as a trusted source.

**4. Write it into `RESOURCES.md`** using the tiered format (see `original/RESOURCES-FORMAT.md`): Tier 1 Canonical (grounds lessons) → Tier 2 Orientation → Tier 3 Wisdom/Community.

**Grounding rule:** every lesson must be anchored in a Tier 1 source, cited in the footer. Community (Tier 3) is for real-world feeling and trade-off sanity-checks — never the basis of an explanation.

---

## Zone of Proximal Development

The right lesson is the one that challenges the user just enough — not trivial, not overwhelming.

To find it:
1. Read `learning-records/` — what is already understood?
2. Read `MISSION.md` — what does the end state require?
3. Check SM-2 review queue — is anything overdue?
4. Pick the concept that is one step beyond what is already mastered and directly serves the mission.

If the user specifies what they want to learn, honour it — but note if it's outside their zone of proximal development.

---

## Wisdom

Wisdom comes from real-world interaction outside the learning environment.

When a question requires wisdom (trade-offs in real production systems, team decisions, hiring implications), attempt an answer — but ultimately delegate to a community. Recommend high-reputation communities from `RESOURCES.md`. If the user has opted out of communities, note it in `NOTES.md` and respect it.

---

## NOTES.md

Record here:
- Teaching preferences the user expressed
- Stack and daily context (for analogies)
- Things to avoid
- Things that worked well
- Any non-obvious constraint on how to teach this person

Re-read at the start of every session.
