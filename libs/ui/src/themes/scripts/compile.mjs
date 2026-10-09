// Compiler for the documented DTCG subset used by Petal; no external dependencies.
const reference = /^\{([^{}]+)\}$/;
const supported = new Set(['color', 'dimension', 'fontFamily', 'fontWeight', 'number', 'duration', 'cubicBezier', 'typography']);
const own = (object, key) => Object.hasOwn(object, key);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = (path, message) => { throw new Error(`${path}: ${message}`); };

export function resolveTheme(source) {
  const definitions = new Map();
  function collect(group, segments = [], inheritedType) {
    if (!object(group)) fail(segments.join('.'), 'expected a token group');
    if (own(group, '$ref') || own(group, '$extends')) fail(segments.join('.'), 'JSON Pointer/group inheritance is outside the Petal compiler subset');
    for (const [name, entry] of Object.entries(group)) {
      if (name.startsWith('$')) continue;
      if (/[.{}]/.test(name)) fail(name, 'invalid token name');
      if (['__proto__', 'constructor', 'prototype'].includes(name)) fail(name, 'unsafe export key');
      const path = [...segments, name].join('.');
      if (!object(entry)) fail(path, 'expected a token or group');
      if (own(entry, '$value')) {
        const type = entry.$type ?? group.$type ?? inheritedType;
        if (!supported.has(type)) fail(path, `unsupported or missing token type ${type}`);
        definitions.set(path, { type, raw: entry.$value });
      } else collect(entry, [...segments, name], group.$type ?? inheritedType);
    }
  }
  collect(source);
  const resolved = new Map();
  function visit(path, stack = []) {
    if (stack.includes(path)) fail(path, `circular reference: ${[...stack, path].join(' -> ')}`);
    if (resolved.has(path)) return resolved.get(path);
    const definition = definitions.get(path);
    if (!definition) fail(path, 'missing reference');
    const next = [...stack, path];
    function valueOf(value) {
      if (typeof value === 'string' && reference.test(value)) return visit(value.match(reference)[1], next).value;
      if (Array.isArray(value)) return value.map(valueOf);
      if (object(value)) {
        if (own(value, '$ref')) fail(path, 'JSON Pointer references are outside the Petal compiler subset');
        return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, valueOf(child)]));
      }
      return value;
    }
    if (typeof definition.raw === 'string' && reference.test(definition.raw)) {
      const target = visit(definition.raw.match(reference)[1], next);
      if (target.type !== definition.type) fail(path, `alias type ${definition.type} differs from ${target.type}`);
    }
    if (definition.type === 'typography' && object(definition.raw)) {
      for (const [key, expected] of Object.entries({fontFamily:'fontFamily', fontSize:'dimension', fontWeight:'fontWeight', letterSpacing:'dimension', lineHeight:'number'})) {
        const raw = definition.raw[key];
        if (typeof raw === 'string' && reference.test(raw) && visit(raw.match(reference)[1], next).type !== expected) fail(path + '.' + key, `reference requires ${expected}`);
      }
    }
    const value = valueOf(definition.raw);
    validate(definition.type, value, path);
    const entry = { ...definition, value };
    resolved.set(path, entry);
    return entry;
  }
  for (const path of definitions.keys()) visit(path);
  // Preserve authored order, independent of resolution traversal.
  return new Map([...definitions.keys()].map(path => [path, resolved.get(path)]));
}

