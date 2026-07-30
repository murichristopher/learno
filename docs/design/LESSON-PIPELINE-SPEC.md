# Lesson pipeline — spec for review

> **Status: shipped.** Kept as the design record — the numbers that motivated the
> pipeline are here and nowhere else. The live contract is
> [`LESSON-FORMAT.md`](../../LESSON-FORMAT.md); the vocabulary is
> [`COMPONENTS.md`](../../COMPONENTS.md), which is generated. Where this document
> and those disagree, they win.

## The problem, measured

Averaged over the 10 lessons currently in the repo, every lesson the AI writes
breaks down like this:

| Layer | Per lesson | Share | Notes |
|---|---:|---:|---|
| CSS + JS | 13.1K | 34% | byte-identical in every lesson |
| Structural tags | 12.3K | 32% | wrapper markup around the content |
| SVG diagrams | 6.6K | 17% | hand-drawn per lesson |
| **Prose** | **6.2K** | **16%** | the only irreducible part |
| **Total** | **38.2K** | | |

**84% of the AI's output per lesson is machinery.** It is re-derived from
`LESSON-FORMAT.md` every single time, it drifts between lessons, and it is the
bulk of the cost and latency of authoring one.

The goal is that the AI writes the 16% and the engine supplies the rest.

## The model

learno is a public repo. A learner **forks** it; the fork *is* their study
workspace. Engine and content live in one tree — there is no `skill/`
subdirectory, no vendoring, no submodule. Their Claude edits the engine in
place, including adding components. Upstream improvements arrive by
`git pull upstream main`, run manually. What a fork invents stays in that fork.

```
learno/                       ← forked; this is the workspace
├─ MISSION.md  NOTES.md  RESOURCES.md      yours
├─ lessons/  review/  reference/           yours
├─ learning-records/                       yours
│
├─ components/core/           engine — upstream owns
├─ components/local/          engine — your fork owns
├─ build/                     engine — the renderer
├─ server/                    engine
├─ sandbox/                   engine
└─ SKILL.md  LESSON-FORMAT.md              engine
```

### Layout change

Today the engine assumes it sits at `<workspace>/skill/server`. Under this model
it sits at the repo root. `LEARNO_WORKSPACE` stops being a workaround and the
two-levels-up path assumption is deleted outright — along with the footgun where
the server resolved to the *parent of the repo* and would have served every
sibling project.

`system-design` is on the old layout and gets updated by hand, separately.

## Authoring: three files per lesson

```
lessons/
  0011-consistent-hashing.json    1.8K   structure     ← AI writes
  0011-consistent-hashing.yml     6.4K   content       ← AI writes
  0011-consistent-hashing.html    ~5K    built         ← engine writes, committed
                                                        (links ../assets/, not inlined)
```

All three are committed. `/api/catalog` and the dashboard list only `*.html`.

**The split rule:** JSON says *which components, in what order, with what ids*.
YAML holds *everything human or visual*, keyed by id — prose and raw SVG alike.
Any JSON string beginning with `@` is a path into the YAML.

### The JSON

```json
{
  "id": "0011-consistent-hashing",
  "title": "@meta.title",
  "subtitle": "@meta.subtitle",
  "concepts": ["consistent_hashing", "virtual_nodes"],
  "blocks": [
    { "component": "analogy",
      "props": { "label": "@analogy.label", "text": "@analogy.text", "bridge": "@analogy.bridge" } },

    { "component": "phase", "id": "1", "props": { "title": "@p1.title" },
      "children": [
        { "component": "prose",   "props": { "text": "@p1.body" } },
        { "component": "diagram", "props": { "svg": "@diagrams.ring", "caption": "@p1.caption" } },
        { "component": "recall",
          "props": { "conceptId": "consistent_hashing",
                     "question": "@p1.question",
                     "summary": "@p1.summary",
                     "fallback": "@p1.fallback" } }
      ] },

    { "component": "teachback",
      "props": { "conceptIds": ["consistent_hashing", "virtual_nodes"],
                 "question": "@teachback.question" } },

    { "component": "flashcards", "props": { "cards": "@flashcards" } }
  ]
}
```

