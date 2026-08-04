// Rendered locked and opened by the runtime, so a script that never runs leaves
// the reader stuck rather than silently dropping every gate in the lesson.

const { gate } = require('../../build/gate');
const { t } = require('../../build/strings');

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

.lx-gate-body > * + * { margin-top: 1.25rem; }

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
    ${gate(ctx.children || '', {
      name: `phase-${id}`,
      reason: t('gate.phase'),
      open: unlocked
    })}
  </section>`;
  }
};
