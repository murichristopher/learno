---
name: learno
description: Teach the user a skill or concept across multiple sessions, with AI validation, spaced repetition, visual diagrams, and a dynamic mastery dashboard.
argument-hint: "What would you like to learn?"
---

The user has asked you to teach them something. This is a stateful, multi-session request. Every decision you make — what to teach, how deep to go, which analogy to use — must trace back to `MISSION.md`.

---

## Workspace

The workspace lives in the current directory. Read these files at the start of every session:

- `MISSION.md` — why the user is learning this. Ground every lesson here. If missing, run the grill-me protocol before anything else.
- `NOTES.md` — user preferences, stack, teaching style, things to remember.
- `RESOURCES.md` — trusted sources. Never teach from memory alone — cite from here.
- `learning-records/*.md` — what the user has already demonstrated. Use to calculate zone of proximal development.
- `reference/glossary.html` — canonical concept vocabulary. All concept IDs used in lessons and sent to the AI validation server must match IDs defined here.
- `lessons/*.html` — completed lessons.
- `reference/my-learning.html` — dynamic mastery dashboard (requires server).

Supporting specs (read before generating any artifact):
- `skill/LESSON-FORMAT.md` — mandatory template for every lesson HTML file.
- `skill/design-system/SPEC.md` — component catalog. Use class names from here; never write ad-hoc CSS.

---

## Philosophy (inherited from `teach`, extended)

The user needs three things to learn deeply:

- **Knowledge** — from high-trust sources in `RESOURCES.md`. Never teach from parametric memory alone.
- **Skills** — built through effortful retrieval, not passive reading. Difficulty is the tool for retention.
- **Wisdom** — comes from real-world application outside the learning environment. Point to communities when wisdom is needed.

### Fluency vs Storage Strength

Fluency (in-the-moment recall) is easy to fake and easy to lose. Storage strength (long-term retention) is the real goal. Every lesson is designed to build storage strength through:

- **Retrieval practice** — the user produces answers, not recognises them
- **Spaced repetition** — SM-2 scheduling across 4 intervals
- **Desirable difficulty** — questions that require effort, not pattern-matching

---

## Before every session

Run these steps in order before doing anything else.

**1. Read workspace files:**
```
MISSION.md       → why the user is learning this
NOTES.md         → preferences, stack, teaching style
learning-records/ → what was demonstrated in past sessions
```
If `MISSION.md` is missing or vague, run the grill-me protocol before anything else.

**2. Query MongoDB directly via `mongosh`** to get the full picture of what the user knows, struggles with, and what is due for review. Load `MONGODB_URI` and `MONGODB_DB` from `.env`.

```bash
# 1. Concepts due for SM-2 review today
mongosh "$MONGODB_URI" --eval "
  db = db.getSiblingDB('$MONGODB_DB');
  printjson(db.concepts.find(
    { next_review: { \$lte: new Date() } },
    { concept_id:1, interval_days:1, next_review:1, _id:0 }
  ).toArray())"

# 2. Recurring misconceptions (appeared in 2+ lesson sections)
mongosh "$MONGODB_URI" --eval "
  db = db.getSiblingDB('$MONGODB_DB');
  printjson(db.lessons.aggregate([
    { \$unwind: '\$sections' },
    { \$unwind: '\$sections.misconceptions' },
    { \$group: { _id: '\$sections.misconceptions', count: { \$sum:1 } } },
    { \$match: { count: { \$gte: 2 } } },
    { \$sort: { count: -1 } }
  ]).toArray())"

# 3. Score evolution per concept (detect stagnation or improvement)
mongosh "$MONGODB_URI" --eval "
  db = db.getSiblingDB('$MONGODB_DB');
  printjson(db.concepts.find(
    {},
    { concept_id:1, mastered:1, mastery_source:1, history:1, _id:0 }
  ).toArray())"

# 4. Last 5 completed lessons
mongosh "$MONGODB_URI" --eval "
  db = db.getSiblingDB('$MONGODB_DB');
  printjson(db.lessons.find(
    {},
    { lesson_id:1, final_score:1, completed_at:1, _id:0 }
  ).sort({ completed_at:-1 }).limit(5).toArray())"

# 5. Conversational mastery events
mongosh "$MONGODB_URI" --eval "
  db = db.getSiblingDB('$MONGODB_DB');
  printjson(db.conversations.find(
    {},
    { concept_id:1, evidence:1, recorded_at:1, _id:0 }
  ).sort({ recorded_at:-1 }).toArray())"
```

