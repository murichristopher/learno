// A block of code.
//
// No syntax highlighting on purpose: every highlighter is either a runtime
// dependency or a build-time one, and a lesson's code samples are short enough
// that colour buys less than the weight costs. The language label is there so
// the reader knows what they are looking at.

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = {
  meta: {
    name: 'code',
    purpose: 'bloco de código, com rótulo de linguagem',
    props: { source: 'string', lang: 'string?', caption: 'string?' },
    demo: {
      lang: 'sql',
      caption: 'A consulta que o índice torna barata',
      source: 'SELECT id, email\n  FROM users\n WHERE tenant_id = $1\n   AND created_at > now() - interval \'7 days\';'
    }
  },

  css: `
.lx-codeblock { position: relative; padding: 0; overflow: hidden; }
.lx-codeblock-lang {
  position: absolute; top: .5rem; right: .75rem;
  font-size: .65rem; text-transform: uppercase; letter-spacing: .08em;
  color: var(--lx-text-subtle);
}
.lx-codeblock pre {
  margin: 0;
  padding: 1.1rem 1.25rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.lx-codeblock code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .82rem;
  line-height: 1.65;
  color: var(--lx-text);
  white-space: pre;
}
`,

  render({ source, lang, caption }) {
    return `  <figure class="lx-figure">
    <div class="lx-card lx-codeblock">
      ${lang ? `<span class="lx-codeblock-lang">${esc(lang)}</span>` : ''}
      <pre><code>${esc(source)}</code></pre>
    </div>
    ${caption ? `<figcaption class="lx-caption">${esc(caption)}</figcaption>` : ''}
  </figure>`;
  }
};
