# Lesson format

A lesson is **two files you write** and one the engine renders:

```
lessons/0011-async-jobs.json    structure — which components, in what order
lessons/0011-async-jobs.yml     content   — prose and diagrams
lessons/0011-async-jobs.html    rendered  — never edited by hand
```

You do not write HTML, CSS or JavaScript. The markup, the design system, the
progress bar, the offline banner, the unlock logic and the dictation button all
come from the engine. Everything you write is either a decision about structure
or something a human will read.

Build with `make lesson SRC=lessons/0011-async-jobs`. It refuses to write a page
that has any error, because a lesson missing a block still looks finished.

---

## The split

**`.json` — structure.** Which components, in what order, with which ids. No
sentences live here. Any string starting with `@` is a path into the `.yml`.

**`.yml` — content.** Prose and hand-drawn SVG, addressed by key. This is the
only file that changes when the wording changes.

An `@` reference may resolve to **any YAML value** — a string, a list, a nested
object — not only a string. `"options": "@p2.options"` pulling a whole list out
of the `.yml` is normal and expected. Accented characters and markup inside a
value survive untouched; nothing is re-escaped on the way in.

```json
{
  "id": "0011-async-jobs",
  "tag": "Lição 11 · System Design",
  "icon": "hourglass",
  "title": "@meta.title",
  "subtitle": "@meta.subtitle",
  "concepts": ["request_cycle_limit", "job_idempotency"],
  "blocks": [
    { "component": "analogy",
      "props": { "label": "@analogy.label", "text": "@analogy.text", "bridge": "@analogy.bridge" } },

    { "component": "phase", "props": { "id": "1", "title": "@p1.title" },
      "children": [
        { "component": "prose",   "props": { "text": "@p1.body" } },
        { "component": "diagram", "props": { "svg": "@diagrams.blocked", "caption": "@p1.caption" } },
        { "component": "recall",
          "props": { "conceptId": "request_cycle_limit", "phase": "1",
                     "question": "@p1.question", "summary": "@p1.summary",
                     "fallback": "@p1.fallback" } }
      ] }
  ]
}
```

```yaml
meta:
  title: "Tarefas longas e jobs assíncronos"
  subtitle: "Como tirar o trabalho de 90 segundos da requisição."

analogy:
  label: "Pense na lavanderia da esquina"
  text: "Você entrega o terno e recebe uma ficha numerada…"
  bridge: "Essa ficha é o job id."

p1:
  title: "Por que a tarefa longa não cabe na requisição"
  body: |
    Markdown pequeno: **negrito**, *itálico*, `código`, [links](https://…).
    Parágrafos separados por linha em branco.
  caption: "O ciclo de requisição bloqueado"
  question: "Explique, com suas palavras, por que subir o timeout não resolve."
  summary: "Seção sobre timeouts de terceiros e threads presas."
  fallback:
    options:
      - { text: "Porque o servidor fica lento", correct: false }
      - { text: "Porque o gargalo é a thread presa, não o tempo", correct: true }
    ok:  "Isso. O tempo é sintoma; a thread é a causa."
    bad: "Não é lentidão — é uma thread que não volta."

diagrams:
  blocked: |
    <svg class="lx-svg" viewBox="0 0 600 140" role="img" aria-label="…">…</svg>
```

