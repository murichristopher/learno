// Bounds-checking for hand-written diagrams, run as part of the `svg` prop type.
//
// Text *width* is out of scope on purpose: measuring a rendered label needs a
// font and a layout engine, so a long label spilling out of its box still gets
// through. Everything here is arithmetic on the coordinates the author wrote.

// Text baselines and stroke widths legitimately sit a unit or two off an edge.
const EDGE_TOLERANCE = 2;
// Rects that merely share an edge are not overlapping.
const OVERLAP_TOLERANCE = 1;

const SHAPES = ['rect', 'circle', 'text', 'path'];

// Attributes worth echoing back, so the author can find the element by search.
const HANDLE = {
  rect:   ['x', 'y', 'width', 'height'],
  circle: ['cx', 'cy', 'r'],
  text:   ['x', 'y'],
  path:   ['d']
};

// ── attributes ────────────────────────────────────────────────────────────

function attr(attrs, name) {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`));
  return m ? m[1] : null;
}

function num(attrs, name) {
  const n = parseFloat(attr(attrs, name));
  return Number.isFinite(n) ? n : 0;
}

const round = n => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const clip  = s => (s.length > 44 ? `${s.slice(0, 41).trimEnd()}…` : s);

function describe(el) {
  const parts = HANDLE[el.tag]
    .map(name => (attr(el.attrs, name) === null ? null : `${name}="${clip(attr(el.attrs, name))}"`))
    .filter(Boolean);
  const label = el.text ? ` "${clip(el.text)}"` : '';
  return `<${el.tag}${parts.length ? ` ${parts.join(' ')}` : ''}>${label}`;
}

// ── path data ─────────────────────────────────────────────────────────────

const ARITY = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };

// Every point the pen visits, plus the control points of curves — close enough
// to a curve's real extent for a bounds check, and it needs no curve maths.
function pathPoints(d) {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g) || [];
  const points = [];
  let i = 0, cmd = null, x = 0, y = 0, startX = 0, startY = 0;

  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++];
    if (!cmd) break;

    const upper = cmd.toUpperCase();
    const arity = ARITY[upper];
    if (arity === undefined) break;

    if (arity === 0) { x = startX; y = startY; continue; }

    const args = tokens.slice(i, i + arity).map(Number);
    if (args.length < arity || args.some(n => !Number.isFinite(n))) break;
    i += arity;

    const relative = cmd !== upper;
    if (upper === 'H') {
      x = relative ? x + args[0] : args[0];
      points.push([x, y]);
    } else if (upper === 'V') {
      y = relative ? y + args[0] : args[0];
      points.push([x, y]);
    } else if (upper === 'A') { // rx ry rotation large-arc sweep x y — only the endpoint matters
      x = relative ? x + args[5] : args[5];
      y = relative ? y + args[6] : args[6];
      points.push([x, y]);
    } else {
      // Every pair is relative to the point the command started from, so read
      // them all before moving the pen.
      for (let k = 0; k + 1 < arity; k += 2) {
        points.push([relative ? x + args[k] : args[k], relative ? y + args[k + 1] : args[k + 1]]);
      }
      [x, y] = points[points.length - 1];
    }

    if (upper === 'M') { startX = x; startY = y; cmd = relative ? 'l' : 'L'; }
  }
  return points;
}

// ── shapes ────────────────────────────────────────────────────────────────

const box = (x0, y0, x1, y1) => ({
  x0: Math.min(x0, x1), y0: Math.min(y0, y1),
  x1: Math.max(x0, x1), y1: Math.max(y0, y1)
});

function bboxOf(el) {
  const a = el.attrs;
  if (el.tag === 'rect')   return box(num(a, 'x'), num(a, 'y'), num(a, 'x') + num(a, 'width'), num(a, 'y') + num(a, 'height'));
  if (el.tag === 'circle') return box(num(a, 'cx') - num(a, 'r'), num(a, 'cy') - num(a, 'r'), num(a, 'cx') + num(a, 'r'), num(a, 'cy') + num(a, 'r'));
  if (el.tag === 'text')   return box(num(a, 'x'), num(a, 'y'), num(a, 'x'), num(a, 'y'));

  const points = pathPoints(attr(a, 'd') || '');
  if (!points.length) return null;
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  return box(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
}

function elements(svg) {
  const found = [];
  for (const m of svg.matchAll(new RegExp(`<(${SHAPES.join('|')})\\b([^>]*?)/?>`, 'g'))) {
    const el = { tag: m[1], attrs: m[2], text: '' };
    if (el.tag === 'text' && !m[0].endsWith('/>')) {
      const rest = svg.slice(m.index + m[0].length);
      el.text = rest.slice(0, rest.indexOf('<')).replace(/\s+/g, ' ').trim();
    }
    found.push(el);
  }
  return found;
}

function parseViewBox(raw) {
  if (!raw) return null;
  const n = raw.trim().split(/[\s,]+/).map(Number);
  if (n.length !== 4 || n.some(v => !Number.isFinite(v)) || n[2] <= 0 || n[3] <= 0) return null;
  return { raw: raw.trim(), minX: n[0], minY: n[1], maxX: n[0] + n[2], maxY: n[1] + n[3] };
}

// ── public ────────────────────────────────────────────────────────────────

// Returns a list of {level, message}, same shape the prop checker speaks.
function checkGeometry(svg) {
  const root = svg.match(/<svg\b([^>]*)>/);
  if (!root) {
    return [{ level: 'error', message: 'no root <svg> element — a diagram is a single <svg> carrying a viewBox' }];
  }

  const view = parseViewBox(attr(root[1], 'viewBox'));
  if (!view) {
    return [{ level: 'error', message:
      'the root <svg> has no usable viewBox, so nothing in it can be bounds-checked. ' +
      '→ add viewBox="0 0 <width> <height>"' }];
  }

  const found = [];
  const rects = [];

  for (const el of elements(svg)) {
    const b = bboxOf(el);
    if (!b) continue;
    if (el.tag === 'rect') rects.push({ el, b });

    const out = [];
    if (b.x0 < view.minX - EDGE_TOLERANCE) out.push(`x reaches ${round(b.x0)}, left of ${round(view.minX)}`);
    if (b.x1 > view.maxX + EDGE_TOLERANCE) out.push(`x reaches ${round(b.x1)}, past ${round(view.maxX)}`);
    if (b.y0 < view.minY - EDGE_TOLERANCE) out.push(`y reaches ${round(b.y0)}, above ${round(view.minY)}`);
    if (b.y1 > view.maxY + EDGE_TOLERANCE) out.push(`y reaches ${round(b.y1)}, past ${round(view.maxY)}`);

    if (out.length) {
      found.push({ level: 'error', message:
        `${describe(el)} falls outside the viewBox "${view.raw}" — ${out.join('; ')}. ` +
        '→ move the element inside, or widen the viewBox.' });
    }
  }

  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const w = Math.min(rects[i].b.x1, rects[j].b.x1) - Math.max(rects[i].b.x0, rects[j].b.x0);
      const h = Math.min(rects[i].b.y1, rects[j].b.y1) - Math.max(rects[i].b.y0, rects[j].b.y0);
      if (w > OVERLAP_TOLERANCE && h > OVERLAP_TOLERANCE) {
        found.push({ level: 'warn', message:
          `${describe(rects[i].el)} and ${describe(rects[j].el)} overlap by ${round(w)}×${round(h)}. ` +
          '→ stacking on purpose is fine; otherwise one of them is misplaced.' });
      }
    }
  }

  return found;
}

module.exports = { checkGeometry, pathPoints, EDGE_TOLERANCE };
