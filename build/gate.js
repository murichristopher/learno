// Wraps a block so it renders blurred behind a lock until the runtime opens it.
//
// Shared by every gated component, because the details are easy to get subtly
// wrong in a way that silently breaks the gate: the lock has to sit outside the
// blurred element (a child of a blurred parent is blurred too), and the blurred
// body has to carry aria-hidden or a screen reader simply reads the answer out.
//
// Rendered locked by default and opened by the runtime, so the wrong failure is
// impossible — if the script never runs the reader is stuck rather than handed
// the whole lesson.

const { icon } = require('./icons');

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function gate(inner, { name, reason, open = false }) {
  const locked = !open;
  return `<div class="lx-gate${locked ? ' lx-gate--locked' : ''}" data-gate="${esc(name)}">
      <div class="lx-gate-body"${locked ? ' aria-hidden="true"' : ''}>
${inner}
      </div>
      <div class="lx-gate-lock">
        <span class="lx-gate-lock-badge">${icon('lock')}</span>
        <span class="lx-gate-lock-text">${esc(reason)}</span>
      </div>
    </div>`;
}

module.exports = { gate };