**Envelope fields:** `id` (must equal the filename), `title`, `blocks`. Optional:
`tag`, `icon` (any [lucide](https://lucide.dev/icons) name), `subtitle`,
`concepts`.

**Not authored:** header, progress bar, offline banner, completion box, footer.
The template emits them from the envelope. The progress bar and unlock order are
derived from the `phase` blocks — never restate them.

---

## Components

`COMPONENTS.md` is generated from the components themselves and is the only
authoritative list — of both **names and prop shapes**. Naming a component that
is not in it fails the build, and so does passing a prop the wrong shape. Open
`sandbox/components.html` (`make sandbox`) to see every one rendered.

Read the prop types literally:

| Type | Means |
|---|---|
| `string` · `number` · `bool` | scalars |
| `svg` | a string, additionally checked for hardcoded colour and for geometry |
| `array<{text: string, correct: bool}>` | a list whose every element has exactly those fields |
| `{options: …, ok: string, bad: string}` | an object with exactly those fields |
| `string?` | optional — everything else is required |

A field named wrong is a build error naming the element index, not a lesson that
renders empty. `{label, isCorrect}` where `{text, correct}` was wanted fails
loudly rather than producing a quiz in which nothing is correct.

If a lesson genuinely needs something the vocabulary lacks, write a new
component in `components/local/` — it needs `meta.name`, `meta.purpose`,
`meta.props`, `meta.demo`, a `css` string and a `render(props, ctx)`. It then
appears in the registry and the gallery automatically.

---

## What a lesson must contain

The structure below is pedagogy, not decoration. Each rule exists because the
lesson stops working without it.

1. **`analogy` first, before any technical term.** A definition given before the
   reader has something to hang it on is a definition they will re-read three
   times. The `bridge` prop is where the image is handed over to the vocabulary —
   that hand-off is the whole point of the component.

2. **Two to five `phase` blocks.** One tightly-scoped concept per lesson; if the
   topic needs more, split the lesson. Each phase carries prose, **at least one
   `diagram`**, and one practice block.

3. **Vary the practice, and include at least one `recall`.**
   - `recall` — free text scored by the model. Effortful and expensive, and the
     only kind that makes the reader *produce* the explanation.
   - `quiz` — multiple choice, corrected in the page. Cheaper and offline-proof,
     but recognising the right answer is easier than producing it.

   Quizzes add variety; they never replace recall. `fallback` is **required** on
   every `recall` — it is what the reader gets when the server is unreachable, and
   a recall without one dead-ends the lesson offline.

   `summary` is **not shown to the reader**. It is sent to the model as scoring
   context, so write what a good answer would have to contain — the rubric, not a
   label for the section.

4. **`teachback` at the end.** The reader explains the whole topic back. **This
   score drives the SM-2 schedule**, so it is the one that decides when the
   concept comes back. It has no offline fallback on purpose: a multiple-choice
   stand-in for "explain it back" would record a number that means nothing.

   ```json
   { "component": "teachback",
     "props": { "question": "@teachback.question",
                "conceptIds": ["request_cycle_limit", "job_idempotency"],
                "hint": "@teachback.hint" } }
   ```

   Concept ids are written literally in the `.json`, never through `@` — ids are
   structure, prose is content. Every one must also appear in the envelope's
   `concepts`.

5. **`flashcards`** — three to five, right after the teach-back.

6. **`source`** — the primary source the lesson stands on. A lesson grounded in a
   Tier 1 source is a different object from one assembled out of recollection,
   and the reader is entitled to know which one they just read.

---

## Reviews

A review is the same format in `review/NNNN-concept-rN.json` + `.yml`, built the
same way. It differs only in what it contains: no `analogy` and no `flashcards`,
mostly `recall` and `quiz`, and `prose` only where an answer needs correcting.

Keep the `teachback` — it is what records the result, and a review that records
nothing leaves the concept due on the same date forever.

---

## Projects

A project is the same format in `projects/NNNN-name.json` + `.yml`, built the
same way. It is a brief, not a lesson: briefing in `prose`, constraints in a
`callout`, the criteria in a `rubric`, grounding in `source`.

What it asks for is an artifact in the medium of the subject — code that runs, a
proof, something spoken, a drawing — never a document describing one. It lives
in the user's own environment; there is no upload.

It has no `phase`, no `recall` and no `teachback` — nothing on the page is
scored, so the page carries no progress bar and no JavaScript. The work is
delivered and evaluated in the conversation, and the page should say so.

The rubric belongs in the brief, before the attempt. See **Projects** in
`SKILL.md` for what goes in one and how the result is recorded.

---

## Diagrams

Hand-written inline SVG in the `.yml`, using **only** these classes:

| Class | For |
|---|---|
| `lx-svg` | the root `<svg>` — always |
| `lx-node` · `lx-node--accent` · `lx-node--muted` | boxes |
| `lx-edge` · `lx-edge--accent` · `lx-edge--dashed` · `lx-edge--plain` | arrows |
| `lx-label` · `lx-label--muted` | text |

```yaml
diagrams:
  flow: |
    <svg class="lx-svg" viewBox="0 0 400 90" role="img" aria-label="Cliente para servidor">
      <rect class="lx-node lx-node--accent" x="8" y="20" width="120" height="48"/>
      <text class="lx-label" x="68" y="49" text-anchor="middle">Cliente</text>
      <path class="lx-edge" d="M130 44 H 250"/>
      <rect class="lx-node" x="252" y="20" width="120" height="48"/>
      <text class="lx-label" x="312" y="49" text-anchor="middle">Servidor</text>
    </svg>
```

**No `fill=`, no `stroke=`, no hex, no `rgb()`.** The build rejects the lesson
otherwise. Colour comes from the classes, which is what makes a diagram follow
light and dark mode instead of drifting from the design system.

Always give a `viewBox` and an `aria-label`. Accents and UTF-8 inside `<text>`
pass through untouched — never strip them.

**Arrowheads are applied by the `lx-edge` class**, via `marker-end` in the
stylesheet. Never write `marker-end="url(#lx-arrow)"` yourself. Use
`lx-edge--plain` for a line with no arrowhead.

There is no fixed canvas size. A `viewBox` around 600 wide with nodes of roughly
120×48 reads well at both desktop and phone widths; the SVG scales to its
container either way.

### Geometry

The build bounds-checks the coordinates you wrote against the `viewBox`. A
`<rect>`, `<circle>`, `<text>` or `<path>` reaching outside it is an **error**,
naming the element and the coordinate that overflows:

```
error  blocks[0] (diagram)
       prop "svg": <rect x="398" y="20" width="120" height="48"> falls outside
       the viewBox "0 0 400 90" — x reaches 518, past 400.
       → move the element inside, or widen the viewBox.
```

A missing `viewBox` on the root `<svg>` is also an error — without one nothing
can be checked at all. Two units of tolerance are allowed, because a text
baseline or a stroke legitimately sits a hair past an edge.

Two `<rect>` elements overlapping is a **warning**, not an error: stacking is
occasionally deliberate, but it is almost always a node placed wrong.

**Text width is not checked.** Measuring a rendered label needs a font and a
layout engine, so a label too long for its box passes the build. Sizing the box
to the text is still on you — open the lesson and look.

---

## What the build refuses

Each of these stops the build and names the file and block:

- a component that does not exist, with the vocabulary listed
- an `@` reference that resolves to nothing, with the exact path
- a missing or wrong-typed prop, per the component's `meta.props`
- an SVG carrying its own colour
- an SVG element sitting outside the `viewBox`, or a root `<svg>` without one
- a concept cited by `recall` or `teachback` but absent from `concepts` — the
  server enforces the same vocabulary when scoring, so it would otherwise be
  dropped silently
- an unknown `icon` on the envelope, or an unknown `lang` on a `code` block

Warnings do not stop the build but should be zero: an unreferenced `.yml` key
usually means a typo'd reference that would have rendered an empty block, and
two overlapping `<rect>` elements usually mean a misplaced node.

---

## Workflow

```sh
make lesson SRC=lessons/0011-async-jobs   # until it reports nothing at all
make local                                # then open it
```

Open the lesson **over the server, not `file://`** — the mic needs a secure
context, and over `file://` the permission prompt repeats and never transcribes.

`make compare HAND='…/lessons/*.html' SRC=lessons/0011-name` reports what the
format cost, normalised for lesson length.
