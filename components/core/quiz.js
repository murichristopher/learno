// Multiple choice, checked in the page.
//
// Weaker practice than recall — recognising the right answer is easier than
// producing it — so it is for checks that are genuinely binary, where a free-text
// answer would be graded on wording rather than understanding. It needs no
// server, which is also why recall borrows its shape for the offline fallback.

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = {
  meta: {
    name: 'quiz',
    purpose: 'múltipla escolha, corrigida na própria página',
    props: { question: 'string', options: 'array', ok: 'string', bad: 'string', phase: 'string?' },
    demo: {
      question: 'Qual destes NÃO é resolvido por um cache?',
      options: [
        { text: 'Leitura repetida do mesmo dado', correct: false },
        { text: 'Escrita concorrente na mesma linha', correct: true }
      ],
      ok: 'Isso. Cache alivia leitura; concorrência de escrita continua sendo problema do banco.',
      bad: 'Leitura repetida é exatamente o que o cache resolve.'
    }
  },

  css: `
.lx-quiz-label {
  display: block;
  font-size: .68rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em;
  color: var(--lx-text-subtle);
  margin-bottom: .45rem;
}
`,

  render({ question, options, ok, bad, phase }) {
    const name = `quiz-${Math.abs(String(question).split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7))}`;
    const opts = options.map((o, i) => `
      <label class="lx-choice">
        <input type="radio" name="${name}" value="${i}" data-correct="${o && o.correct ? '1' : '0'}" />
        <span>${esc(o && o.text)}</span>
      </label>`).join('');

    return `  <div class="lx-card lx-quiz" data-phase="${esc(phase || '')}"
       data-ok="${esc(ok)}" data-bad="${esc(bad)}">
    <span class="lx-quiz-label">Escolha uma</span>
    <p class="lx-ask-q">${esc(question)}</p>
    ${opts}
    <p class="lx-inline-fb"></p>
  </div>`;
  }
};
