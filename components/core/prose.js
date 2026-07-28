const { rich } = require('../../build/text');

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
/* Shared by every component that renders authored blocks — the list markup
   comes from build/text.js, not from any one component. */
.lx-list { margin: .6rem 0 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: .3rem; }
.lx-list li { padding-left: .15rem; }
.lx-list li::marker { color: var(--lx-accent); }
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
    return `  <div class="lx-prose">
    ${rich(text)}
  </div>`;
  }
};
