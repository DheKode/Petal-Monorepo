import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileTheme } from './compile.mjs';
import { createPreview } from './preview.mjs';

const source = JSON.parse(await readFile(new URL('../petal.tokens.json', import.meta.url), 'utf8'));
const compiled = compileTheme(source);
const html = await createPreview(source, compiled);
const committedPreview = await readFile(new URL('../../../preview.html', import.meta.url), 'utf8');

test('preview includes every canonical token once and embeds all rendering resources', () => {
  const paths = [...html.matchAll(/data-token="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(paths, [...compiled.entries.keys()]);
  assert.match(html, /src="data:image\/svg\+xml;base64,/);
  assert.match(html, /url\("data:font\/woff2;base64,/);
  assert.doesNotMatch(html, /(?:src|href)="https?:|@import|fetch\(/);
  assert.equal(html, committedPreview);
});

test('every shared and preview CSS variable resolves to a generated token', () => {
  const declared = new Set([...compiled.files['theme.css'].matchAll(/(--petal-[a-z0-9-]+):/g)].map(match => match[1]));
  for (const match of html.matchAll(/var\((--petal-[a-z0-9-]+)/g)) assert(declared.has(match[1]), `Undeclared CSS token ${match[1]}`);
});

test('editing the canonical color changes preview specimens and exports together', async () => {
  const edited = structuredClone(source);
  edited.primitive.color.rose.$value = { colorSpace:'srgb', components:[0,0,0], hex:'#000000' };
  const changed = await createPreview(edited, compileTheme(edited));
  assert.match(changed, /style="background:#000000"/);
  assert.doesNotMatch(changed, /#B83D70/);
  // Source descriptions are displayed as text, never interpreted as HTML.
  edited.primitive.color.rose.$description = '<script>alert(1)</script>';
  const safe = await createPreview(edited, compileTheme(edited));
  assert.match(safe, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(safe, /<script>alert\(1\)/);
});
