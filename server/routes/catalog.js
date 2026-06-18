const router = require('express').Router();
const fs = require('fs');
const path = require('path');

// Lists the lesson/review HTML files actually present on disk (independent of
// MongoDB progress), so the dashboard can show EVERYTHING — completed or not.
// __dirname is skill/server/routes → three levels up is the workspace root.
const WORKSPACE = path.join(__dirname, '..', '..', '..');

function listDir(rel) {
  const dir = path.join(WORKSPACE, rel);
  let files;
  try { files = fs.readdirSync(dir).filter(f => f.endsWith('.html')); }
  catch { return []; }
  return files.sort().map(file => {
    let title = file;
    try {
      const html = fs.readFileSync(path.join(dir, file), 'utf8');
      const m = html.match(/<title>([^<]*)<\/title>/i);
      if (m && m[1].trim()) title = m[1].trim();
    } catch { /* keep filename as title */ }
    return { file, title, path: '/' + rel + '/' + file };
  });
}

router.get('/', (_req, res) => {
  res.json({ lessons: listDir('lessons'), reviews: listDir('review') });
});

module.exports = router;
