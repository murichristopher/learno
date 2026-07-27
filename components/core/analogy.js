const { icon } = require('../../build/icons');

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = {
  meta: {
    name: 'analogy',
    purpose: 'analogia da vida real, antes de qualquer termo técnico',
    props: { label: 'string', text: 'string', bridge: 'string' },
    demo: {
      label: 'Pense numa fila de banco',
      text: 'Uma fila só, vários caixas. Quem chega entra no fim e o próximo caixa livre chama.',
      bridge: 'Essa fila é exatamente o que uma work queue faz com as mensagens.'
    }
  },

  css: `
.lx-analogy { border-left: 3px solid var(--lx-accent); }
.lx-analogy-label {
  display: flex; align-items: center; gap: .35rem;
  font-size: .7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--lx-accent);
  margin-bottom: .4rem;
}
.lx-analogy-text   { color: var(--lx-text-2); }
.lx-analogy-bridge {
  margin-top: .6rem;
  padding-top: .6rem;
  border-top: 1px solid var(--lx-border);
  color: var(--lx-text);
  font-weight: 500;
}
`,

  render({ label, text, bridge }) {
    return `  <div class="lx-card lx-analogy">
    <span class="lx-analogy-label">${icon('lightbulb')} ${esc(label)}</span>
    <p class="lx-analogy-text">${esc(text)}</p>
    <p class="lx-analogy-bridge">${esc(bridge)}</p>
  </div>`;
  }
};
