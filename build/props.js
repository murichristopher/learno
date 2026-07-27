// Prop validation, shared by the lesson build and the component catalog.
//
// meta.props maps a prop name to a type. A trailing ? marks it optional. The
// `svg` type additionally enforces that a diagram carries no colours of its own,
// which is what keeps a hand-authored SVG inside the design system.

const COLOUR_IN_SVG = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\sfill="(?!none")|\sstroke="/;

function checkType(value, type) {
  switch (type) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number';
    case 'bool':   return typeof value === 'boolean';
    case 'array':  return Array.isArray(value);
    case 'object': return value != null && typeof value === 'object' && !Array.isArray(value);
    case 'svg':    return typeof value === 'string';
    default:       throw new Error(`unknown prop type "${type}" in a component's meta.props`);
  }
}

// Returns a list of {level, message}; the caller decides how to report them.
function validateProps(component, props) {
  const spec  = component.meta.props || {};
  const found = [];

  for (const [name, rawType] of Object.entries(spec)) {
    const optional = rawType.endsWith('?');
    const type     = optional ? rawType.slice(0, -1) : rawType;
    const value    = props[name];

    if (value === undefined || value === null) {
      if (!optional) found.push({ level: 'error', message: `prop "${name}" is required (${type})` });
      continue;
    }
    if (!checkType(value, type)) {
      found.push({ level: 'error', message: `prop "${name}" should be ${type}, got ${Array.isArray(value) ? 'array' : typeof value}` });
      continue;
    }
    if (type === 'svg' && COLOUR_IN_SVG.test(value)) {
      const bad = value.match(COLOUR_IN_SVG)[0].trim();
      found.push({ level: 'error', message:
        `svg prop "${name}" carries its own colour (${bad}). Diagrams use the design system classes — ` +
        `.lx-node, .lx-edge, .lx-label — so they follow the theme. See assets/learno.css.` });
    }
  }

  for (const name of Object.keys(props)) {
    if (!(name in spec)) {
      found.push({ level: 'warn', message: `prop "${name}" is not declared by the "${component.meta.name}" component and will be ignored` });
    }
  }

  return found;
}

module.exports = { validateProps, checkType, COLOUR_IN_SVG };
