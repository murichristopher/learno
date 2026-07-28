// What the user has to hand in, stated so it cannot be misread. This was a
// `callout` first, which buried the one sentence that matters — the artifact —
// inside a paragraph of context. A project whose delivery is ambiguous is a
// project nobody starts.

const { icon } = require('../../build/icons');
const { inline, rich } = require('../../build/text');

module.exports = {
  meta: {
    name: 'deliverable',
    purpose: 'o que o usuário tem de entregar num projeto — artefato, casos que ele precisa aguentar, e como entregar',
    props: {
      artifact: 'string',
      detail:   'string?',
      must:     'array<string>',
      handoff:  'string'
    },
    demo: {
      artifact: 'Um serviço de entrega de webhooks que roda',
      detail: 'Qualquer linguagem, sem framework obrigatório. Um receptor de mentira serve como cliente.',
      must: [
        'O mesmo evento entregue duas vezes, e o receptor conseguindo perceber',
        'Um cliente fora do ar por horas, e os eventos daquele período',
        'Um evento que esgota as tentativas e não pode sumir'
      ],
      handoff: 'Escreva no seu repositório. Quando estiver rodando, aponte o caminho no chat.'
    }
  },

  css: `
.lx-deliverable { border-left: 3px solid var(--lx-accent); }
.lx-deliverable-label {
  display: flex; align-items: center; gap: .4rem;
  color: var(--lx-accent);
  font-size: .7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .08em;
}
.lx-deliverable-artifact {
  color: var(--lx-text);
  font-size: 1.05rem; font-weight: 650; line-height: 1.35;
  margin: .5rem 0 0;
}
.lx-deliverable-detail { color: var(--lx-text-2); font-size: .9rem; margin-top: .5rem; }
.lx-deliverable-detail > p + p { margin-top: .5rem; }
.lx-deliverable-must { margin-top: .9rem; display: flex; flex-direction: column; gap: .5rem; }
.lx-deliverable-must-label {
  color: var(--lx-text-subtle);
  font-size: .7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: .07em;
}
.lx-deliverable-case {
  display: flex; align-items: flex-start; gap: .55rem;
  color: var(--lx-text-2); font-size: .9rem;
}
.lx-deliverable-case .lx-icon-svg { flex: 0 0 auto; margin-top: .15em; color: var(--lx-accent); }
.lx-deliverable-handoff {
  display: flex; align-items: flex-start; gap: .55rem;
  margin-top: .9rem; padding-top: .8rem;
  border-top: 1px solid var(--lx-border);
  color: var(--lx-text-2); font-size: .875rem;
}
.lx-deliverable-handoff .lx-icon-svg { flex: 0 0 auto; margin-top: .15em; color: var(--lx-text-subtle); }
`,

  render({ artifact, detail, must, handoff }) {
    const cases = (must || []).map(m => `
      <p class="lx-deliverable-case">${icon('square-check')}<span>${inline(m)}</span></p>`).join('');

    return `  <div class="lx-card lx-deliverable">
    <span class="lx-deliverable-label">${icon('package')}O que entregar</span>
    <p class="lx-deliverable-artifact">${inline(artifact)}</p>
    ${detail ? `<div class="lx-deliverable-detail">${rich(detail)}</div>` : ''}
    ${cases ? `<div class="lx-deliverable-must">
      <span class="lx-deliverable-must-label">Precisa aguentar</span>${cases}
    </div>` : ''}
    <p class="lx-deliverable-handoff">${icon('message-square')}<span>${inline(handoff)}</span></p>
  </div>`;
  }
};
