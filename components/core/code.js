// highlight.js runs here, never in the browser — the page gets plain spans and no
// script. Colours come from the design system rather than an hljs theme, so code
// follows the page theme instead of carrying a second palette.

const hljs = require('highlight.js');

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Plain text is a legitimate choice — a shell transcript or a log excerpt has
// nothing to highlight — so it is spelled explicitly rather than left implicit.
const PLAIN = new Set(['text', 'txt', 'plain', 'none', 'output', 'log']);

module.exports = {
  meta: {
    name: 'code',
    purpose: 'bloco de código, com destaque de sintaxe feito no build',
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
  position: absolute; top: .55rem; right: .8rem;
  font-size: .65rem; text-transform: uppercase; letter-spacing: .08em;
  color: var(--lx-text-subtle);
  pointer-events: none;
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

/* Syntax palette — one entry per role, mapped onto highlight.js's classes.
   Defined here rather than in learno.css so the component stays self-contained,
   and themed with the same light/dark mechanism as everything else. */
:root {
  --lx-syn-keyword: #7c3aed;
  --lx-syn-string:  #047857;
  --lx-syn-number:  #b45309;
  --lx-syn-comment: #6b7280;
  --lx-syn-func:    #1d4ed8;
  --lx-syn-type:    #0e7490;
  --lx-syn-literal: #be185d;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --lx-syn-keyword: #c084fc;
    --lx-syn-string:  #6ee7b7;
    --lx-syn-number:  #fcd34d;
    --lx-syn-comment: rgb(255 255 255 / .45);
    --lx-syn-func:    #93c5fd;
    --lx-syn-type:    #67e8f9;
    --lx-syn-literal: #f9a8d4;
  }
}
:root[data-theme="dark"] {
  --lx-syn-keyword: #c084fc;
  --lx-syn-string:  #6ee7b7;
  --lx-syn-number:  #fcd34d;
  --lx-syn-comment: rgb(255 255 255 / .45);
  --lx-syn-func:    #93c5fd;
  --lx-syn-type:    #67e8f9;
  --lx-syn-literal: #f9a8d4;
}

.hljs-keyword, .hljs-selector-tag, .hljs-built_in, .hljs-name,
.hljs-doctag, .hljs-operator        { color: var(--lx-syn-keyword); }
.hljs-string, .hljs-regexp, .hljs-addition,
.hljs-attribute, .hljs-meta .hljs-string { color: var(--lx-syn-string); }
.hljs-number, .hljs-literal, .hljs-variable,
.hljs-template-variable             { color: var(--lx-syn-number); }
/* Object keys and attributes — the most visible tokens in JSON and YAML, and
   the ones a lesson's config samples are mostly made of. */
.hljs-attr, .hljs-property          { color: var(--lx-syn-type); }
.hljs-punctuation                   { color: var(--lx-text-muted); }
.hljs-comment, .hljs-quote, .hljs-deletion   { color: var(--lx-syn-comment); font-style: italic; }
.hljs-title, .hljs-title.function_, .hljs-section,
.hljs-selector-id                   { color: var(--lx-syn-func); }
.hljs-type, .hljs-class, .hljs-title.class_,
.hljs-selector-class, .hljs-params  { color: var(--lx-syn-type); }
.hljs-symbol, .hljs-bullet, .hljs-link,
.hljs-meta, .hljs-subst             { color: var(--lx-syn-literal); }
.hljs-emphasis { font-style: italic; }
.hljs-strong   { font-weight: 700; }
`,

  render({ source, lang, caption }) {
    let body;
    let label = lang;

    if (!lang || PLAIN.has(String(lang).toLowerCase())) {
      body = esc(source);
    } else if (hljs.getLanguage(lang)) {
      // highlight.js escapes its own output, so no second pass here.
      body = hljs.highlight(String(source), { language: lang, ignoreIllegals: true }).value;
    } else {
      // Loud rather than silently unhighlighted: a typo'd language would
      // otherwise render as plain text that looks deliberate.
      throw new Error(
        `unknown language "${lang}". Use one highlight.js knows ` +
        `(js, ts, python, sql, bash, json, yaml, go, rust, java, html, css…), ` +
        `or "text" for no highlighting.`
      );
    }

    return `  <figure class="lx-figure">
    <div class="lx-card lx-codeblock">
      ${label ? `<span class="lx-codeblock-lang">${esc(label)}</span>` : ''}
      <pre><code class="hljs">${body}</code></pre>
    </div>
    ${caption ? `<figcaption class="lx-caption">${esc(caption)}</figcaption>` : ''}
  </figure>`;
  }
};
