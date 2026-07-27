// Loads the component vocabulary.
//
// components/core/ is upstream's. components/local/ belongs to this fork and
// wins on a name collision, so a fork can override a core component without
// ever editing an upstream file — and one component per file means git rarely
// has to merge the same file from two sides.

const fs   = require('fs');
const path = require('path');

const ROOT  = path.join(__dirname, '..', 'components');
const TIERS = ['core', 'local'];   // later tiers win

function loadDir(tier) {
  const dir = path.join(ROOT, tier);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.js'))
    .sort()
    .map(file => {
      const full = path.join(dir, file);
      const mod  = require(full);
      const rel  = path.join('components', tier, file);

      if (!mod || typeof mod.render !== 'function') {
        throw new Error(`${rel}: must export a render(props, ctx) function`);
      }
      if (!mod.meta || !mod.meta.name) {
        throw new Error(`${rel}: must export meta.name`);
      }
      if (path.basename(file, '.js') !== mod.meta.name) {
        throw new Error(`${rel}: meta.name is "${mod.meta.name}" but the file is "${file}" — they must match, since a lesson refers to a component by name`);
      }
      return { ...mod, tier, file: rel };
    });
}

function load() {
  const byName = new Map();
  for (const tier of TIERS) {
    for (const c of loadDir(tier)) byName.set(c.meta.name, c);
  }
  return byName;
}

module.exports = { load, TIERS };
