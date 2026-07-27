// Paragraphs of running text.
//
// A deliberately small markdown subset — bold, italic, inline code, links —
// because a lesson's prose is prose. Anything structural is a component, which
// is what keeps the vocabulary meaningful instead of markdown-by-the-back-door.

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function inline(text) {
  // Escaped first, so authored content can never inject markup.
  let s = esc(text);
  // Code is lifted out before the rest, so ** or * inside a span stays literal.
  // The sentinel is a private-use codepoint, which cannot occur in authored
  // prose — a punctuation placeholder could: " 3 " in ordinary text would match.
  const code = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => `${code.push(`<code class="lx-code">${c}</code>`) - 1}`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a class="lx-link" href="$2">$1</a>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  return s.replace(/(\d+)/g, (_, i) => code[+i]);
}

module.exports = {
  meta: {
    name: 'prose',
    purpose: 'parágrafos de texto corrido',
    props: { text: 'string' },
    demo: {
      text: 'Um parágrafo com **negrito**, *itálico* e `código inline`.\n\nUm segundo parágrafo, separado por linha em branco.'
    }
  },

  css: `
.lx-prose > p + p { margin-top: .75rem; }
.lx-prose { color: var(--lx-text-2); }
.lx-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: .875em;
  padding: .1em .35em;
  border-radius: .35rem;
  background: var(--lx-input);
  border: 1px solid var(--lx-border);
}
.lx-link { color: var(--lx-accent); text-underline-offset: .2em; }
`,

  render({ text }) {
    const paragraphs = String(text)
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `<p>${inline(p)}</p>`)
      .join('\n    ');
    return `  <div class="lx-prose">\n    ${paragraphs}\n  </div>`;
  }
};
