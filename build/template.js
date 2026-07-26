// The page shell every lesson gets.
//
// Header, the shared arrowhead and the footer are emitted here rather than
// authored, so the AI only ever writes content blocks. Stylesheets are linked
// rather than inlined: a lesson is only expected to work inside the project,
// and this way a design fix reaches every lesson without re-rendering any.

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Relative so the page works over file:// as well as http://.
function assetPrefix(depth = 1) { return '../'.repeat(depth); }

function page({ id, title, subtitle, tag, body, depth = 1 }) {
  const a = assetPrefix(depth);
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

${body}

  <footer class="lx-lesson-foot">
    <a class="lx-btn lx-btn--outline" href="${a}reference/my-learning.html">Painel</a>
    <a class="lx-btn lx-btn--outline" href="${a}reference/glossary.html">Glossário</a>
  </footer>
</div>

</body>
</html>
`;
}

module.exports = { page, esc };
