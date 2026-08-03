// Authored text, turned into markup — in one place.
//
// It used to live inside prose.js, so prose was the only component that
// rendered **bold** and `code`. Every other component escaped and stopped
// there, which shipped literal asterisks and backticks to the reader in any
// callout, table cell or option an author wrote naturally.

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Private-use codepoints, which cannot occur in authored prose. They wrap the
// placeholder index so the restore pass matches a marker rather than any run of
// digits — the version this was lifted from restored on /(\d+)/, so "90
// segundos" in any paragraph would have come out as "undefined segundos".
const OPEN = '';
const SHUT = '';

function inline(text) {
  // Escaped first, so authored content can never inject markup.
  let s = esc(text);
  // Code is lifted out before the rest, so ** or * inside a span stays literal.
  const code = [];
  s = s.replace(/`([^`]+)`/g, (_, c) =>
    OPEN + (code.push(`<code class="lx-code">${c}</code>`) - 1) + SHUT);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a class="lx-link" href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return s.replace(new RegExp(`${OPEN}(\\d+)${SHUT}`, 'g'), (_, i) => code[+i]);
}

// Blocks: blank-line-separated paragraphs, plus `- ` lists. Without the list
// case a multi-item block collapses into one run-on line, which is how the
// three cases in a project brief ended up as a single sentence.
function blocks(text) {
  return String(text ?? '')
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean)
    .map(block => {
      const lines = block.split('\n').map(l => l.trim());
      if (lines.every(l => /^[-*]\s+/.test(l))) {
        const items = lines.map(l => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`).join('');
        return `<ul class="lx-list">${items}</ul>`;
      }
      return `<p>${inline(block)}</p>`;
    })
    .join('\n    ');
}

// A fenced block, highlighted the same way the `code` component does it — and
// wearing its classes, so there is one code appearance in the product rather
// than a second one that drifts. Authors write ``` inside a question because a
// question about code needs the code; before this it came out as one run-on
// line of `<code>` with the fences still in it.
const hljs = require('highlight.js');
const PLAIN = new Set(['text', 'txt', 'plain', 'none', 'output', 'log']);
const FENCE = /```([A-Za-z0-9_+-]*)[ \t]*\r?\n([\s\S]*?)```/g;

function fenced(source, lang) {
  const code = String(source).replace(/\s+$/, '');
  let body;

  if (!lang || PLAIN.has(lang.toLowerCase())) body = esc(code);
  else if (hljs.getLanguage(lang)) body = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
  else {
    // Same refusal as the `code` component: a typo'd language rendering as
    // plain text looks deliberate, and nobody goes back to check.
    throw new Error(
      `unknown language "${lang}" in a fenced block. Use one highlight.js knows ` +
      `(js, ts, ruby, python, sql, bash, json, yaml, go, rust…), or "text" for none.`);
  }

  return `<div class="lx-card lx-codeblock">` +
    (lang ? `<span class="lx-codeblock-lang">${esc(lang)}</span>` : '') +
    `<pre><code class="hljs">${body}</code></pre></div>`;
}

// Prose and fenced code interleaved, in order. Splitting on the fences first
// keeps the paragraph logic from ever seeing code — indentation inside a block
// would otherwise read as a list.
function rich(text) {
  const src = String(text ?? '');
  const out = [];
  let last = 0;

  src.replace(FENCE, (match, lang, code, at) => {
    out.push(blocks(src.slice(last, at)));
    out.push(fenced(code, lang));
    last = at + match.length;
    return match;
  });
  out.push(blocks(src.slice(last)));

  return out.filter(Boolean).join('\n    ');
}

module.exports = { esc, inline, rich };
