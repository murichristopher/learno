// A rubric is not tabular data. Three columns of prose collapse on a phone into
// a repeated label per row and a ragged left edge — the `table` fallback is
// built for short cells. Here the criterion is the heading and the two verdicts
// are bands under it, so the shape survives at any width.

const { icon } = require('../../build/icons');
const { t } = require('../../build/strings');

const { inline } = require('../../build/text');

module.exports = {
  meta: {
    name: 'rubric',
    purpose: 'critérios de avaliação de um projeto — o que é suficiente e o que não é',
    props: {
      criteria: 'array<{title: string, ok: string, bad: string}>',
      caption:  'string?'
    },
    demo: {
      caption: 'A rubrica está aqui antes de você começar, de propósito.',
      criteria: [
        {
          title: 'Identidade do evento',
          ok:    'Cada evento carrega um id estável que não muda entre tentativas.',
          bad:   'Um id gerado por tentativa — o cliente não tem como saber que é repetição.'
        },
        {
          title: 'Política de repetição',
          ok:    'Backoff exponencial com jitter, teto e número máximo de tentativas declarados.',
          bad:   'Intervalo fixo, ou "tenta até dar certo" sem limite.'
        }
      ]
    }
  },

  css: `
.lx-rubric { display: flex; flex-direction: column; gap: .75rem; }
.lx-rubric-item { padding: .9rem 1rem; }
.lx-rubric-title {
  color: var(--lx-text);
  font-size: .95rem; font-weight: 650;
  margin-bottom: .6rem;
}
.lx-rubric-line {
  display: flex; align-items: flex-start; gap: .55rem;
  font-size: .875rem;
  color: var(--lx-text-2);
}
.lx-rubric-line + .lx-rubric-line { margin-top: .5rem; }
/* The icon is the only carrier of the verdict, so it never shrinks and never
   inherits the line's own colour. */
.lx-rubric-mark { flex: 0 0 auto; margin-top: .12em; }
.lx-rubric-line--ok  .lx-rubric-mark { color: var(--lx-good); }
.lx-rubric-line--bad .lx-rubric-mark { color: var(--lx-bad); }
.lx-rubric-line--bad { color: var(--lx-text-subtle); }
`,

  render({ criteria, caption }) {
    const items = (criteria || []).map(c => `
      <div class="lx-card lx-rubric-item">
        <p class="lx-rubric-title">${inline(c && c.title)}</p>
        <p class="lx-rubric-line lx-rubric-line--ok">
          <span class="lx-rubric-mark">${icon('check', { label: t('rubric.ok') })}</span>
          <span>${inline(c && c.ok)}</span>
        </p>
        <p class="lx-rubric-line lx-rubric-line--bad">
          <span class="lx-rubric-mark">${icon('x', { label: t('rubric.bad') })}</span>
          <span>${inline(c && c.bad)}</span>
        </p>
      </div>`).join('');

    return `  <figure class="lx-figure">
    <div class="lx-rubric">${items}
    </div>
    ${caption ? `<figcaption class="lx-caption">${inline(caption)}</figcaption>` : ''}
  </figure>`;
  }
};
