// A data table.
//
// Wide tables scroll inside their own card rather than pushing the page sideways
// — horizontal scroll on the body is the most common way a lesson breaks on a
// phone. Below the phone breakpoint the header row is repeated as a label on
// each cell, because a four-column table at 375px is unreadable otherwise.

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = {
  meta: {
    name: 'table',
    purpose: 'tabela de dados, com cabeçalho e legenda',
    props: {
      headers: 'array<string>',
      rows:    'array<array<string>>',
      caption: 'string?'
    },
    demo: {
      caption: 'Custo de cada estratégia',
      headers: ['Estratégia', 'Leitura', 'Escrita'],
      rows: [
        ['Cache-aside', 'rápida', 'sem custo'],
        ['Write-through', 'rápida', 'mais lenta']
      ]
    }
  },

  css: `
.lx-table-wrap { padding: 0; overflow: hidden; }
.lx-table { width: 100%; border-collapse: collapse; font-size: .875rem; }
.lx-table th, .lx-table td { padding: .7rem .9rem; text-align: left; }
.lx-table thead th {
  color: var(--lx-text-subtle);
  font-size: .68rem; text-transform: uppercase; letter-spacing: .07em;
  font-weight: 700;
  border-bottom: 1px solid var(--lx-border);
}
.lx-table tbody tr + tr td { border-top: 1px solid var(--lx-border); }
.lx-table td { color: var(--lx-text-2); }
.lx-table td:first-child { color: var(--lx-text); font-weight: 500; }

@media (max-width: 560px) {
  .lx-table, .lx-table tbody, .lx-table tr, .lx-table td { display: block; width: 100%; }
  .lx-table thead { display: none; }
  .lx-table tbody tr { padding: .35rem 0; }
  .lx-table tbody tr + tr { border-top: 1px solid var(--lx-border); }
  .lx-table tbody tr + tr td { border-top: 0; }
  .lx-table td { display: flex; justify-content: space-between; gap: 1rem; padding: .35rem .95rem; }
  .lx-table td::before {
    content: attr(data-label);
    color: var(--lx-text-subtle);
    font-size: .68rem; text-transform: uppercase; letter-spacing: .07em;
    font-weight: 700; flex-shrink: 0;
  }
  .lx-table td:first-child { padding-top: .6rem; }
  .lx-table td:last-child  { padding-bottom: .6rem; }
}
`,

  render({ headers, rows, caption }) {
    const head = headers.map(h => `<th scope="col">${esc(h)}</th>`).join('');
    const body = rows.map(row =>
      `<tr>${row.map((cell, i) =>
        `<td data-label="${esc(headers[i] ?? '')}">${esc(cell)}</td>`).join('')}</tr>`
    ).join('\n          ');

    return `  <figure class="lx-figure">
    <div class="lx-card lx-table-wrap lx-scroll">
      <table class="lx-table">
        <thead><tr>${head}</tr></thead>
        <tbody>
          ${body}
        </tbody>
      </table>
    </div>
    ${caption ? `<figcaption class="lx-caption">${esc(caption)}</figcaption>` : ''}
  </figure>`;
  }
};
