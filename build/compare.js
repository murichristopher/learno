#!/usr/bin/env node
//
// Measures what the pipeline actually bought, against hand-written lessons.
//
//   node build/compare.js <hand-written.html>... --against <lesson-base>
//
// The number that matters is **authored bytes**: what a model has to emit to
// produce one lesson. Rendered size is a distant second — it is paid once by a
// reader on a fast link, whereas authored size is paid on every generation, in
// latency and in cost.
//
// A hand-written lesson is split the same way the original measurement was, so
// the comparison is like for like rather than flattering.

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function splitHandwritten(html) {
  const styles  = (html.match(/<style[^>]*>[\s\S]*?<\/style>/g)   || []).join('');
  const scripts = (html.match(/<script[^>]*>[\s\S]*?<\/script>/g) || []).join('');
  const svg     = (html.match(/<svg[\s\S]*?<\/svg>/g)             || []).join('');
  const rest    = html.length - styles.length - scripts.length - svg.length;

  // Visible text, so "prose" means prose and not the tags around it.
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    total:   html.length,
    css:     styles.length,
    js:      scripts.length,
    svg:     svg.length,
    tags:    rest - text.length,
    prose:   text.length,
    authored: html.length     // all of it was typed by the model
  };
}

function splitPipeline(base) {
  const json = fs.readFileSync(`${base}.json`, 'utf8');
  const yml  = fs.readFileSync(`${base}.yml`,  'utf8');
  const html = fs.readFileSync(`${base}.html`, 'utf8');
  const svg  = (yml.match(/<svg[\s\S]*?<\/svg>/g) || []).join('');

  return {
    json:     json.length,
    yml:      yml.length,
    svg:      svg.length,
    prose:    yml.length - svg.length,
    rendered: html.length,
    authored: json.length + yml.length   // the model writes these two, nothing else
  };
}

const K = n => `${(n / 1024).toFixed(1)}K`;
const pct = (a, b) => `${((a / b) * 100).toFixed(0)}%`;

function main(argv) {
  const at = argv.indexOf('--against');
  if (at < 1) {
    console.error('usage: node build/compare.js <hand-written.html>... --against <lesson-base>');
    process.exit(2);
  }
  const handFiles = argv.slice(0, at);
  const base      = path.resolve(ROOT, argv[at + 1]);

  const hand = handFiles.map(f => ({ name: path.basename(f), ...splitHandwritten(fs.readFileSync(f, 'utf8')) }));
  const avg  = k => hand.reduce((s, h) => s + h[k], 0) / hand.length;

  console.log(`\nHand-written lessons (${hand.length}), averaged\n`);
  console.log(`  CSS + JS          ${K(avg('css') + avg('js')).padStart(7)}  ${pct(avg('css') + avg('js'), avg('total')).padStart(4)}   identical in every file`);
  console.log(`  structural tags   ${K(avg('tags')).padStart(7)}  ${pct(avg('tags'), avg('total')).padStart(4)}`);
  console.log(`  SVG               ${K(avg('svg')).padStart(7)}  ${pct(avg('svg'), avg('total')).padStart(4)}`);
  console.log(`  prose             ${K(avg('prose')).padStart(7)}  ${pct(avg('prose'), avg('total')).padStart(4)}   the irreducible part`);
  console.log(`  ${'—'.repeat(46)}`);
  console.log(`  authored per lesson ${K(avg('authored')).padStart(6)}`);

  const p = splitPipeline(base);
  console.log(`\nPipeline — ${path.relative(ROOT, base)}\n`);
  console.log(`  .json (structure) ${K(p.json).padStart(7)}`);
  console.log(`  .yml  prose       ${K(p.prose).padStart(7)}`);
  console.log(`  .yml  SVG         ${K(p.svg).padStart(7)}`);
  console.log(`  ${'—'.repeat(46)}`);
  console.log(`  authored per lesson ${K(p.authored).padStart(6)}`);
  console.log(`  rendered            ${K(p.rendered).padStart(6)}   linked assets, not inlined`);

  // Raw totals are confounded by how much lesson was written. A longer lesson
  // authors more bytes in ANY format, so comparing totals across two different
  // lessons flatters or punishes the format for something it did not cause.
  //
  // The honest measure is overhead: bytes of machinery per byte of content,
  // where content is prose plus diagrams — the part a human actually decided.
  const handContent   = avg('prose') + avg('svg');
  const handMachinery = avg('authored') - handContent;
  const pipeContent   = p.prose + p.svg;
  const pipeMachinery = p.authored - pipeContent;

  console.log(`\nRaw totals — NOT comparable unless both lessons are the same length\n`);
  console.log(`  authored  ${K(avg('authored'))} → ${K(p.authored)}`);
  console.log(`  rendered  ${K(avg('total'))} → ${K(p.rendered)}`);
  console.log(`  content   ${K(handContent)} → ${K(pipeContent)}   ${(pipeContent / handContent).toFixed(1)}× — this lesson is simply ${pipeContent > handContent ? 'longer' : 'shorter'}`);

  console.log(`\nOverhead — what the format costs, normalised for length\n`);
  console.log(`  hand-written  ${K(handMachinery)} of machinery per ${K(handContent)} of content   ${(handMachinery / handContent).toFixed(2)} bytes per byte`);
  console.log(`  pipeline      ${K(pipeMachinery)} of machinery per ${K(pipeContent)} of content   ${(pipeMachinery / pipeContent).toFixed(2)} bytes per byte`);
  console.log(`\n  overhead ${pct(handMachinery, avg('authored'))} → ${pct(pipeMachinery, p.authored)} of what gets authored` +
              `   (${((handMachinery / handContent) / (pipeMachinery / pipeContent)).toFixed(1)}× less machinery)\n`);

  console.log(`  Content itself does not shrink and was never going to: ${K(p.prose)} of prose`);
  console.log(`  because someone has to write the lesson, ${K(p.svg)} of SVG because diagrams`);
  console.log(`  stay hand-drawn by choice. Only the ${K(pipeMachinery)} around it is the format's doing.\n`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { splitHandwritten, splitPipeline };
