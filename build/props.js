// Prop validation, shared by the lesson build and the component catalog.
//
// A type is one of:
//
//   string  number  bool  svg          scalars
//   array                               any array (avoid — see below)
//   array<T>                            array whose every element is T
//   object                              any object (avoid)
//   {a: T, b: T?}                       object with exactly these fields
//   T?                                  optional
//
// The shapes matter more than they look. A prop typed `array` accepts
// `[1,2,3]`, `[{label,isCorrect}]` and `[{text,correct}]` alike, so an author
// guessing the element shape wrong gets a lesson that builds cleanly and is
// silently broken — a quiz where no option is correct, a flashcard with blank
// faces. Documentation cannot fix that, because the failure is invisible at the
// point where documentation is read. `array<{text: string, correct: bool}>`
// turns the guess into a build error naming the missing field.
//
// The `svg` type additionally enforces that a diagram carries no colours of its
// own, which is what keeps a hand-authored SVG inside the design system.

const COLOUR_IN_SVG = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\sfill="(?!none")|\sstroke="/;

const SCALARS = {
  string: v => typeof v === 'string',
  number: v => typeof v === 'number',
  bool:   v => typeof v === 'boolean',
  svg:    v => typeof v === 'string'
};

// ── type parsing ──────────────────────────────────────────────────────────

function splitFields(body) {
  // Split on commas that are not inside <> or {}.
  const out = [];
  let depth = 0, current = '';
  for (const ch of body) {
    if (ch === '<' || ch === '{') depth++;
    if (ch === '>' || ch === '}') depth--;
    if (ch === ',' && depth === 0) { out.push(current); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) out.push(current);
  return out.map(s => s.trim()).filter(Boolean);
}

function parseType(raw) {
  let src = String(raw).trim();
  let optional = false;

  if (src.endsWith('?')) { optional = true; src = src.slice(0, -1).trim(); }

  if (src.startsWith('{') && src.endsWith('}')) {
    const fields = {};
    for (const field of splitFields(src.slice(1, -1))) {
      const at = field.indexOf(':');
      if (at < 0) throw new Error(`malformed object field "${field}" in type "${raw}"`);
      fields[field.slice(0, at).trim()] = parseType(field.slice(at + 1));
    }
    return { kind: 'object', fields, optional };
  }

  const arr = src.match(/^array<(.+)>$/);
  if (arr) return { kind: 'array', of: parseType(arr[1]), optional };

  if (src === 'array')  return { kind: 'array',  of: null, optional };
  if (src === 'object') return { kind: 'object', fields: null, optional };
  if (SCALARS[src])     return { kind: 'scalar', name: src, optional };

  throw new Error(`unknown prop type "${src}"`);
}

// ── value checking ────────────────────────────────────────────────────────

function describe(v) {
  if (Array.isArray(v)) return 'array';
  if (v === null) return 'null';
  return typeof v;
}

// Returns [] when the value fits, or a list of messages describing where it
// does not. `path` is threaded through so a bad element names its index.
function checkValue(value, type, path) {
  if (value === undefined || value === null) {
    return type.optional ? [] : [`${path} is required`];
  }

  if (type.kind === 'scalar') {
    if (!SCALARS[type.name](value)) return [`${path} should be ${type.name}, got ${describe(value)}`];
    if (type.name === 'svg' && COLOUR_IN_SVG.test(value)) {
      const bad = value.match(COLOUR_IN_SVG)[0].trim();
      return [`${path} carries its own colour (${bad}). Diagrams use the design system classes — ` +
              `.lx-node, .lx-edge, .lx-label — so they follow the theme. See assets/learno.css.`];
    }
    return [];
  }

  if (type.kind === 'array') {
    if (!Array.isArray(value)) return [`${path} should be array, got ${describe(value)}`];
    if (!type.of) return [];
    return value.flatMap((el, i) => checkValue(el, type.of, `${path}[${i}]`));
  }

  // object
  if (describe(value) !== 'object') return [`${path} should be object, got ${describe(value)}`];
  if (!type.fields) return [];

  const found = [];
  for (const [name, fieldType] of Object.entries(type.fields)) {
    found.push(...checkValue(value[name], fieldType, `${path}.${name}`));
  }
  for (const name of Object.keys(value)) {
    if (!(name in type.fields)) found.push(`${path}.${name} is not part of this shape and will be ignored`);
  }
  return found;
}

// ── public ────────────────────────────────────────────────────────────────

// Returns a list of {level, message}; the caller decides how to report them.
function validateProps(component, props) {
  const spec  = component.meta.props || {};
  const found = [];

  for (const [name, raw] of Object.entries(spec)) {
    let type;
    try { type = parseType(raw); }
    catch (err) {
      found.push({ level: 'error', message: `${component.meta.name}: ${err.message} (in meta.props.${name})` });
      continue;
    }
    for (const message of checkValue(props[name], type, `prop "${name}"`)) {
      // An extra field is a warning: it is usually a typo, but it renders fine.
      const level = /is not part of this shape/.test(message) ? 'warn' : 'error';
      found.push({ level, message });
    }
  }

  for (const name of Object.keys(props)) {
    if (!(name in spec)) {
      found.push({ level: 'warn', message: `prop "${name}" is not declared by the "${component.meta.name}" component and will be ignored` });
    }
  }

  return found;
}

module.exports = { validateProps, parseType, checkValue, COLOUR_IN_SVG };
