// What to do now, which is the one thing the dashboard cannot compute.
//
// Everything else on the page is derivable from the database. "The next lesson"
// is not: it depends on MISSION.md, on what the last session felt like, on a
// misconception that has not been named yet. Only the model knows, so the model
// writes NEXT.md and this route hands it to the page.
//
// The format is deliberately loose — it is written by a model into a file a
// human may also edit, so it degrades instead of failing:
//
//   # Revisar rate limiting antes de seguir
//   [Abrir a revisão R2](review/0009-rate-limiting-r2.html)
//
//   Você trocou janela deslizante por janela fixa em duas seções diferentes.
//
// Missing heading, missing link and missing body are each survivable on their
// own. A missing file is not an error either: it means no session has closed
// yet, and the dashboard says so.

const fs   = require('fs');
const path = require('path');

const router = require('express').Router();
const { WORKSPACE } = require('../workspace');

const FILE = 'NEXT.md';

function parse(raw) {
  const lines = raw.split('\n');

  const titleLine = lines.findIndex(l => /^#\s+/.test(l.trim()));
  const title = titleLine >= 0 ? lines[titleLine].trim().replace(/^#\s+/, '') : null;

  // The first link is the action. Later ones belong to the reasoning and are
  // left in the body, where they render as ordinary text.
  let action = null;
  let actionLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/\[([^\]]+)\]\(([^)\s]+)\)/);
    if (m) { action = { label: m[1], href: m[2] }; actionLine = i; break; }
  }

  const body = lines
    .filter((_, i) => i !== titleLine && i !== actionLine)
    .join('\n')
    .trim();

  return { title, action, body };
}

router.get('/', (_req, res) => {
  const file = path.join(WORKSPACE, FILE);

  let raw, stat;
  try {
    raw  = fs.readFileSync(file, 'utf8');
    stat = fs.statSync(file);
  } catch {
    return res.json({ exists: false, file: FILE });
  }

  res.json({ exists: true, file: FILE, updated_at: stat.mtime, ...parse(raw) });
});

module.exports = router;