### The YAML

```yaml
meta:
  title: "Lição 11 — Consistent Hashing"
  subtitle: "Por que adicionar um servidor não deveria invalidar o cache inteiro"

analogy:
  label: "Pense numa mesa de bufê circular"
  text: "…"
  bridge: "Esse círculo é exatamente o hash ring."

p1:
  title: "O problema do módulo"
  body: |
    Com `hash(chave) % N`, mudar N remapeia quase todas as chaves…
  caption: "Redistribuição com módulo simples"
  question: "Por que trocar N invalida quase todo o cache?"
  summary: "Seção sobre hashing modular e remapeamento."
  fallback:
    options:
      - { text: "Porque o hash muda", correct: false }
      - { text: "Porque o divisor muda e o resto de quase toda chave muda", correct: true }
    ok:  "Isso. O hash é estável; o destino é que se move."
    bad: "O hash da chave não muda — o que muda é o divisor."

diagrams:
  ring: |
    <svg viewBox="0 0 600 300" class="lx-svg">…</svg>

flashcards:
  - { front: "Consistent hashing", back: "Mapeia chaves e nós no mesmo anel…" }
```

### Why `@` references instead of inlining text in the JSON

Because the AI writes both files in one pass and a reference that points at
nothing is a **build error naming the exact path** — whereas prose inlined into
JSON has to be escaped, can't hold multi-line markdown comfortably, and makes the
structure unreadable at review time. It also means an unreferenced YAML key can
be reported as a warning, which catches typos that would otherwise render as a
silently empty block.

## The component vocabulary (v1)

`header`, `progress bar`, `completion / next-review box` and `footer` are **not
authored** — the template always emits them, derived from the envelope. The AI
only writes content blocks, which cuts what it has to know.

| Component | Props | From LESSON-FORMAT.md |
|---|---|---|
| `analogy` | label, text, bridge | §3 — mandatory, before any technical term |
| `phase` | title, id, children | §4a — a content section |
| `prose` | text (markdown subset) | §4a |
| `diagram` | svg, caption | §4b — mandatory per section |
| `compare` | columns[{label, body}] | §4b — side-by-side |
| `callout` | variant (note/warn/danger), text | used by 0004–0010 |
| `code` | lang, source | used by 0004–0010 |
| `table` | caption, headers, rows | used by 0004–0010 |
| `recall` | conceptId, question, summary, fallback | §4c type A — AI-validated |
| `quiz` | question, options, ok, bad | §4c type B — multiple choice |
| `teachback` | conceptIds, question | §5 — mandatory |
| `flashcards` | cards[{front, back}] | §6 — mandatory |
| `source` | title, url, note | §7 |

Thirteen. Anything a lesson needs beyond this is a **new component**, written by
the AI into `components/local/`.

### Component file interface

```js
// components/local/timeline.js
module.exports = {
  meta: {
    name: 'timeline',
    purpose: 'sequence of events along an axis',
    props: { events: 'array', caption: 'string?' },
    demo: { events: [{ at: '2011', label: 'Kafka na LinkedIn' }], caption: 'Exemplo' }
  },
  render(props, ctx) {
    return `<div class="lx-timeline">…</div>`;
  }
};
```

`meta.demo` is what makes the next section possible.

### core/ vs local/, and the pull problem

`components/core/` is upstream's. `components/local/` is the fork's, and wins on
a name collision — so a fork can override a core component without ever editing
an upstream file. One component per file means git never has to merge the same
file from two sides.

**The registry and the kitchen-sink fixture are generated from the component
files**, not hand-maintained — so neither can fall out of date with the
vocabulary, which is the failure a hand-written fixture always eventually hits.

Merge conflicts on `git pull` are accepted: pulls are rare, and resolving one is
cheaper than the machinery to avoid it. One component per file already keeps the
common case clean.

## Build

```sh
make lesson SRC=lessons/0011-consistent-hashing   # one lesson
make build                                        # everything stale
make sandbox                                      # unchanged
```

