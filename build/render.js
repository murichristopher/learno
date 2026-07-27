#!/usr/bin/env node
//
// Compiles a lesson from JSON (structure) + YAML (content) into a
// self-contained page.
//
//   node build/render.js lessons/0011-consistent-hashing
//   node build/render.js --all
//
// The build refuses to write a partial page. A lesson missing a block still
// looks finished, which makes a silent failure worse than a loud one.

const fs   = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { load: loadComponents } = require('./components');
const { page }                 = require('./template');

const ROOT = path.join(__dirname, '..');

// ── errors ────────────────────────────────────────────────────────────────
// Collected rather than thrown one at a time, so a broken lesson reports
// everything wrong with it in one run instead of one problem per attempt.

class Report {
  constructor(src) { this.src = src; this.errors = []; this.warnings = []; }
  error(where, msg)   { this.errors.push({ where, msg }); }
  warn(where, msg)    { this.warnings.push({ where, msg }); }
  get ok()            { return this.errors.length === 0; }

  print() {
    for (const w of this.warnings) console.warn(`  warn   ${w.where}\n         ${w.msg}`);
    for (const e of this.errors)   console.error(`  error  ${e.where}\n         ${e.msg}`);
  }
}

// ── @ references ──────────────────────────────────────────────────────────
// Any string beginning with @ is a path into the YAML. Resolved before a
// component ever sees its props, so components deal only in real values.

const isRef = v => typeof v === 'string' && v.startsWith('@');

function lookup(content, dotted) {
  return dotted.split('.').reduce(
    (node, key) => (node == null ? undefined : node[key]),
    content
  );
}

function resolve(value, content, report, where, seen) {
  if (isRef(value)) {
    const key = value.slice(1);
    const hit = lookup(content, key);
    if (hit === undefined) {
      report.error(where, `reference "${value}" resolves to nothing in the .yml`);
      return null;
    }
    seen.add(key);
    return hit;
  }
  if (Array.isArray(value)) return value.map((v, i) => resolve(v, content, report, `${where}[${i}]`, seen));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, resolve(v, content, report, `${where}.${k}`, seen)])
    );
  }
  return value;
}

// ── prop validation ───────────────────────────────────────────────────────
// Shared with the component catalog — see build/props.js.

const { validateProps: checkProps } = require('./props');

function validateProps(component, props, report, where) {
  for (const { level, message } of checkProps(component, props)) {
    if (level === 'error') report.error(where, message);
    else report.warn(where, message);
  }
}

// Any prop named conceptId or conceptIds is checked against the envelope's
// vocabulary. The server enforces the same list when scoring, so a concept that
// is not declared here is silently dropped from the result — the lesson would
// appear to work and quietly record nothing against that concept.
function validateConcepts(props, declared, report, where) {
  const cited = []
    .concat(props.conceptId ? [props.conceptId] : [])
    .concat(Array.isArray(props.conceptIds) ? props.conceptIds : []);

  for (const id of cited) {
    if (!declared.includes(id)) {
      report.error(where,
        `concept "${id}" is not in the lesson's "concepts" list\n` +
        `         declared: ${declared.length ? declared.join(', ') : '(none)'}\n` +
        `         → add it to "concepts" in the .json, or the server will drop it when scoring`);
    }
  }
}

// ── rendering ─────────────────────────────────────────────────────────────

function renderBlock(block, i, ctx, report, trail) {
  const where = `${trail}[${i}]`;

  if (!block || typeof block !== 'object' || !block.component) {
    report.error(where, 'every block needs a "component" field');
    return '';
  }

  const component = ctx.components.get(block.component);
  if (!component) {
    const known = [...ctx.components.keys()].sort().join(', ');
    report.error(where,
      `unknown component "${block.component}"\n         known: ${known}\n` +
      `         → add components/local/${block.component}.js, or use one of the above`);
    return '';
  }

  const props = resolve(block.props || {}, ctx.content, report, `${where}.props`, ctx.seen);
  validateProps(component, props, report, `${where} (${block.component})`);
  validateConcepts(props, ctx.lesson.concepts || [], report, `${where} (${block.component})`);

  const children = Array.isArray(block.children)
    ? block.children.map((c, j) => renderBlock(c, j, ctx, report, `${where}.children`)).join('\n')
    : '';

  try {
    return component.render(props, { ...ctx, children });
  } catch (err) {
    report.error(where, `component "${block.component}" threw while rendering: ${err.message}`);
    return '';
  }
}

// Every YAML key that could be referenced, so unreferenced ones can be
// reported. A typo in a reference is already an error; this catches its
// mirror image — content written but wired to nothing.
function leafKeys(node, prefix = '', out = []) {
  if (node && typeof node === 'object' && !Array.isArray(node)) {
    for (const [k, v] of Object.entries(node)) {
      const key = prefix ? `${prefix}.${k}` : k;
      out.push(key);
      leafKeys(v, key, out);
    }
  }
  return out;
}

