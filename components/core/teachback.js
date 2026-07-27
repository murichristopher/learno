// The closing exercise: explain the whole thing back.
//
// This is the one that decides the lesson's score and drives the spaced-repetition
// schedule, because explaining something end to end is the point at which gaps
// stop being survivable. Its result is what gets POSTed to /api/progress.
//
// Gated behind the last phase: the question restates the whole lesson, so a
// reader who scrolls to it first gets the shape of every answer for free.
//
// No offline fallback on purpose. A multiple-choice stand-in for "teach it back"
// would measure nothing, and recording a fabricated score against the review
// schedule is worse than recording none — offline, the reader is told to come
// back rather than handed a fake.

const { icon } = require('../../build/icons');
const { gate } = require('../../build/gate');

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = {
  meta: {
    name: 'teachback',
    purpose: 'explicação final que fecha a lição e alimenta a revisão espaçada',
    props: {
      question:   'string',
      conceptIds: 'array<string>',
      hint:       'string?'
    },
    demo: {
      question: 'Explique consistent hashing para alguém que só conhece hash módulo N.',
      conceptIds: ['sandbox_widget_sharding', 'sandbox_widget_replication'],
      hint: 'Comece pelo problema, depois o anel, depois o que acontece ao adicionar um nó.'
    }
  },

  css: `
.lx-teachback { border-left: 3px solid var(--lx-accent); }
.lx-teachback-hint { color: var(--lx-text-muted); font-size: .85rem; margin-bottom: .7rem; }
.lx-offline .lx-teachback-offline { display: block; }
.lx-teachback-offline { display: none; color: var(--lx-text-muted); font-size: .875rem; font-style: italic; }
.lx-offline .lx-teachback .lx-ask-online { display: none; }

/* Completion — revealed once the teach-back has been scored and recorded. */
.lx-done { display: none; }
.lx-done.is-shown { display: block; }
.lx-next-review {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: .5rem;
  border-left: 3px solid var(--lx-accent);
}
.lx-next-review-label {
  font-size: .68rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em;
  color: var(--lx-accent);
}
.lx-next-review-date { color: var(--lx-text); font-weight: 600; }
.lx-next-review-note { color: var(--lx-text-muted); font-size: .85rem; width: 100%; }
`,

  render({ question, conceptIds, hint }) {
    const card = `  <div class="lx-card lx-ask lx-teachback" data-concepts="${esc(conceptIds.join(','))}">
    <span class="lx-ask-label">${icon('graduation-cap')} Ensina de volta</span>
    <p class="lx-ask-q">${esc(question)}</p>
    ${hint ? `<p class="lx-teachback-hint">${esc(hint)}</p>` : ''}

    <p class="lx-teachback-offline">
      Esta parte precisa do servidor. Sem ele não dá para registrar a lição —
      e um score inventado estragaria o agendamento da revisão.
    </p>

    <div class="lx-ask-online">
      <textarea class="lx-answer lx-answer--large" placeholder="Explique o conceito inteiro, com suas palavras…"></textarea>
      <div class="lx-ask-tools">
        <button type="button" class="lx-btn lx-btn--primary" data-action="teachback">Encerrar a lição</button>
        <button type="button" class="lx-btn lx-btn--secondary lx-mic" data-action="mic" hidden>🎙 Ditar</button>
        <select class="lx-lang" data-role="lang" hidden>
          <option value="pt-BR">Português</option>
          <option value="en-US">English</option>
        </select>
        <span class="lx-mic-hint"></span>
      </div>
      <div class="lx-verdict">
        <div class="lx-score">
          <span class="lx-score-num">—</span><span class="lx-score-of">/100</span>
          <span class="lx-score-word"></span>
        </div>
        <div class="lx-bar"><div class="lx-bar-fill"></div></div>
        <p class="lx-feedback"></p>
        <ul class="lx-misses"></ul>
        <div class="lx-concepts"></div>
      </div>
    </div>
  </div>`;
    const done = `  <div class="lx-done">
    <div class="lx-card lx-next-review">
      <span class="lx-next-review-label">Próxima revisão</span>
      <span class="lx-next-review-date">—</span>
      <span class="lx-next-review-note"></span>
    </div>
  </div>`;
    return gate(card, {
      name: 'teachback',
      reason: 'Termine as seções acima para abrir'
    }) + '\n' + done;
  }
};