Pipeline: read JSON → validate envelope against JSON Schema → resolve every `@`
reference against the YAML → validate each block's props against its component's
`meta.props` → render → inline the design system and runtime → write `.html`.

### Failure behaviour

Every one of these **fails the build and writes no HTML**, naming the file and
the block index:

- unknown component
- SVG carrying its own colours (hex, `rgb(`/`hsl(`, or inline `fill=`/`stroke=`)
- `@` reference that resolves to nothing
- props missing or of the wrong type per `meta.props`
- a `recall`/`teachback` naming a concept absent from the envelope's `concepts`

Warnings (build still succeeds): YAML keys nobody references, a `phase` with no
practice block, a lesson with no `analogy`.

A half-rendered lesson is worse than a failed build — it looks finished.

## Design system

Ported from `orbita/src/lib/shell-identity.ts`. Those are Tailwind class strings
compiled by a React build; lessons are self-contained HTML with no build step, so
the constants are hand-ported to real CSS once, keeping the glass look:

```css
:root {
  --axo-accent:      oklch(0.45 0.25 290);
  --axo-radius:      1.5rem;
  --axo-text:        #111827;   /* AXO_TEXT_PRIMARY   */
  --axo-text-2:      #374151;   /* AXO_TEXT_SECONDARY */
  --axo-text-muted:  #6b7280;   /* AXO_TEXT_MUTED     */
  --axo-text-subtle: #9ca3af;   /* AXO_TEXT_SUBTLE    */
}
.lx-card {
  border-radius: var(--axo-radius);
  background: rgb(255 255 255 / .6);
  border: 1px solid rgb(233 213 255 / .3);
  backdrop-filter: blur(24px);
  box-shadow: 0 4px 24px -4px rgb(147 51 234 / .08);
}
@media (prefers-reduced-transparency: reduce) {
  .lx-card { background: #fff; backdrop-filter: none; }
}
```

**Performance note.** Stacked `backdrop-filter` is the most expensive paint on a
mid-range phone, which is where these are read. The full glass look was chosen
deliberately; the `prefers-reduced-transparency` fallback above means it degrades
rather than janks for anyone who has asked their OS to reduce it. If lessons feel
sluggish on your phone, the honest fix is fewer blurred surfaces, not a smaller
blur radius.

### Diagrams inherit the design system

SVG stays hand-authored in the YAML, but it is **not allowed to carry its own
colours**. The stylesheet owns the diagram vocabulary, and the SVG only applies
classes:

```css
.lx-svg           { color: var(--axo-text-2); }          /* currentColor base */
.lx-node          { fill: var(--axo-card);   stroke: var(--axo-border); rx: 12; }
.lx-node--accent  { fill: color-mix(in srgb, var(--axo-accent) 12%, transparent);
                    stroke: var(--axo-accent); }
.lx-node--muted   { fill: transparent;       stroke: var(--axo-text-subtle); }
.lx-edge          { stroke: var(--axo-text-muted); fill: none; marker-end: url(#lx-arrow); }
.lx-edge--dashed  { stroke-dasharray: 5 4; }
.lx-label         { fill: var(--axo-text);   font-size: 13px; }
.lx-label--muted  { fill: var(--axo-text-muted); font-size: 11px; }
```

So a diagram is written like this — no hex, no inline `fill`, arrowhead marker
supplied by the stylesheet:

```yaml
diagrams:
  ring: |
    <svg viewBox="0 0 600 260" class="lx-svg" role="img"
         aria-label="Anel de hash com três nós">
      <rect class="lx-node lx-node--accent" x="20"  y="90" width="120" height="56"/>
      <text  class="lx-label"               x="80"  y="124" text-anchor="middle">Cliente</text>
      <path  class="lx-edge"                d="M140 118 H 240"/>
      <rect class="lx-node"                 x="240" y="90" width="120" height="56"/>
    </svg>
```

Because every colour resolves through the same custom properties as the rest of
the page, diagrams **follow light/dark automatically** and can never drift from
the design system — which is what raw SVG would otherwise guarantee.

