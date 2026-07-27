const { icon } = require('../../build/icons');

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Only http(s). An authored link is content, and content should never be able to
// smuggle javascript: into an href.
const safeHref = url => (/^https?:\/\//i.test(String(url)) ? String(url) : null);

module.exports = {
  meta: {
    name: 'source',
    purpose: 'fonte primária em que a lição se apoia',
    props: { title: 'string', url: 'string?', note: 'string?' },
    demo: {
      title: 'Designing Data-Intensive Applications — cap. 5',
      url: 'https://dataintensive.net/',
      note: 'A discussão de replicação líder-seguidor e os modos de falha de cada uma.'
    }
  },

  css: `
.lx-source-label {
  display: flex; align-items: center; gap: .35rem;
  color: var(--lx-text-subtle);
  font-size: .7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em;
  margin-bottom: .4rem;
}
.lx-source-title { color: var(--lx-text); font-weight: 600; }
.lx-source-note  { color: var(--lx-text-muted); font-size: .85rem; margin-top: .3rem; }
`,

  render({ title, url, note }) {
    const href = url ? safeHref(url) : null;
    const name = esc(title);
    return `  <div class="lx-card lx-source">
    <p class="lx-source-label">${icon('book-open')} Fonte primária</p>
    <p class="lx-source-title">${href ? `<a class="lx-link" href="${esc(href)}" rel="noopener noreferrer" target="_blank">${name}</a>` : name}</p>
    ${note ? `<p class="lx-source-note">${esc(note)}</p>` : ''}
  </div>`;
  }
};