function validate(type, value, path) {
  const expect = (condition, message) => { if (!condition) fail(path, message); };
  switch (type) {
    case 'color': {
      expect(object(value) && value.colorSpace === 'srgb', 'expected an sRGB color');
      expect(Array.isArray(value.components) && value.components.length === 3 && value.components.every(n => finite(n) && n >= 0 && n <= 1), 'invalid color components');
      expect(value.alpha === undefined || (finite(value.alpha) && value.alpha >= 0 && value.alpha <= 1), 'invalid alpha');
      expect(/^#[0-9a-f]{6}$/i.test(value.hex), 'Petal colors require a six-digit fallback hex');
      const hex = '#' + value.components.map(n => Math.round(n * 255).toString(16).padStart(2, '0')).join('');
      expect(hex.toLowerCase() === value.hex.toLowerCase(), 'hex and color components disagree');
      break;
    }
    case 'dimension': expect(object(value) && finite(value.value) && value.value >= 0 && ['px', 'rem'].includes(value.unit), 'invalid nonnegative dimension'); break;
    case 'duration': expect(object(value) && finite(value.value) && value.value >= 0 && ['ms', 's'].includes(value.unit), 'invalid duration'); break;
    case 'number': expect(finite(value), 'invalid number'); break;
    case 'fontWeight': expect(finite(value) && value >= 1 && value <= 1000, 'Petal weights must be numeric from 1 to 1000'); break;
    case 'fontFamily': expect((typeof value === 'string' && value.length > 0) || (Array.isArray(value) && value.length > 0 && value.every(n => typeof n === 'string' && n.length > 0)), 'invalid font family'); break;
    case 'cubicBezier': expect(Array.isArray(value) && value.length === 4 && value.every(finite) && value[0] >= 0 && value[0] <= 1 && value[2] >= 0 && value[2] <= 1, 'invalid cubic Bezier'); break;
    case 'typography': {
      expect(object(value), 'expected typography fields');
      for (const [key, fieldType] of Object.entries({fontFamily:'fontFamily', fontSize:'dimension', fontWeight:'fontWeight', letterSpacing:'dimension', lineHeight:'number'})) validate(fieldType, value[key], `${path}.${key}`);
      expect(value.fontSize.value > 0 && value.lineHeight >= 1, 'typography must have positive size and line-height at least 1');
      break;
    }
  }
}

export const cssName = path => '--petal-' + path.replace(/^semantic\./, '').replaceAll('.', '-').replace(/[A-Z]/g, n => '-' + n.toLowerCase());
const pixels = value => value.value * (value.unit === 'rem' ? 16 : 1);
const milliseconds = value => value.value * (value.unit === 's' ? 1000 : 1);
const number = value => Number(value.toFixed(6));
const color = value => (value.alpha ?? 1) === 1 ? value.hex : `rgba(${value.components.map(n => Math.round(n * 255)).join(', ')}, ${value.alpha})`;
function runtimeValue(type, value, native) {
  switch (type) {
    case 'color': return color(value);
    case 'dimension': return pixels(value);
    case 'duration': return milliseconds(value);
    case 'fontWeight': return native ? String(value) : value;
    case 'fontFamily': return native && Array.isArray(value) ? value[0] : value;
    case 'typography': return {
      fontFamily: runtimeValue('fontFamily', value.fontFamily, native),
      fontSize: pixels(value.fontSize), fontWeight: native ? String(value.fontWeight) : value.fontWeight,
      letterSpacing: pixels(value.letterSpacing), lineHeight: native ? number(pixels(value.fontSize) * value.lineHeight) : value.lineHeight
    };
    default: return value;
  }
}
function tree(entries, native) {
  const result = {};
  for (const [path, entry] of entries) {
    const segments = path.split('.'); let parent = result;
    for (const key of segments.slice(0, -1)) parent = parent[key] ??= {};
    parent[segments.at(-1)] = runtimeValue(entry.type, entry.value, native);
  }
  return result;
}
function cssScalar(type, value, path) {
  switch (type) {
    case 'color': return color(value);
    case 'dimension': return /(?:border|focus|letterSpacing|strokeWidth)/.test(path) ? `${pixels(value)}px` : `${number(pixels(value) / 16)}rem`;
    case 'duration': return `${milliseconds(value)}ms`;
    case 'fontFamily': return (Array.isArray(value) ? value : [value]).map(n => n === 'monospace' || n === 'sans-serif' ? n : JSON.stringify(n)).join(', ');
    case 'cubicBezier': return `cubic-bezier(${value.join(', ')})`;
    default: return String(value);
  }
}
function declaration(value, indent = '', segments = [], durationPaths = new Set()) {
  if (durationPaths.has(segments.join('.'))) return 'number';
  if (Array.isArray(value)) return `readonly [${value.map(v => declaration(v)).join(', ')}]`;
  if (object(value)) return `{\n${Object.entries(value).map(([key, val]) => `${indent}  readonly ${JSON.stringify(key)}: ${declaration(val, indent + '  ', [...segments, key], durationPaths)};`).join('\n')}\n${indent}}`;
  return JSON.stringify(value);
}
function moduleText(name, data, metadata, durationPaths) {
  return `// Generated from petal.tokens.json. Do not edit.\nconst freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };\nexport const ${name} = freeze(${JSON.stringify(data, null, 2)});\nexport const petalThemeMetadata = freeze(${JSON.stringify(metadata)});\nexport function ${name === 'petalTheme' ? 'getPetalTheme' : 'getPetalNativeTheme'}({ reduceMotion = false } = {}) {\n  if (!reduceMotion) return ${name};\n  const theme = JSON.parse(JSON.stringify(${name}));\n  for (const segments of ${JSON.stringify(durationPaths.map(p => p.split('.')))}) {\n    let parent = theme;\n    for (const key of segments.slice(0, -1)) parent = parent[key];\n    parent[segments.at(-1)] = 0;\n  }\n  return freeze(theme);\n}\n`;
}
export function compileTheme(source) {
  const entries = resolveTheme(source);
  const names = new Set();
  const lines = [];
  const add = (path, value) => { const name = cssName(path); if (names.has(name)) fail(path, 'CSS token name collision'); names.add(name); lines.push(`  ${name}: ${value};`); };
  for (const [path, {type, raw, value}] of entries) {
    const target = typeof raw === 'string' ? raw.match(reference)?.[1] : undefined;
    if (type === 'typography') {
      for (const [key, fieldType] of Object.entries({fontFamily:'fontFamily', fontSize:'dimension', fontWeight:'fontWeight', letterSpacing:'dimension', lineHeight:'number'})) {
        const fieldReference = !target && typeof raw[key] === 'string' ? raw[key].match(reference)?.[1] : undefined;
        add(path + '.' + key, target ? `var(${cssName(target + '.' + key)})` : fieldReference ? `var(${cssName(fieldReference)})` : cssScalar(fieldType, value[key], path + '.' + key));
      }
    } else add(path, target ? `var(${cssName(target)})` : cssScalar(type, value, path));
  }
  const durations = [...entries].filter(([,e]) => e.type === 'duration').map(([path]) => path);
  const css = `/* Generated from petal.tokens.json. No reset or font download. */\n:root, [data-petal-theme="light"] {\n${lines.join('\n')}\n}\n\n@media (prefers-reduced-motion: reduce) {\n  :root, [data-petal-theme="light"] {\n${durations.map(p => `    ${cssName(p)}: 0ms;`).join('\n')}\n  }\n}\n`;
  const metadata = source.$extensions?.['org.petal'];
  if (!metadata?.version || metadata.appearance !== 'light') throw new Error('Petal metadata requires a version and supported light appearance');
  const web = tree(entries, false), native = tree(entries, true);
  const files = { 'theme.css': css };
  for (const [stem, name, data, getter] of [['theme','petalTheme',web,'getPetalTheme'],['native-theme','petalNativeTheme',native,'getPetalNativeTheme']]) {
    files[stem + '.mjs'] = moduleText(name, data, metadata, durations);
    files[stem + '.d.mts'] = `// Generated from petal.tokens.json. Do not edit.\nexport declare const ${name}: ${declaration(data, '', [], new Set(durations))};\nexport type ${name === 'petalTheme' ? 'PetalTheme' : 'PetalNativeTheme'} = typeof ${name};\nexport declare const petalThemeMetadata: ${declaration(metadata)};\nexport declare function ${getter}(options?: { reduceMotion?: boolean }): typeof ${name};\n`;
  }
  return { files, entries, web, native };
}