**Enforced, not merely requested.** The build rejects any SVG in the YAML that
contains a hex colour, an `rgb(`/`hsl(` literal, or an inline `fill=` / `stroke=`
attribute, naming the diagram key. Asking the AI nicely in a prompt is how the
old format drifted in the first place — see the `classList.add` bug, where the
documented snippet and the shipped lessons had disagreed for months. The prompt
in `SKILL.md` states the rule; the build is what makes it true.

## Shared assets are linked, not inlined

```html
<link rel="stylesheet" href="../assets/learno.css">
<script src="../assets/learno.js" defer></script>
```

A lesson is only expected to work inside the project, so the ~13K of design
system and runtime lives in `assets/` and every lesson links it relatively —
which resolves over `http://` and `file://` alike.

Consequences: each built lesson drops to **~5K** instead of ~16K, and a design
system fix applies to every lesson at once without re-rendering anything. A
lesson file moved out of the repo renders unstyled — accepted.

## Scope and migration

- **Applies to** lessons and reviews.
- **Does not apply to** the dashboard — it is data-driven rather than authored,
  and would need components existing purely for one page.
- **The 10 existing lessons stay as hand-written HTML.** The server keeps serving
  any `.html` in `lessons/`, so both coexist with no converter and no risk to
  content already studied. They will not get the new design system.
- **`system-design`** is on the old `skill/` layout and gets updated manually.

## What this does not solve

- **Diagrams stay ~6.6K per lesson.** Raw SVG in the YAML is compact in tokens
  but verbose in bytes, so they remain the largest thing the AI authors. What
  they no longer do is drift: colours come from the design system and the build
  rejects any that don't. Revisitable later behind a structured `diagram`
  component if the size becomes the binding constraint.
- **Prose is irreducible** — 6.2K per lesson is the floor, whatever the format.

Expected authored size per lesson: **~8.2K, down from 38.2K.**
Expected built lesson: **~5K**, with the shared assets linked once.

## Locked sections are blurred, not hidden — DONE (#13)

A locked `phase` currently hides its body and prints *"Responda a seção anterior
para abrir esta."* That is the wrong shape. A hidden section is indistinguishable
from a section that does not exist, so the reader loses the sense of how much
lesson is left and what it is building towards.

The content should stay **visible but blurred**, with a lock icon over it:

```
┌───────────────────────────────────────┐
│  ②  Submit, job id, status            │
│  ░░░░░░░░░░░░  🔒  ░░░░░░░░░░░░░░░░░  │
│  ░░░░░░░  responda a seção 1  ░░░░░░  │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
└───────────────────────────────────────┘
```

The reader sees that there is a diagram and two paragraphs waiting, and that the
way in is answering the section above. The gate stays exactly as strict; what
changes is that it now reads as a door rather than as an absence.

Implementation notes: `filter: blur()` plus `user-select: none` and
`pointer-events: none` on the body, with the lock centred over it. The blur must
be heavy enough that the text cannot be read — a light blur is a puzzle, not a
gate — and `aria-hidden` on the blurred content so a screen reader is not read
the answer.

---

## Next: the dashboard is a report, not a starting point

Shipped, and wrong in a way styling did not fix. It answers *"how am I doing?"*
and never answers *"what do I do now?"* — which is the question someone actually
has when they open it. There is no primary action anywhere on the page.

What is wrong, concretely:

- **It optimises for the wrong metric.** "Dominados: 5" is a trophy count. What
  predicts learning is the opposite: what is decaying, what you keep getting
  wrong, what you have not touched in weeks. The page shows achievement, not risk.
- **The largest section is the least useful.** "Conceitos dominados" takes the
  most vertical space, and a mastered concept needs nothing from you.
- **It exposes `ease factor 2.60` with a progress bar.** That is SM-2 internal
  state. Nobody can act on it — it shows the algorithm rather than the learner.
- **Misconceptions are collected and never shown.** The server records, per
  section, *what the reader got wrong*. That is the most valuable data in the
  system, `learno-analyst` reads it, and the dashboard ignores it.
