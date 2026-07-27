const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = {
  meta: {
    name: 'compare',
    purpose: 'duas ou três opções lado a lado',
    props: {
      columns: 'array<{label: string, body: string}>',
      caption: 'string?'
    },
    demo: {
      caption: 'Onde cada uma quebra',
      columns: [
        { label: 'Long polling', body: 'Simples de operar. Segura uma conexão por cliente esperando.' },
        { label: 'WebSocket',    body: 'Bidirecional e barato por mensagem. Estado no servidor complica o balanceamento.' }
      ]
    }
  },

  css: `
.lx-compare { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr)); }
.lx-compare-col { display: flex; flex-direction: column; }
.lx-compare-label {
  color: var(--lx-accent);
  font-size: .7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em;
  margin-bottom: .45rem;
}
.lx-compare-body { color: var(--lx-text-2); font-size: .9rem; }

@media (max-width: 560px) {
  .lx-compare { grid-template-columns: 1fr; gap: .85rem; }
}
`,

  render({ columns, caption }) {
    const cols = columns.map(c => `
      <div class="lx-card lx-compare-col">
        <span class="lx-compare-label">${esc(c && c.label)}</span>
        <p class="lx-compare-body">${esc(c && c.body)}</p>
      </div>`).join('');

    return `  <figure class="lx-figure">
    <div class="lx-compare">${cols}
    </div>
    ${caption ? `<figcaption class="lx-caption">${esc(caption)}</figcaption>` : ''}
  </figure>`;
  }
};