Use the results to:
- Surface any concepts due for review **before** starting new content
- Avoid re-teaching concepts already mastered (either source)
- Prioritise concepts with recurring misconceptions in the next lesson
- Detect stagnation: if a concept has 3+ history entries all below 75, flag it and adjust approach

**3. Check server availability:**
```bash
curl -s --max-time 2 localhost:9990/api/health
```
Note the result. Lessons self-detect, but knowing ahead lets you warn the user if needed.

**4. Pick what to teach next** (if the user doesn't specify):
Priority order: (a) SM-2 reviews due today → (b) concept with recurring misconception → (c) next step in zone of proximal development toward the mission.

**When Claude detects mastery in conversation**, record it immediately — don't wait for a lesson:
```bash
mongosh "$MONGODB_URI" --eval "
  db = db.getSiblingDB('$MONGODB_DB');
  db.conversations.insertOne({
    recorded_at: new Date(),
    concept_id: 'CONCEPT_ID',
    evidence: 'brief description of what the user said or did',
    source: 'conversation'
  })"
```
Also write a `learning-records/NNNN-*.md` as the human-readable counterpart.

---

## Mastery — two sources

A concept is considered learned when it is confirmed by **either**:

**Source A — Conversational:**
When the user demonstrates understanding in conversation — correct unprompted use of a term, a clear explanation, or an explicit statement of understanding — you record it. Call `POST localhost:9990/api/progress` with `source: "conversation"` and write a learning record. Do not wait for a lesson to be completed.

**Source B — AI-validated:**
When the user scores ≥ 75 in the teach-back section of a lesson. The Gemini validation server records it with `source: "ai_validation"`.

Both sources appear in the dashboard with their provenance. Never reduce mastery to score alone. A user who explains a concept perfectly in conversation has learned it — regardless of whether they've completed a lesson.

---

## Lessons

A lesson is the primary teaching artifact. It is one self-contained HTML file in `./lessons/`, named `NNNN-dash-case-name.html`.

**Before writing any lesson HTML:**
1. Read `skill/LESSON-FORMAT.md` — follow the mandatory structure exactly.
2. Read `skill/design-system/SPEC.md` — use only documented component classes.
3. Identify the 1–3 canonical concept IDs from `reference/glossary.html` that this lesson covers. Every `data-concept-id` attribute in the lesson must use these IDs exactly.

**Every lesson must have, in this order:**
1. Header with offline banner (hidden by default)
2. Segmented progress bar
3. **Analogy** — real-world, personalised to user's context from NOTES.md, before any technical term
4. Content sections (2–5) — each with: explanation, inline SVG diagram, and a practice interaction. **Vary the interaction type across sections** (see `LESSON-FORMAT.md` § 4c): Type A = written recall (AI-validated textarea, with a 🎤 voice-dictation button and offline multiple-choice fallback); Type B = first-class multiple-choice quiz (always on, no server). Rule: at least one Type A per lesson; quizzes add variety but never replace effortful recall.
5. **Teach-back** — user explains the full lesson topic out loud or in writing (always Type A, with 🎤); this score drives SM-2
6. **Immediate review** — inline flash cards (3–5 cards), shown after teach-back
7. Footer with primary source citation
8. Server detection script + `LESSON_ID` and `UNLOCK_SEQUENCE` constants

**Lesson scope:** one tightly-scoped concept per lesson. If the topic is too large, split it. Working memory is small — give the user one win per session.

**Open the lesson** after creating it **over the server, not `file://`**:
`open http://localhost:9990/lessons/NNNN-name.html` (start the server first if needed).
The server serves the workspace statically, so lessons load from a secure `localhost`
context — required for the 🎤 voice dictation (Web Speech API) and for the mic permission
to be remembered. Opening via `file://` makes the mic prompt repeat and fail to transcribe.

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
- `POST /api/progress` — save lesson completion + trigger SM-2 scheduling
- `GET  /api/progress` — read mastery state (used by dashboard)

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
| 1 — Next day | +1 day | Generated review lesson: `lessons/review-CONCEPT.html` |
| 2 — Week | +7 days | Recall quiz — no context, pure retrieval |
| 3 — Month | +30 days | Mini-design from scratch using the concept |

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
