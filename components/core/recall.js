// The offline fallback is rendered always and hidden by CSS: switching modes is a
// class toggle, not a fetch that would need the server precisely when it is gone.

const { icon } = require('../../build/icons');

const { esc, inline, rich } = require('../../build/text');

module.exports = {
  meta: {
    name: 'recall',
    purpose: 'resposta livre validada pela IA, com fallback de múltipla escolha offline',
    props: {
      conceptId: 'string',
      question:  'string',
      summary:   'string',
      phase:     'string?',
      // Required, not optional: this is what the reader gets when the server is
      // unreachable, and a recall without it dead-ends the lesson offline.
      fallback:  '{options: array<{text: string, correct: bool}>, ok: string, bad: string}'
    },
    demo: {
      conceptId: 'sandbox_widget_sharding',
      question: 'Explique, com suas palavras, por que trocar o número de nós invalida quase todo o cache.',
      summary: 'Seção sobre hashing modular e remapeamento de chaves.',
      phase: '1',
      fallback: {
        options: [
          { text: 'Porque o hash da chave muda', correct: false },
          { text: 'Porque o divisor muda, e o resto de quase toda chave muda com ele', correct: true }
        ],
        ok: 'Isso. O hash é estável; o que se move é o destino.',
        bad: 'O hash da chave não muda — o que muda é o divisor.'
      }
    }
  },

  css: `
.lx-ask { border-left: 3px solid var(--lx-accent); }
.lx-ask-label {
  display: flex; align-items: center; gap: .35rem;
  font-size: .68rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em;
  color: var(--lx-accent);
  margin-bottom: .45rem;
}
.lx-ask-q { color: var(--lx-text); font-weight: 550; margin-bottom: .8rem; }
.lx-ask-q > p + p, .lx-ask-q > .lx-codeblock { margin-top: .6rem; }
.lx-ask-q .lx-codeblock { font-weight: 400; }
.lx-ask-q .lx-codeblock + p { margin-top: .6rem; }

.lx-answer {
  width: 100%;
  min-height: 6.5rem;
  resize: vertical;
  padding: .7rem .85rem;
  border-radius: var(--lx-radius-sm);
  border: 1px solid var(--lx-input-border);
  background: var(--lx-input);
  color: var(--lx-text);
  line-height: 1.55;
}
.lx-answer:focus { outline: none; border-color: var(--lx-accent); box-shadow: 0 0 0 2px var(--lx-accent-ring); }
.lx-answer--large { min-height: 9rem; }

.lx-ask-tools { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin-top: .6rem; }
.lx-mic { padding: .45rem .7rem; }
.lx-mic.is-recording { background: var(--lx-bad); border-color: var(--lx-bad); color: #fff; }
.lx-mic-hint { color: var(--lx-text-muted); font-size: .78rem; }
.lx-lang {
  padding: .4rem .5rem;
  border-radius: var(--lx-radius-sm);
  border: 1px solid var(--lx-input-border);
  background: var(--lx-input);
  color: var(--lx-text-2);
  font-size: .8rem;
}

.lx-verdict { display: none; margin-top: .9rem; padding-top: .9rem; border-top: 1px solid var(--lx-border); }
.lx-verdict.is-shown { display: block; }
.lx-score { display: flex; align-items: baseline; gap: .5rem; }
.lx-score-num { font-size: 1.6rem; font-weight: 700; color: var(--lx-text); line-height: 1; }
.lx-score-of  { color: var(--lx-text-subtle); font-size: .8rem; }
.lx-score-word { margin-left: auto; font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; }
.lx-score--bad  .lx-score-word { color: var(--lx-bad); }
.lx-score--mid  .lx-score-word { color: var(--lx-warn); }
.lx-score--good .lx-score-word { color: var(--lx-accent); }
.lx-score--top  .lx-score-word { color: var(--lx-good); }
.lx-bar { height: .35rem; border-radius: 99px; background: var(--lx-border); margin: .6rem 0 .75rem; overflow: hidden; }
.lx-bar-fill { height: 100%; width: 0; border-radius: 99px; background: var(--lx-accent); transition: width .5s ease-out; }
.lx-feedback { color: var(--lx-text-2); font-size: .9rem; }
.lx-misses { margin-top: .5rem; padding-left: 1rem; color: var(--lx-text-muted); font-size: .85rem; }
.lx-misses li { list-style: disc; margin-top: .2rem; }
.lx-concepts { margin-top: .6rem; display: flex; flex-wrap: wrap; gap: .35rem; }

/* Offline fallback — rendered always, revealed when the server is unreachable. */
.lx-fallback { display: none; }
.lx-offline .lx-fallback { display: block; }
.lx-offline .lx-ask-online { display: none; }
.lx-fallback-note { color: var(--lx-text-muted); font-size: .82rem; margin-bottom: .6rem; font-style: italic; }
.lx-choice { display: block; padding: .55rem .7rem; border-radius: var(--lx-radius-sm); border: 1px solid transparent; cursor: pointer; }
.lx-choice + .lx-choice { margin-top: .3rem; }
.lx-choice:hover { background: var(--lx-input); }
.lx-choice input { margin-right: .5rem; }
.lx-choice.is-correct { border-color: var(--lx-good); background: color-mix(in srgb, var(--lx-good) 10%, transparent); }
.lx-choice.is-wrong   { border-color: var(--lx-bad); background: color-mix(in srgb, var(--lx-bad) 10%, transparent); }
.lx-inline-fb { display: none; margin-top: .6rem; font-size: .875rem; }
.lx-inline-fb.is-shown { display: block; }
.lx-inline-fb.is-ok  { color: var(--lx-good); }
.lx-inline-fb.is-bad { color: var(--lx-bad); }
`,

  render({ conceptId, question, summary, phase, fallback }) {
    const opts = (fallback && Array.isArray(fallback.options) ? fallback.options : [])
      .map((o, i) => `
        <label class="lx-choice">
          <input type="radio" name="fb-${esc(conceptId)}" value="${i}" data-correct="${o && o.correct ? '1' : '0'}" />
          <span>${inline(o && o.text)}</span>
        </label>`).join('');

    return `  <div class="lx-card lx-ask lx-recall"
       data-concept-id="${esc(conceptId)}"
       data-phase="${esc(phase || '')}"
       data-summary="${esc(summary)}"
       data-ok="${esc((fallback && fallback.ok) || 'Correto.')}"
       data-bad="${esc((fallback && fallback.bad) || 'Não é essa.')}">
    <span class="lx-ask-label">${icon('message-square-quote')} Explique com suas palavras</span>
    <div class="lx-ask-q">${rich(question)}</div>

    <div class="lx-ask-online">
      <textarea class="lx-answer" placeholder="Escreva sua explicação…"></textarea>
      <div class="lx-ask-tools">
        <button type="button" class="lx-btn lx-btn--primary" data-action="validate">Validar</button>
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
      </div>
    </div>

    <div class="lx-fallback">
      <p class="lx-fallback-note">Servidor fora do ar — respondendo por múltipla escolha.</p>
      ${opts}
      <p class="lx-inline-fb"></p>
    </div>
  </div>`;
  }
};
