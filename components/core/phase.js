// A content section, locked until the previous one is answered.
//
// The lock is the pedagogy, not decoration: a lesson that can be scrolled to the
// end teaches recognition, and recognition is what feels like learning without
// being it. The runtime unlocks a phase only when the section before it has been
// answered well enough.
//
// Rendered locked by default and opened by the runtime, so the wrong failure is
// impossible: if the script never runs, the reader gets the first section and a
// clear reason rather than a lesson silently missing its gates.
//
// A locked section is blurred, not hidden. Hidden content is indistinguishable
// from content that does not exist, so the reader loses any sense of how much
// lesson is left and what it is building towards. Blurred behind a lock, the
// gate is exactly as strict and reads as a door instead of an absence.

const { icon } = require('../../build/icons');

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = {
  meta: {
    name: 'phase',
    purpose: 'seção de conteúdo, destravada pela resposta da anterior',
    props: { id: 'string', title: 'string', open: 'bool?' },
    demo: {
      id: '1',
      title: 'Por que o módulo quebra',
      open: true
    }
  },

  css: `
.lx-phase { scroll-margin-top: 1rem; }
.lx-phase-head { display: flex; align-items: center; gap: .7rem; margin-bottom: .85rem; }
.lx-phase-badge {
  flex-shrink: 0;
  width: 1.9rem; height: 1.9rem;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: var(--lx-accent); color: #fff;
  font-size: .8rem; font-weight: 700;
}
.lx-phase--locked .lx-phase-badge { background: var(--lx-text-subtle); }
.lx-phase--done  .lx-phase-badge::after { content: "✓"; }
.lx-phase--done  .lx-phase-badge  { font-size: .9rem; }
.lx-phase--done  .lx-phase-badge span { display: none; }
.lx-phase-title { color: var(--lx-text); font-size: 1.05rem; font-weight: 650; letter-spacing: -.01em; }

.lx-phase-body > * + * { margin-top: 1.25rem; }

/* The lock lives OUTSIDE the blurred element — a child of a blurred parent is
   blurred too, and an unreadable lock defeats the point. */
.lx-phase-locked-wrap { position: relative; }

.lx-phase--locked .lx-phase-body {
  /* Heavy on purpose. A light blur is a puzzle, not a gate: legible-if-you-squint
     text invites squinting, and the section stops being practice. */
  filter: blur(9px);
  user-select: none;
  pointer-events: none;
}
/* Capped so a long section does not become a wall of blur. Enough shows that the
   reader can see there is a diagram and a couple of paragraphs waiting. */
.lx-phase--locked .lx-phase-locked-wrap {
  max-height: 20rem;
  overflow: hidden;
  border-radius: var(--lx-radius);
}
/* Fades into the page rather than being sliced off at the cap. */
.lx-phase--locked .lx-phase-locked-wrap::after {
  content: "";
  position: absolute; inset: auto 0 0 0; height: 6rem;
  pointer-events: none;
  background: linear-gradient(to bottom, transparent, var(--lx-shell-via));
}

.lx-phase-lock { display: none; }
.lx-phase--locked .lx-phase-lock {
  display: flex;
  position: absolute;
  inset: 0;
  z-index: 2;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  text-align: center;
  padding: 1rem;
}
.lx-phase-lock-badge {
  display: flex; align-items: center; justify-content: center;
  width: 2.75rem; height: 2.75rem;
  border-radius: 50%;
  background: var(--lx-card);
  border: 1px solid var(--lx-card-border);
  box-shadow: var(--lx-card-shadow);
  color: var(--lx-accent);
  backdrop-filter: blur(var(--lx-blur));
  -webkit-backdrop-filter: blur(var(--lx-blur));
}
.lx-phase-lock-badge .lx-icon-svg { width: 1.2rem; height: 1.2rem; }
.lx-phase-lock-text {
  color: var(--lx-text);
  font-size: .85rem;
  font-weight: 550;
  background: var(--lx-card);
  border: 1px solid var(--lx-card-border);
  border-radius: 99px;
  padding: .3rem .8rem;
  backdrop-filter: blur(var(--lx-blur));
  -webkit-backdrop-filter: blur(var(--lx-blur));
}

@media (prefers-reduced-transparency: reduce) {
  .lx-phase-lock-badge, .lx-phase-lock-text { backdrop-filter: none; background: Canvas; }
}

/* Progress bar — one segment per phase, emitted by the template. */
.lx-progress { display: flex; gap: .35rem; margin-bottom: 2rem; }
.lx-progress-seg {
  flex: 1; height: .3rem; border-radius: 99px;
  background: var(--lx-border);
  transition: background-color .25s;
}
.lx-progress-seg.is-done { background: var(--lx-accent); }
`,

  render({ id, title, open }, ctx) {
    // Phase 1 is open from the start; there is nothing before it to answer.
    const unlocked = open === true || String(id) === '1';
    return `  <section class="lx-phase${unlocked ? '' : ' lx-phase--locked'}" data-phase="${esc(id)}" id="phase-${esc(id)}">
    <div class="lx-phase-head">
      <span class="lx-phase-badge"><span>${esc(id)}</span></span>
      <h2 class="lx-phase-title">${esc(title)}</h2>
    </div>
    <div class="lx-phase-locked-wrap">
      <div class="lx-phase-body"${unlocked ? '' : ' aria-hidden="true"'}>
${ctx.children || ''}
      </div>
      <div class="lx-phase-lock">
        <span class="lx-phase-lock-badge">${icon('lock')}</span>
        <span class="lx-phase-lock-text">Responda a seção anterior para abrir</span>
      </div>
    </div>
  </section>`;
  }
};
