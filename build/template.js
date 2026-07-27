// The page shell every lesson gets.
//
// Header, progress bar, offline banner, the shared arrowhead and the footer are
// emitted here rather than authored, so the AI only ever writes content blocks.
// Stylesheets and the runtime are linked rather than inlined: a lesson is only
// expected to work inside the project, and this way a fix reaches every lesson
// without re-rendering any.

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

function page({ id, title, subtitle, tag, blocks, concepts = [], body, depth = 1 }) {
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

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title || id)}</title>
<link rel="stylesheet" href="${a}assets/learno.css" />
<link rel="stylesheet" href="${a}assets/components.css" />
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

<div class="lx-content lx-wrap">
  <header class="lx-lesson-head">
    ${tag ? `<span class="lx-badge">${esc(tag)}</span>` : ''}
    <h1 class="lx-title">${esc(title || id)}</h1>
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
<script type="application/json" id="lx-config">${config}</script>
<script src="${a}assets/learno.js" defer></script>` : ''}
</body>
</html>
`;
}

module.exports = { page, esc, phasesOf };
