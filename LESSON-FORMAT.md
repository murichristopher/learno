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
authoritative list. **Naming anything not in it fails the build.** Open
`sandbox/components.html` (`make sandbox`) to see every one rendered.

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

   Quizzes add variety; they never replace recall. Every `recall` needs a
   `fallback` — that is what the reader gets when the server is unreachable.

4. **`teachback` at the end.** The reader explains the whole topic back. **This
   score drives the SM-2 schedule**, so it is the one that decides when the
   concept comes back. It has no offline fallback on purpose: a multiple-choice
   stand-in for "explain it back" would record a number that means nothing.

5. **`flashcards`** — three to five, right after the teach-back.

6. **`source`** — the primary source the lesson stands on. A lesson grounded in a
   Tier 1 source is a different object from one assembled out of recollection,
   and the reader is entitled to know which one they just read.

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

Always give a `viewBox` and an `aria-label`. Arrowheads come free — the shared
`#lx-arrow` marker is in the page template.

---

## What the build refuses

Each of these stops the build and names the file and block:

- a component that does not exist, with the vocabulary listed
- an `@` reference that resolves to nothing, with the exact path
- a missing or wrong-typed prop, per the component's `meta.props`
- an SVG carrying its own colour
- a concept cited by `recall` or `teachback` but absent from `concepts` — the
  server enforces the same vocabulary when scoring, so it would otherwise be
  dropped silently
- an unknown `icon` or `lang`

Warnings do not stop the build but should be zero: an unreferenced `.yml` key
usually means a typo'd reference that would have rendered an empty block.

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
