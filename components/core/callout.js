// Three variants and no more: a callout that can be any colour stops meaning
// anything. An unknown variant degrades to note rather than rendering unstyled.

const { icon } = require('../../build/icons');
const { t } = require('../../build/strings');

const { esc, inline, rich } = require('../../build/text');

const VARIANTS = {
  note:   { icon: 'info',           label: 'callout.note' },
  warn:   { icon: 'triangle-alert', label: 'callout.warn' },
  danger: { icon: 'octagon-alert',  label: 'callout.danger' }
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
.lx-callout--warn   { --lx-callout-accent: var(--lx-warn); --lx-callout-bg: color-mix(in srgb, var(--lx-warn) 10%, transparent); }
.lx-callout--danger { --lx-callout-accent: var(--lx-bad);  --lx-callout-bg: color-mix(in srgb, var(--lx-bad) 10%, transparent); }
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
.lx-callout-text > p + p { margin-top: .5rem; }
`,

  render({ variant, text, title }) {
    const v = VARIANTS[variant] || VARIANTS.note;
    return `  <div class="lx-card lx-callout lx-callout--${esc(VARIANTS[variant] ? variant : 'note')}">
    <span class="lx-callout-mark">${icon(v.icon)}</span>
    <div>
      <p class="lx-callout-title">${esc(title || t(v.label))}</p>
      <div class="lx-callout-text">${rich(text)}</div>
    </div>
  </div>`;
  }
};