- **Nothing connects to `MISSION.md`.** The learner wrote down why they are
  studying. The page never mentions it, and has no notion of progress toward it.
- **The catalogue is a file browser.** It lists filenames, not a path.
- **The empty state is the most common state** — every fork starts there — and is
  the least designed.

The shape it should have instead:

```
Objetivo: entrevista de system design    ███████░░░  13 de 17

HOJE
  Revisar "Dedup vs Idempotência"   ⚠ vence hoje
  [ Começar revisão → ]
  depois: Lição 14 — Real-time updates

PRECISA DE ATENÇÃO
  • Idempotência — confundida com retry em 2 respostas
  • Backoff — 62, abaixo do corte de domínio
  • CAP — sem revisão há 23 dias

Estudou 4 dos últimos 7 dias   ▪▪·▪▪·▪

▸ 5 conceitos dominados                        (recolhido)
```

One decision at the top, problems in the middle, trophies collapsed at the
bottom. The "precisa de atenção" block is the centrepiece: it says *why*
something needs you — a recurring misconception, a score below the cut, time
since last touched — rather than printing a date.

**Two things are not styling and need building first:**

1. `/api/progress` does not aggregate misconceptions. They exist in
   `section_results` but nothing groups them per concept.
2. "Next lesson" is not derivable. Only the model knows, reading `MISSION.md`
   and the current state. The dashboard would have to read something the model
   writes — a `NEXT.md`, or the last recommendation — rather than compute it.

---

## Projects

Lessons test whether the learner can **explain** something. Nothing tests whether
they can **do** it under a constraint they have not seen before. That gap has a
name — transfer — and it is where the current model is blind: a concept can be
mastered in SM-2 and still fail the first time it has to be used, because the
exam does not ask for the definition, it asks for the decision.

### The model's Claude designs the project, not the engine

learno teaches any subject, so there is no fixed project format. Philosophy is an
argument to defend; mathematics a proof or a counterexample; programming a
working thing; design a critique. **The engine does not model any of that.** The
learner's Claude decides what a project is for the subject in front of it, the
same way it decides what a lesson is.

That is the whole reason projects can exist here at all. A generic "deliverable"
shell would have forced every subject into the shape of whichever one was
designed against first.

### Evaluation happens in the conversation

Not through `/api/validate`. A project deliverable is long, multi-part and
iterative, and the interesting output is feedback rather than a number — none of
which a single scoring call does well.

So the loop is: read the brief → do the work → bring it to Claude → get feedback
→ revise. **The revision is the point**, not the score.

The result reaches the schedule through the path that already exists: `SKILL.md`
already records mastery demonstrated in conversation via `POST /api/progress`.
A project is that, with stronger evidence behind it.

### The rubric is written before the attempt, and shown

The open question was who writes the rubric, given that a model scoring against
a rubric it invented after seeing the answer is grading itself.

The rule that fixes it is not about authorship but about order: **the rubric goes
into the brief, before the learner starts, and they can read it.** That stops the
goalposts moving after the fact, and it tells the learner what good looks like
while they can still act on it — which is worth more than the score.

Where a Tier 1 source exists in `RESOURCES.md`, the criteria come from it rather
than from the model's taste.

### When

On **pattern completion**, not on a lesson count. When the concepts that make up
one coherent chunk of the mission are mastered, a project applies them together.
"Every four lessons" is arbitrary; "when the pattern closes" means something.

### Effect on SM-2, deliberately asymmetric

A project is stronger evidence than a teach-back — it demonstrates transfer, not
recall — so success should push intervals further than a lesson does.

Failure must **not** be symmetric. A project touches many concepts at once, and
one bad afternoon should not collapse a month of scheduling across all of them.
A weak project is a signal to revisit, not a reason to reset.

### Projects and the interviewer agent are both kept

They cover the same gap from different sides and neither replaces the other: a
project is asynchronous, written, and revisable; a mock interview is live,
verbal, and unforgiving about hesitation. The learner should be able to reach for
either.

### Try the existing vocabulary first

