import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharpIndex = process.argv.indexOf('--sharp');
const sharp = require(sharpIndex >= 0 ? process.argv[sharpIndex + 1] : 'sharp');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = async file => JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
const master = await json('source/petal-logo-master.json');
const previous = await json('source/archive/petal-logo-master-v1.json');
const checksums = await json('source/archive/wordmark-checksums-v1.json');
const manifest = await json('manifest.json');
assert.deepEqual(master.wordmark, previous.wordmark, 'The complete wordmark source must stay unchanged.');
assert.equal(master.version, 2);
assert.equal(manifest.version, 2);
assert.deepEqual(manifest.layout, master.layout);
assert.deepEqual(master.layout.horizontal, { order: 'wordmark-symbol', gap: 34, symbolTop: 10 });
assert.equal(master.symbol.height, 220);
assert.equal(master.symbol.paths.length, 1);
assert.equal(checksums.assets.length, 8);
for (const asset of checksums.assets) {
  const bytes = await fs.readFile(path.join(root, asset.path));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, 'Changed wordmark file: ' + asset.path);
}
assert.equal(manifest.variants.length, 21);
assert.equal(new Set(manifest.variants.map(v => v.name)).size, 21);
assert.deepEqual(manifest.palette, master.palette);
const palette = new Set(Object.values(master.palette));
let pngCount = 0;
async function verifyPng(file, expectedSvg, width, height) {
  const bytes = await fs.readFile(path.join(root, file));
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', file);
  const actual = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(actual.info.width, width, file);
  assert.equal(actual.info.height, height, file);
  let transparent = 0, opaque = 0;
  for (let i = 3; i < actual.data.length; i += 4) {
    if (actual.data[i] === 0) transparent++;
    if (actual.data[i] === 255) opaque++;
  }
  assert.ok(transparent > 0 && opaque > 0, 'Missing alpha range: ' + file);
  const expected = await sharp(expectedSvg).resize({ width }).ensureAlpha().raw().toBuffer();
  assert.ok(actual.data.equals(expected), 'PNG differs from vector rendering: ' + file);
  pngCount++;
}
for (const variant of manifest.variants) {
  assert.match(variant.svg, /^svg\/petal-[a-z-]+\.svg$/);
  assert.match(variant.png, /^png\/petal-[a-z-]+\.png$/);
  const svg = await fs.readFile(path.join(root, variant.svg));
  const text = svg.toString();
  assert.ok(text.startsWith('<svg ') && text.endsWith('</svg>\n'), variant.svg);
  assert.ok(!/<(?:image|text|foreignObject|script)\b|(?:href|font-family)=/.test(text), 'Non-native artwork: ' + variant.svg);
  for (const [, fill] of text.matchAll(/fill="(#[0-9A-Fa-f]+)"/g)) assert.ok(palette.has(fill), 'Unexpected fill: ' + fill);
  if (variant.kind !== 'wordmark') assert.ok(text.includes(master.symbol.paths.join(' ')), variant.svg);
  if (variant.kind.startsWith('logo-') || variant.kind === 'wordmark') assert.ok(text.includes(master.wordmark.paths.join(' ')), variant.svg);
  assert.ok(text.includes('viewBox="' + variant.viewBox.join(' ') + '"'), variant.svg);
  await verifyPng(variant.png, svg, ...variant.pngSize);
}
assert.deepEqual(manifest.iconSizes.map(i => i.size), [16, 32, 48, 180, 192, 512]);
const icon = await fs.readFile(path.join(root, 'svg/petal-icon-circle-rose.svg'));
for (const item of manifest.iconSizes) await verifyPng(item.file, icon, item.size, item.size);
assert.deepEqual(await fs.readFile(path.join(root, 'source/petal-logo-master.svg')), await fs.readFile(path.join(root, 'svg/petal-logo-horizontal-primary.svg')));

// Compare only the silhouette: generated color variation is deliberately normalized.
const reference = await sharp(await fs.readFile(path.join(root, 'source/petal-folded-symbol-reference.png'))).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const [x, y, , bottom] = master.symbolProvenance.sourceBounds;
const scale = (bottom - y) / master.symbol.height;
const comparisonSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${reference.info.width}" height="${reference.info.height}"><g transform="translate(${x} ${y}) scale(${scale})"><path fill="#B83D70" fill-rule="evenodd" d="${master.symbol.paths.join(' ')}"/></g></svg>`;
const vector = await sharp(Buffer.from(comparisonSvg)).ensureAlpha().raw().toBuffer();
let intersection = 0, union = 0;
for (let i = 3; i < vector.length; i += 4) {
  const a = reference.data[i] >= 128, b = vector[i] >= 128;
  if (a && b) intersection++;
  if (a || b) union++;
}
const fidelity = intersection / union;
assert.ok(fidelity >= .99, 'Silhouette changed too far from the approved reference: ' + fidelity);
console.log(`Verified 21 native SVG variants, ${pngCount} transparent PNGs, 8 unchanged wordmark files, and ${(fidelity * 100).toFixed(3)}% silhouette overlap.`);
