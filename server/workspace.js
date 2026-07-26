// Where the study workspace is, and what content it holds.
//
// Single source of truth: index.js serves this directory statically and
// routes/catalog.js lists from it. They used to resolve the root separately,
// from different nesting depths, which is exactly the kind of thing that drifts.

const fs   = require('fs');
const path = require('path');

// The default assumes the deployed layout <workspace>/skill/server, where two
// levels up is the workspace root. That is wrong in the engine repo itself
// (server/ sits at the root, so it would resolve to the parent of the repo and
// expose unrelated directories) — hence LEARNO_WORKSPACE, which the sandbox and
// any non-standard layout must set.
//
// It has to come from the real environment rather than .env, since .env is
// itself looked up inside the workspace.
const WORKSPACE = process.env.LEARNO_WORKSPACE
  ? path.resolve(process.env.LEARNO_WORKSPACE)
  : path.join(__dirname, '..', '..');

// A <title> is markup, so entities in it have to be decoded before the title is
// handed on as text — otherwise "Cache &amp; CDN" reaches the dashboard (and any
// JSON consumer) with the entity intact and renders as "Cache &amp; CDN".
// Only the five predefined XML entities plus numeric refs; a lesson title needs
// nothing richer.
function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (whole, body) => {
    switch (body.toLowerCase()) {
      case 'amp':  return '&';
      case 'lt':   return '<';
      case 'gt':   return '>';
      case 'quot': return '"';
      case 'apos': return "'";
      default: {
        const code = body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
      }
    }
  });
}

// Lists the lesson/review HTML actually on disk, independent of any progress
// recorded in the database — so the dashboard can show everything, finished or
// not. Titles come from each file's <title>.
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
      if (m && m[1].trim()) title = decodeEntities(m[1].trim());
    } catch { /* keep filename as title */ }
    return { file, title, path: '/' + rel + '/' + file };
  });
}

function listWorkspace() {
  return { lessons: listDir('lessons'), reviews: listDir('review') };
}

const DASHBOARD_PATH = 'reference/my-learning.html';

function hasDashboard() {
  return fs.existsSync(path.join(WORKSPACE, DASHBOARD_PATH));
}

module.exports = { WORKSPACE, listDir, listWorkspace, DASHBOARD_PATH, hasDashboard };
