# Lesson pipeline — spec for review

> **Status: proposal.** Nothing here is built. This document exists to be
> rejected or corrected before code is written.

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

## Sequence, if approved

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