// ── one lesson ────────────────────────────────────────────────────────────

function build(srcBase) {
  const jsonPath = `${srcBase}.json`;
  const ymlPath  = `${srcBase}.yml`;
  const outPath  = `${srcBase}.html`;
  const name     = path.relative(ROOT, srcBase);
  const report   = new Report(name);

  for (const p of [jsonPath, ymlPath]) {
    if (!fs.existsSync(p)) {
      report.error(path.relative(ROOT, p), 'file not found');
      return { report, outPath };
    }
  }

  let structure, content;
  try { structure = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); }
  catch (e) { report.error(path.relative(ROOT, jsonPath), `invalid JSON: ${e.message}`); return { report, outPath }; }
  try { content = yaml.load(fs.readFileSync(ymlPath, 'utf8')) || {}; }
  catch (e) { report.error(path.relative(ROOT, ymlPath), `invalid YAML: ${e.message}`); return { report, outPath }; }

  if (!structure.id)                    report.error(name, 'envelope needs an "id"');
  if (!Array.isArray(structure.blocks)) report.error(name, 'envelope needs a "blocks" array');
  if (structure.id && structure.id !== path.basename(srcBase)) {
    report.error(name, `envelope id is "${structure.id}" but the file is "${path.basename(srcBase)}" — they must match`);
  }
  if (!report.ok) return { report, outPath };

  const ctx  = { components: loadComponents(), content, seen: new Set(), lesson: structure };
  const body = structure.blocks.map((b, i) => renderBlock(b, i, ctx, report, 'blocks')).join('\n');

  const meta = resolve(
    { title: structure.title, subtitle: structure.subtitle },
    content, report, 'envelope', ctx.seen
  );

  // A key counts as used if it was referenced itself, if one of its descendants
  // was (it is the branch leading there), or if one of its ancestors was — a
  // reference to an object pulls in everything under it, so its children are
  // not orphans.
  for (const key of leafKeys(content)) {
    const referenced = [...ctx.seen].some(s =>
      s === key || s.startsWith(`${key}.`) || key.startsWith(`${s}.`)
    );
    if (!referenced) report.warn(name, `"${key}" in the .yml is never referenced by the .json`);
  }

  if (!report.ok) return { report, outPath };

  const html = page({ ...structure, ...meta, body });
  fs.writeFileSync(outPath, html);
  return { report, outPath, bytes: Buffer.byteLength(html) };
}

// ── component stylesheet ──────────────────────────────────────────────────
// Generated from whatever components exist, so a local component ships its own
// styles without editing a shared file.

function buildComponentCss() {
  const components = loadComponents();
  const chunks = [...components.values()]
    .filter(c => c.css)
    .map(c => `/* ${c.meta.name} — ${c.file} */\n${c.css.trim()}`);

  const out = path.join(ROOT, 'assets', 'components.css');
  fs.writeFileSync(out,
    `/* GENERATED by build/render.js — do not edit.\n   Styles come from each component's \`css\` field. */\n\n` +
    chunks.join('\n\n') + '\n');
  return { out, count: chunks.length };
}

// ── cli ───────────────────────────────────────────────────────────────────

function sources() {
  const found = [];
  for (const dir of ['lessons', 'review', path.join('sandbox', 'lessons')]) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full)) {
      if (f.endsWith('.json')) found.push(path.join(full, f.slice(0, -5)));
    }
  }
  return found;
}

function main(argv) {
  const all     = argv.includes('--all');
  const targets = all ? sources() : argv.filter(a => !a.startsWith('--')).map(a => path.resolve(ROOT, a.replace(/\.(json|yml|html)$/, '')));

  if (!targets.length) {
    console.error('usage: node build/render.js <lessons/0011-name> | --all');
    process.exit(2);
  }

  const css = buildComponentCss();
  console.log(`  assets/components.css   ${css.count} component${css.count === 1 ? '' : 's'}`);

  let failed = 0;
  for (const t of targets) {
    const { report, outPath, bytes } = build(t);
    if (report.ok) {
      console.log(`  ${path.relative(ROOT, outPath).padEnd(46)} ${(bytes / 1024).toFixed(1)}K`);
      report.print();
    } else {
      failed++;
      console.error(`\n  ✗ ${report.src}`);
      report.print();
    }
  }

  if (failed) {
    console.error(`\nbuild failed — ${failed} lesson${failed === 1 ? '' : 's'} not written\n`);
    process.exit(1);
  }
}

if (require.main === module) main(process.argv.slice(2));

module.exports = { build, buildComponentCss };
