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
function rich(text) {
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

module.exports = { esc, inline, rich };
