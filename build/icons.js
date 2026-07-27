// Icons, inlined at build time from lucide.
//
// Lucide draws with `stroke="currentColor"` and no fills, so an icon takes the
// colour of whatever it sits in — which means icons follow the design system for
// free, the same way diagrams do, instead of carrying a palette of their own.
//
// Inlined rather than referenced from a sprite: `<use href="sprite.svg#id">` is
// blocked when a page is opened over file://, and a lesson has to keep working
// when opened straight from disk. An icon is ~300 bytes, so a page with ten of
// them pays about 3K for never having that problem.
//
// The library is a build dependency and is never shipped — of its 2007 icons,
// only the handful a page actually names reach the output.

const fs   = require('fs');
const path = require('path');

const DIR = path.join(path.dirname(require.resolve('lucide-static/package.json')), 'icons');

const cache = new Map();

function readIcon(name) {
  if (cache.has(name)) return cache.get(name);

  const file = path.join(DIR, `${name}.svg`);
  if (!fs.existsSync(file)) {
    // Loud, with the near misses, because a typo'd icon that silently rendered
    // nothing would leave a hole nobody notices until someone looks at the page.
    const all  = fs.readdirSync(DIR).map(f => f.replace(/\.svg$/, ''));
    const near = all.filter(n => n.includes(name) || name.includes(n)).slice(0, 6);
    throw new Error(
      `unknown icon "${name}"` +
      (near.length ? `\n         did you mean: ${near.join(', ')}?` : '') +
      `\n         see https://lucide.dev/icons for the full set`
    );
  }

  const raw = fs.readFileSync(file, 'utf8');
  const body = raw
    .replace(/<!--[\s\S]*?-->/g, '')       // licence comment
    .replace(/^[\s\S]*?<svg[^>]*>/, '')    // opening tag, rebuilt below
    .replace(/<\/svg>\s*$/, '')
    .trim();

  cache.set(name, body);
  return body;
}

// Size comes from CSS (1em by default) so an icon scales with the text it sits
// beside rather than being pinned to a pixel size at build time.
function icon(name, { className = '', size = null, label = null } = {}) {
  const body = readIcon(name);
  const cls  = ['lx-icon-svg', className].filter(Boolean).join(' ');
  const dims = size ? ` width="${size}" height="${size}"` : '';
  const a11y = label
    ? ` role="img" aria-label="${String(label).replace(/"/g, '&quot;')}"`
    : ' aria-hidden="true"';

  return `<svg class="${cls}"${dims} viewBox="0 0 24 24" fill="none" ` +
         `stroke="currentColor" stroke-width="2" stroke-linecap="round" ` +
         `stroke-linejoin="round"${a11y}>${body}</svg>`;
}

function exists(name) {
  return fs.existsSync(path.join(DIR, `${name}.svg`));
}

module.exports = { icon, exists };
