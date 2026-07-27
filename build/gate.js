// Two traps this exists to keep in one place: the lock must sit OUTSIDE the
// blurred element (a child of a blurred parent is blurred too), and the blurred
// body must carry aria-hidden or a screen reader reads the answer out.

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
