// An aside: a note, a warning, or a trap worth stopping at.
//
// Three variants and no more. A callout that can be any colour stops meaning
// anything — the reader learns "purple means note, amber means careful" only if
// the mapping never moves.

const { icon } = require('../../build/icons');

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const VARIANTS = {
  note:   { icon: 'info',           label: 'Nota' },
  warn:   { icon: 'triangle-alert', label: 'Atenção' },
  danger: { icon: 'octagon-alert',  label: 'Cuidado' }
};

module.exports = {
  meta: {
    name: 'callout',
    purpose: 'aparte — nota, atenção ou armadilha (variant: note | warn | danger)',
    props: { variant: 'string', text: 'string', title: 'string?' },
    demo: {
      variant: 'warn',
      title: 'O cache não é a fonte da verdade',
      text: 'Se o banco cair e o cache continuar respondendo, você está servindo dado que talvez já não exista.'
    }
  },

  css: `
.lx-callout {
  display: flex;
  gap: .75rem;
  border-left: 3px solid var(--lx-callout-accent);
  background: var(--lx-callout-bg);
}
.lx-callout--note   { --lx-callout-accent: var(--lx-accent);  --lx-callout-bg: var(--lx-accent-soft); }
.lx-callout--warn   { --lx-callout-accent: #d97706;           --lx-callout-bg: rgb(217 119 6 / .08); }
.lx-callout--danger { --lx-callout-accent: #dc2626;           --lx-callout-bg: rgb(220 38 38 / .08); }
.lx-callout-mark {
  flex-shrink: 0;
  width: 1.6rem; height: 1.6rem;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: var(--lx-callout-accent);
  color: #fff;
}
.lx-callout-mark .lx-icon-svg { width: .95rem; height: .95rem; stroke-width: 2.5;
}
.lx-callout-title { color: var(--lx-text); font-weight: 600; margin-bottom: .25rem; }
.lx-callout-text  { color: var(--lx-text-2); }
`,

  render({ variant, text, title }) {
    const v = VARIANTS[variant] || VARIANTS.note;
    return `  <div class="lx-card lx-callout lx-callout--${esc(VARIANTS[variant] ? variant : 'note')}">
    <span class="lx-callout-mark">${icon(v.icon)}</span>
    <div>
      <p class="lx-callout-title">${esc(title || v.label)}</p>
      <p class="lx-callout-text">${esc(text)}</p>
    </div>
  </div>`;
  }
};
