#!/usr/bin/env node
//
//   node build/audit-theme.js <url> [accent] [theme]
//
// Renders a page in a real browser and measures the contrast the reader actually
// gets. Reasoning about the cascade kept producing wrong answers — a value set in
// an accent block and never overridden in the theme block is invisible in the
// source and obvious here.

const { chromium } = require('playwright');

const PAIRS = [
  ['body',                       'color', 'background', 4.5, 'texto no corpo'],
  ['.lx-card',                   'color', 'background', 4.5, 'texto no card'],
  ['.lx-answer',                 'color', 'background', 4.5, 'textarea'],
  ['.lx-answer::placeholder',    'color', 'background', 4.5, 'placeholder'],
  ['.lx-btn--primary',           'color', 'background', 4.5, 'botão primário'],
  ['.lx-btn--secondary',         'color', 'background', 4.5, 'botão secundário'],
  ['.lx-btn--outline',           'color', 'background', 4.5, 'botão outline'],
  ['.lx-badge',                  'color', 'background', 4.5, 'badge'],
  ['.lx-ask-label',              'color', 'background', 4.5, 'rótulo de bloco'],
  ['.lx-analogy-label',          'color', 'background', 4.5, 'rótulo da analogia'],
  ['.lx-muted',                  'color', 'background', 4.5, 'texto muted'],
  ['.lx-subtle',                 'color', 'background', 3.0, 'texto subtle'],
  ['.lx-lang',                   'color', 'background', 4.5, 'select de idioma'],
  ['.lx-code',                   'color', 'background', 4.5, 'código inline'],
  ['.lx-callout-text',           'color', 'background', 4.5, 'texto de callout'],
  ['.lx-flash summary',          'color', 'background', 4.5, 'frente do flashcard'],
  ['.lx-gate-lock-text',         'color', 'background', 4.5, 'texto do cadeado'],
  ['.lx-settings-opt',           'color', 'background', 4.5, 'opção de configuração'],
  ['.lx-settings-label',         'color', 'background', 3.0, 'rótulo de configuração'],
  ['.lx-topbar-home',            'color', 'background', 4.5, 'link home']
];

const parse = c => {
  const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
  return m ? { rgb: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4] } : null;
};
const lum = ([r, g, b]) => [r, g, b].map(c => {
  c /= 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}).reduce((s, v, i) => s + [0.2126, 0.7152, 0.0722][i] * v, 0);
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const over = (fg, alpha, bg) => fg.map((v, i) => Math.round(v * alpha + bg[i] * (1 - alpha)));

async function audit(url, accent, theme) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ colorScheme: theme === 'dark' ? 'dark' : 'light' });
  await page.goto(url, { waitUntil: 'networkidle' });

  await page.evaluate(([a, t]) => {
    const d = document.documentElement;
    if (a === 'azul') d.removeAttribute('data-accent'); else d.setAttribute('data-accent', a);
    if (t === 'auto') d.removeAttribute('data-theme'); else d.setAttribute('data-theme', t);
  }, [accent, theme]);
  await page.waitForTimeout(300);

  // The effective background of an element is the first opaque thing behind it,
  // so translucent layers are composited down until one is solid.
  const measured = await page.evaluate((specs) => {
    const out = [];
    for (const [sel, , , min, label] of specs) {
      const base = sel.replace(/::.*$/, '');
      const el = document.querySelector(base);
      if (!el) { out.push({ label, sel, missing: true }); continue; }
      const cs = sel.includes('::placeholder')
        ? getComputedStyle(el, '::placeholder')
        : getComputedStyle(el);
      const stack = [];
      let node = el;
      while (node && node !== document.documentElement.parentNode) {
        stack.push(getComputedStyle(node).backgroundColor);
        node = node.parentElement;
      }
      out.push({ label, sel, min, color: cs.color, stack });
    }
    return out;
  }, PAIRS);

  await browser.close();

  const rows = [];
  for (const m of measured) {
    if (m.missing) { rows.push({ ...m }); continue; }
    const fg = parse(m.color);
    // Composite outermost-first: the base is the furthest ancestor with an
    // opaque colour, and every translucent layer above it paints on top.
    // Walking element-first and stopping at the first opaque colour reports the
    // element's own background as the base, which is exactly backwards.
    let base = m.stack.length - 1;
    for (let i = m.stack.length - 1; i >= 0; i--) {
      const p = parse(m.stack[i]);
      if (p && p.a === 1) { base = i; break; }
    }
    let bg = [255, 255, 255];
    for (let i = base; i >= 0; i--) {
      const p = parse(m.stack[i]);
      if (!p || p.a === 0) continue;
      bg = p.a === 1 ? p.rgb : over(p.rgb, p.a, bg);
    }
    const colour = fg.a < 1 ? over(fg.rgb, fg.a, bg) : fg.rgb;
    rows.push({ ...m, ratio: contrast(colour, bg), fg: colour, bg });
  }
  return rows;
}

async function main() {
  const [url, accent = 'azul', theme = 'dark'] = process.argv.slice(2);
  if (!url) { console.error('usage: node build/audit-theme.js <url> [accent] [theme]'); process.exit(2); }

  const rows = await audit(url, accent, theme);
  console.log(`\n${accent} · ${theme}   ${url}\n`);
  let fails = 0;
  for (const r of rows) {
    if (r.missing) { console.log(`  ${'—'.padStart(8)}  ${r.label}  (ausente nesta página)`); continue; }
    const ok = r.ratio >= r.min;
    if (!ok) fails++;
    console.log(`  ${r.ratio.toFixed(2).padStart(6)}:1  ${r.label.padEnd(26)}${ok ? '' : `✗ mínimo ${r.min}   fg rgb(${r.fg}) sobre rgb(${r.bg})`}`);
  }
  console.log(`\n  ${fails ? `${fails} REPROVAM` : 'todos passam'}\n`);
  process.exitCode = fails ? 1 : 0;
}

if (require.main === module) main();
module.exports = { audit };