A project page is plausibly: `prose` for the brief, `callout` for the
constraints, `table` for the rubric, `source` for the grounding. If that holds,
projects need **no new components at all** — only a `projects/` directory and a
line in `SKILL.md`. New components should be added only where that genuinely
fails, not on the assumption that a new artifact needs new parts.

---

## The skill is an operating procedure, not a reference

`SKILL.md` today is organised as a reference document: sections on philosophy,
analogies, diagrams, SM-2, glossary. Everything needed is in there, but it
describes the system rather than telling the model what to do next.

It has to be the other way round. **The skill gives the instructions for how
Claude acts**, in order, at each point in the cycle. Reference material stays,
below the procedure.

The cycle has four moments, and each needs to be written as steps rather than
as background.

### 1. First run — a fresh fork

Detected by: a scaffold `MISSION.md`, no lessons, an empty database.

In order, and **no lesson is generated before all four exist**:

1. **Interview for the mission.** Not "what do you want to learn" but why, what
   changes when they have it, what the deadline is. Vague answers get pushed back
   on — a vague mission produces lessons about trivia.
2. **Build the profile** into `NOTES.md`: how they learn, time per week, the
   language lessons should be written in, their stack, and what has failed for
   them before.
3. **Source discovery** into `RESOURCES.md`. The learner rarely knows the canon
   of a field; finding it is the model's job, and lessons are grounded in Tier 1
   or they are grounded in nothing.
4. **Sketch the curriculum as patterns** — the coherent chunks that lead to the
   mission, not a flat list of lessons. This is what later makes "the pattern
   closed" a detectable event, which is what triggers a project.

### 2. Opening a session

Read the workspace, query MongoDB, then **open by saying where the learner
stands** — what is due, what is shaky, what comes next — in a few lines, from the
data. Never a generic greeting. The session starts from the gaps, not from a
blank page.

### 3. Closing a lesson — the part that is missing today

When a lesson is finished, the model currently does nothing. It should:

1. **Read the per-section results** from `section_results`, not just the final
   score. Which sections were weak, and which misconceptions were recorded.
2. **Ask the learner for their own feedback** — what was confusing, what was too
   easy, where they felt lost.
3. **Compare the two.** The interesting signal is where self-report and data
   disagree: a section they found easy and scored 55 on is worth more attention
   than either fact alone.
4. **Write the learning record**, including what was *not* demonstrated.
5. **Update `NOTES.md`** if the feedback revealed something durable about how
   they learn.
6. **Say what the next session starts with**, so the thread is already picked up.

### 4. Closing a pattern

When every concept in a pattern is mastered, propose the project for that
pattern. This is the only trigger — see the Projects section for the rest.

### Why this shape

The learner should never have to know how the system works to use it. They say
what they want to learn and the model runs the loop: interview, teach, measure,
close out, adjust, apply. Anything the learner has to remember to ask for is a
step that will not happen.

---

## Bug: the background ends and turns black on a phone

Reported from a real device: scrolling down a long page, the gradient stops and
everything below it is black.

Two causes, compounding:

1. **The gradient is on `<body>` and `<html>` has no background at all.** Normally
   the body's background propagates to the canvas and covers everything, but that
   propagation is exactly what `background-attachment: fixed` disturbs. When it
   fails, what shows through is the canvas default — and under
   `color-scheme: light dark` in dark mode, that default is **black**.
2. **`background-attachment: fixed` is unreliable on iOS Safari.** It has been
   effectively broken there for years, and the URL bar growing and shrinking
   changes the viewport underneath a background that is pinned to it.

`min-height: 100vh` makes it worse: on iOS `100vh` is the *large* viewport, so the
painted box can be shorter than what is actually scrollable.

The fix:

- Put the gradient on `html`, not only on `body`, so there is no uncovered canvas
  to fall through to.
- Set a solid `background-color` alongside it, matching a gradient stop, so any
  area the image does not cover is still the right colour rather than black.
- Drop `background-attachment: fixed`. If the parallax effect is wanted, use a
  `position: fixed` pseudo-element instead — that behaves on iOS, the property
  does not.
