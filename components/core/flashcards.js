// Immediate review cards at the end of a lesson.
//
// Gated behind the TEACH-BACK, not behind the last phase — the cards carry the
// answers, so opening them before the effort turns the closing exercise into a
// reading comprehension test. They are the reward for having tried, which is
// also the moment they teach most.
//
// Built on <details> rather than a JS flip: retrieval practice only works if the
// answer is genuinely hidden until the reader has tried, and <details> gives
// that for free — keyboard-operable, screen-reader-announced, and it still works
// with the page opened straight from disk with no server and no script.

const { icon } = require('../../build/icons');
const { gate } = require('../../build/gate');

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = {
  meta: {
    name: 'flashcards',
    purpose: 'cartões de revisão imediata — frente visível, verso escondido',
    props: {
      cards: 'array<{front: string, back: string}>',
      title: 'string?'
    },
    demo: {
      title: 'Revisão rápida',
      cards: [
        { front: 'Cache-aside', back: 'A aplicação lê o cache; se não achar, busca no banco e grava no cache.' },
        { front: 'TTL',         back: 'Prazo de validade da entrada. É o que troca consistência por carga.' }
      ]
    }
  },

  css: `
.lx-flash-title {
  display: flex; align-items: center; gap: .35rem;
  color: var(--lx-text-subtle);
  font-size: .7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em;
  margin-bottom: .75rem;
}
.lx-flash-grid { display: grid; gap: .75rem; grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr)); }
.lx-flash { padding: 0; }
.lx-flash summary {
  cursor: pointer;
  list-style: none;
  padding: 1rem 1.1rem;
  display: flex; align-items: center; justify-content: space-between; gap: .75rem;
  color: var(--lx-text); font-weight: 600;
}
.lx-flash summary::-webkit-details-marker { display: none; }
.lx-flash summary::after {
  content: "revelar";
  color: var(--lx-accent);
  font-size: .7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em;
  flex-shrink: 0;
}
.lx-flash[open] summary::after { content: "esconder"; }
.lx-flash summary:focus-visible { outline: 2px solid var(--lx-accent); outline-offset: -2px; border-radius: var(--lx-radius); }
.lx-flash-back {
  padding: 0 1.1rem 1.1rem;
  color: var(--lx-text-2);
  font-size: .9rem;
  border-top: 1px solid var(--lx-border);
  padding-top: .85rem;
  margin: 0 1.1rem;
  padding-left: 0; padding-right: 0;
}

@media (max-width: 560px) {
  .lx-flash-grid { grid-template-columns: 1fr; }
}
`,

  render({ cards, title }) {
    const items = cards.map(c => `
      <details class="lx-card lx-flash">
        <summary>${esc(c && c.front)}</summary>
        <p class="lx-flash-back">${esc(c && c.back)}</p>
      </details>`).join('');

    return gate(`  <section class="lx-flashcards">
    <p class="lx-flash-title">${icon('layers')} ${esc(title || 'Revisão rápida')}</p>
    <div class="lx-flash-grid">${items}
    </div>
  </section>`, {
      name: 'flashcards',
      reason: 'Encerre a lição para abrir a revisão'
    });
  }
};
