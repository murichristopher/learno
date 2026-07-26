const router = require('express').Router();
const { listWorkspace, DASHBOARD_PATH, hasDashboard } = require('../workspace');

// `/` is the front door: the mastery dashboard, which already lists every
// lesson and review via /api/catalog.
//
// A redirect rather than serving the file at `/`, because the dashboard links
// to its siblings relatively (`glossary.html`); served from the root those
// would resolve to /glossary.html and 404.
//
// A workspace that has not been seeded yet has no dashboard, and answering the
// root with `{"error":"Not found"}` there is a poor first impression — so fall
// back to a plain index of whatever content does exist.

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function renderGroup(title, items, empty) {
  if (!items.length) return `<h2>${esc(title)}</h2><p class="empty">${esc(empty)}</p>`;
  return `<h2>${esc(title)} <span class="count">${items.length}</span></h2><ul>` +
    items.map(i => `<li><a href="${esc(i.path)}">${esc(i.title)}</a><code>${esc(i.file)}</code></li>`).join('') +
    '</ul>';
}

function renderIndex({ lessons, reviews }) {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>learno — workspace</title>
<style>
  :root { color-scheme: light dark; --ink:#1a1d23; --muted:#6b7280; --bg:#fbfbfd; --card:#fff; --rule:#e5e7eb; --accent:#2563eb; }
  @media (prefers-color-scheme: dark) {
    :root { --ink:#e6e6e6; --muted:#9aa1ab; --bg:#0f1115; --card:#161922; --rule:#2a2e37; --accent:#6ea8ff; }
  }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:var(--bg); color:var(--ink);
         max-width:52rem; margin:0 auto; padding:3rem 1.25rem 5rem; line-height:1.6; }
  h1 { font-size:1.5rem; letter-spacing:-.02em; }
  .sub { color:var(--muted); font-size:.9rem; margin:.35rem 0 2.5rem; }
  h2 { font-size:.8rem; text-transform:uppercase; letter-spacing:.08em; color:var(--muted);
       margin:2rem 0 .75rem; display:flex; align-items:center; gap:.5rem; }
  .count { background:var(--rule); color:var(--muted); border-radius:99px; padding:.05rem .5rem; font-size:.75rem; letter-spacing:0; }
  ul { list-style:none; border:1px solid var(--rule); border-radius:.6rem; overflow:hidden; background:var(--card); }
  li { border-bottom:1px solid var(--rule); }
  li:last-child { border-bottom:0; }
  li a { display:flex; justify-content:space-between; align-items:center; gap:1rem;
         padding:.8rem 1rem; color:var(--ink); text-decoration:none; }
  li a:hover { background:var(--rule); }
  li code { color:var(--muted); font-size:.75rem; white-space:nowrap; }
  .empty { color:var(--muted); font-size:.9rem; font-style:italic; }
  .note { margin-top:2.5rem; padding:.9rem 1rem; border-left:3px solid var(--accent);
          background:var(--card); color:var(--muted); font-size:.85rem; border-radius:0 .4rem .4rem 0; }
  .note code { color:var(--ink); }
</style></head>
<body>
  <h1>learno</h1>
  <p class="sub">Índice do workspace.</p>
  ${renderGroup('Lições', lessons, 'Nenhuma lição ainda.')}
  ${renderGroup('Revisões', reviews, 'Nenhuma revisão ainda.')}
  <p class="note">
    O dashboard de domínio ainda não existe neste workspace. Copie
    <code>skill/templates/reference/</code> para <code>reference/</code> para
    que <code>/</code> passe a abrir <code>${esc(DASHBOARD_PATH)}</code>.
  </p>
</body></html>`;
}

router.get('/', (_req, res) => {
  if (hasDashboard()) return res.redirect(302, '/' + DASHBOARD_PATH);
  res.type('html').send(renderIndex(listWorkspace()));
});

module.exports = router;