- Use `min-height: 100dvh` with a `100vh` fallback.

This is small, and it is the kind of bug that only ever shows up on a device —
which is why it survived every check run from a terminal.

---

## Next: blue, and a lighter light mode

The palette came from orbita and is purple. It should be **blue**, and the light
mode background should change.

Neither is a decision to make in a commit message. The deliverable is **a gallery
that shows the alternatives side by side**, on real components rather than on
swatches — a palette looks entirely different on a score bar, a locked gate and a
diagram than it does on a rectangle.

What the gallery must show:

- **Three proposals for the primary colour**, purple → blue. They should differ in
  more than hue: a deep indigo, a mid cobalt and a brighter azure behave very
  differently against the glass and against `--lx-good` / `--lx-warn` / `--lx-bad`,
  which do not move.
- **Three proposals for the light-mode background.** The current one is a
  purple-to-indigo wash. The alternatives should span the range from near-white to
  clearly tinted, because that choice decides how much the glass cards read as
  cards at all — on a white background, `rgb(255 255 255 / .6)` is nearly invisible.

Each proposal rendered with the same set of components: a card, a callout of each
variant, a diagram, a code block, a score bar and a locked gate. The point is to
judge them where they will actually be seen.

Two things to check while choosing, since they are what usually breaks a
recolour:

- **Contrast on the accent-on-glass combination.** `--lx-accent` is used for text
  on `--lx-accent-soft`; a lighter blue can fail there while looking fine as a
  button.
- **The diagram classes.** `.lx-node--accent` fills with the accent at 12%; if the
  new blue sits close to `--lx-good`, an accented node and a success state stop
  being distinguishable at a glance.

---

## Sequence — done

1. ~~Design system ported to CSS~~ — #2
2. ~~Renderer with three components~~ — #3
3. ~~The remaining ten components and the runtime~~ — #4, #5
4. ~~Registry and gallery generated from the components~~ — #6
5. ~~Flatten the repo to root layout~~ — #7
6. ~~A real lesson through the pipeline, measured~~ — #8
7. ~~SKILL.md authors JSON+YAML~~ — #9

Plus the dashboard on the design system — #10.

## Open

- **The dashboard as a starting point** (above) — needs misconception
  aggregation and a way for the model to publish "what's next".
- **Reviews through the pipeline.** The declared scope was lessons *and*
  reviews. `SKILL.md` still describes `lessons/review-CONCEPT.html` written by
  hand, and `review/` is empty. Roughly a third of what the model authors is
  still in the old format and will drift visually from the lessons.
- **First run without MongoDB.** A fresh fork serves lessons fine but the
  dashboard needs a database before it shows anything. Provisioning Atlas before
  you can study one page is a heavy first step for something you are trying out.
- **Diagram geometry is unchecked.** The build refuses a diagram that carries its
  own colour, but accepts one whose boxes overlap or whose text runs outside the
  `viewBox`. A lesson can ship visually broken with a green build.
- **Background ends and turns black on a phone** (above). Small, and only visible
  on a device.
- **Blue palette and a lighter light mode** (above). Needs a comparison gallery
  before anything is changed.
- **SKILL.md as an operating procedure** (above). Designed, not written.
- **Projects.** Designed above; not built. Needs a `projects/` directory, a
  `SKILL.md` section, and confirmation that the existing components cover a
  project page.

## Original sequence, for the record

1. Port the design system to CSS; verify both themes and the reduced-transparency
   fallback in the sandbox.
2. Build the renderer with three components (`prose`, `diagram`, `analogy`) and
   render one throwaway lesson end to end.
3. Fill in the remaining ten components.
4. Generate the registry and the kitchen-sink fixture from the component files.
5. Flatten the repo to root layout; delete `LEARNO_WORKSPACE` and the vendoring
   machinery.
6. Author one real lesson (0011) through the pipeline and compare it side by side
   with a hand-written one.
7. Update `SKILL.md` so the AI authors JSON+YAML instead of HTML.

Steps 1–2 are the point of no return worth pausing at: if the glass look or the
renderer's output is wrong, everything after compounds it.
