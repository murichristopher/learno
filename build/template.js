// The page shell. Header, progress bar, offline banner and footer are emitted
// here rather than authored, so a lesson only ever contains content blocks.

const { icon } = require('./icons');

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Relative so the page works over file:// as well as http://.
function assetPrefix(depth = 1) { return '../'.repeat(depth); }

// The phases a lesson declares, in order, taken from the blocks themselves —
// the progress bar and the unlock sequence are facts about the lesson, not
// something an author should have to restate and keep in sync.
function phasesOf(blocks = []) {
  return blocks
    .filter(b => b && b.component === 'phase' && b.props && b.props.id != null)
    .map(b => String(b.props.id));
}

function hasComponent(blocks, name) {
  return (blocks || []).some(b =>
    b && (b.component === name || hasComponent(b.children, name))
  );
}

// Applied before the first paint. A theme restored by the deferred runtime would
// show one frame of the wrong theme on every load, which is far more noticeable
// than the four lines it takes to avoid. Emitted identically into every lesson —
// it is engine code that happens to live in the page, not authored script.
const THEME_BOOT = `<script>(function(){try{var d=document.documentElement,` +
  `t=localStorage.getItem('lx-theme'),a=localStorage.getItem('lx-accent');` +
  `if(t&&t!=='auto')d.setAttribute('data-theme',t);` +
  `if(a&&a!=='azul')d.setAttribute('data-accent',a)}catch(e){}})()</script>`;

function topBar(a) {
  return `  <nav class="lx-topbar">
    <a class="lx-topbar-home" href="${a}" title="Ir para o painel">
      ${icon('house', { className: 'lx-topbar-icon' })}
      <span>learno</span>
    </a>
    ${settings()}
  </nav>`;
}

// <details> rather than a button plus JS: click-outside, Escape and focus are
// all handled by the browser, and it still opens if the runtime never loads.
function settings() {
  return `<details class="lx-settings">
      <summary class="lx-settings-btn" title="Configurações" aria-label="Configurações" role="button">
        ${icon('settings')}
      </summary>
      <div class="lx-settings-panel">
        <div class="lx-settings-group">
          <p class="lx-settings-label">Tema</p>
          <div class="lx-settings-row">
            <button type="button" class="lx-settings-opt" data-theme-set="light" title="Claro">${icon('sun')}</button>
            <button type="button" class="lx-settings-opt" data-theme-set="auto" title="Seguir o sistema">${icon('monitor')}</button>
            <button type="button" class="lx-settings-opt" data-theme-set="dark" title="Escuro">${icon('moon')}</button>
          </div>
        </div>
        <div class="lx-settings-group">
          <p class="lx-settings-label">Cor principal</p>
          <div class="lx-settings-row">
            <button type="button" class="lx-settings-opt" data-accent-set="azul" title="Azul"><span class="lx-settings-dot lx-settings-dot--azul"></span>Azul</button>
            <button type="button" class="lx-settings-opt" data-accent-set="roxo" title="Roxo"><span class="lx-settings-dot lx-settings-dot--roxo"></span>Roxo</button>
            <button type="button" class="lx-settings-opt" data-accent-set="rosa" title="Rosa"><span class="lx-settings-dot lx-settings-dot--rosa"></span>Rosa</button>
          </div>
        </div>
      </div>
    </details>`;
}

function page({ id, title, subtitle, tag, icon: lessonIcon, blocks, concepts = [], body, depth = 1 }) {
  const a       = assetPrefix(depth);
  const phases  = phasesOf(blocks);
  const needsJs = phases.length ||
                  hasComponent(blocks, 'recall') ||
                  hasComponent(blocks, 'quiz') ||
                  hasComponent(blocks, 'teachback');

  // Configuration travels as data, not as generated code: a lesson never
  // contains script of its own, so nothing has to be escaped into a JS context.
  const config = JSON.stringify({ lesson: id, concepts, phases });

  const progress = phases.length
    ? `  <div class="lx-progress" role="presentation">
${phases.map(p => `    <span class="lx-progress-seg" data-seg="${esc(p)}"></span>`).join('\n')}
  </div>`
    : '';

  const titleIcon = lessonIcon
    ? `<span class="lx-title-icon">${icon(lessonIcon)}</span>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title || id)}</title>
<link rel="stylesheet" href="${a}assets/learno.css" />
<link rel="stylesheet" href="${a}assets/components.css" />
${THEME_BOOT}
</head>
<body class="lx-shell" data-lesson="${esc(id)}">

<div class="lx-overlay"></div>

<!-- Shared arrowhead. Authored diagrams reference #lx-arrow and never carry
     their own marker definition. -->
<svg class="lx-defs" aria-hidden="true">
  <defs>
    <marker id="lx-arrow" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path class="lx-arrowhead" d="M 0 0 L 10 5 L 0 10 z" />
    </marker>
  </defs>
</svg>

${topBar(a)}

<div class="lx-content lx-wrap">
  <header class="lx-lesson-head">
    ${tag ? `<span class="lx-badge">${esc(tag)}</span>` : ''}
    <h1 class="lx-title">${titleIcon}<span>${esc(title || id)}</span></h1>
    ${subtitle ? `<p class="lx-subtitle">${esc(subtitle)}</p>` : ''}
  </header>

  <div class="lx-offline-banner" id="lx-banner" hidden>
    Servidor fora do ar. As seções continuam abrindo por múltipla escolha, mas a
    validação por IA e o registro do progresso ficam indisponíveis.
  </div>

${progress}

  <div class="lx-blocks">
${body}
  </div>

  <footer class="lx-lesson-foot">
    <a class="lx-btn lx-btn--outline" href="${a}reference/my-learning.html">Painel</a>
    <a class="lx-btn lx-btn--outline" href="${a}reference/glossary.html">Glossário</a>
  </footer>
</div>
${needsJs ? `
<script type="application/json" id="lx-config">${config}</script>` : ''}
<script src="${a}assets/learno.js" defer></script>
</body>
</html>
`;
}

module.exports = { page, esc, phasesOf, topBar, THEME_BOOT };
