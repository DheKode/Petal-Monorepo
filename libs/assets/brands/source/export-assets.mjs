// Optional asset exporter. Supply an existing Sharp installation; no app dependency.
// node libs/assets/brands/source/export-assets.mjs --sharp /absolute/path/to/sharp
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharpIndex = process.argv.indexOf('--sharp');
const sharp = require(sharpIndex >= 0 ? process.argv[sharpIndex + 1] : 'sharp');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const master = JSON.parse(await fs.readFile(path.join(root, 'source/petal-logo-master.json'), 'utf8'));
const { symbol, wordmark, palette } = master;
const shapes = (part, fill) => `<path fill="${fill}" fill-rule="evenodd" d="${part.paths.join(' ')}"/>`;
const group = (part, fill, x = 0, y = 0, scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">${shapes(part, fill)}</g>`;
const svg = (width, height, body, label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${label}"><title>${label}</title>${body}</svg>\n`;
const variants = [];
function add(kind, color, width, height, body, pngWidth) {
  const name = `petal-${kind}-${color}`;
  variants.push({ name, kind, color, width, height, pngWidth, svg: svg(width, height, body, `Petal ${kind.replaceAll('-', ' ')} — ${color}`) });
}
for (const color of ['primary', 'rose', 'plum', 'black', 'white']) {
  const markFill = color === 'primary' ? palette.rose : palette[color];
  const textFill = color === 'primary' ? palette.plum : palette[color];
  const pad = 24;
  const x = wordmark.origin[0] - symbol.origin[0];
  const y = symbol.origin[1] - wordmark.origin[1];
  add('logo-horizontal', color, x + wordmark.width + 2 * pad, wordmark.height + 2 * pad,
    group(symbol, markFill, pad, pad + y) + group(wordmark, textFill, pad + x, pad), 2048);
  const scale = .65;
  const width = wordmark.width * scale + 2 * pad;
  const wordY = pad + symbol.height + 32;
  add('logo-stacked', color, width, wordY + wordmark.height * scale + pad,
    group(symbol, markFill, (width - symbol.width) / 2, pad) + group(wordmark, textFill, pad, wordY, scale), 1024);
}
for (const color of ['rose', 'plum', 'black', 'white']) {
  add('symbol', color, symbol.width + 48, symbol.height + 48, group(symbol, palette[color], 24, 24), 1024);
  add('wordmark', color, wordmark.width + 48, wordmark.height + 48, group(wordmark, palette[color], 24, 24), 2048);
}
for (const color of ['rose', 'plum', 'black']) {
  const scale = 360 / symbol.width;
  add('icon-circle', color, 512, 512,
    `<circle cx="256" cy="256" r="256" fill="${palette[color]}"/>` + group(symbol, palette.white, 76, (512 - symbol.height * scale) / 2, scale), 1024);
}
await fs.mkdir(path.join(root, 'svg'), { recursive: true });
await fs.mkdir(path.join(root, 'png'), { recursive: true });
const manifest = { name: 'Petal', version: 1, palette, variants: [] };
for (const variant of variants) {
  const svgPath = `svg/${variant.name}.svg`, pngPath = `png/${variant.name}.png`;
  await fs.writeFile(path.join(root, svgPath), variant.svg);
  const result = await sharp(Buffer.from(variant.svg)).resize({ width: variant.pngWidth }).png().toFile(path.join(root, pngPath));
  manifest.variants.push({ name: variant.name, kind: variant.kind, color: variant.color, svg: svgPath, png: pngPath,
    viewBox: [0, 0, variant.width, variant.height], pngSize: [result.width, result.height] });
}
const icon = variants.find(v => v.name === 'petal-icon-circle-rose');
for (const size of [16, 32, 48, 180, 192, 512]) {
  const file = `png/petal-icon-circle-rose-${size}.png`;
  await sharp(Buffer.from(icon.svg)).resize(size, size).png().toFile(path.join(root, file));
}
manifest.iconSizes = [16, 32, 48, 180, 192, 512].map(size => ({ size, file: `png/petal-icon-circle-rose-${size}.png` }));
await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
await fs.writeFile(path.join(root, 'source/petal-logo-master.svg'), variants[0].svg);

// A contact sheet for reviewing every variant on its intended background.
const columns = 3, cellWidth = 480, cellHeight = 245, header = 120;
const rows = Math.ceil(variants.length / columns), width = columns * cellWidth, height = header + rows * cellHeight;
let body = `<rect width="${width}" height="${height}" fill="#FFF7FA"/><text x="28" y="48" font-family="sans-serif" font-size="30" fill="#33252D">Petal · approved open blossom</text><text x="28" y="82" font-family="sans-serif" font-size="16" fill="#745D69">Production variations · shared outlines · flat fills</text>`;
for (let i = 0; i < variants.length; i++) {
  const v = variants[i], x = (i % columns) * cellWidth, y = header + Math.floor(i / columns) * cellHeight;
  const dark = v.color === 'white';
  const fill = dark ? '#33252D' : '#FFFFFF';
  const scale = Math.min((cellWidth - 70) / v.width, 154 / v.height);
  const inner = v.svg.slice(v.svg.indexOf('</title>') + 8, v.svg.lastIndexOf('</svg>'));
  body += `<rect x="${x + 8}" y="${y + 8}" width="${cellWidth - 16}" height="${cellHeight - 16}" rx="10" fill="${fill}"/><g transform="translate(${x + (cellWidth - v.width * scale) / 2} ${y + 22 + (158 - v.height * scale) / 2}) scale(${scale})">${inner}</g><text x="${x + 24}" y="${y + 210}" font-family="sans-serif" font-size="12" fill="${dark ? '#FFFFFF' : '#745D69'}">${v.name}</text>`;
}
const sheet = svg(width, height, body, 'Petal logo asset variations');
await fs.writeFile(path.join(root, 'petal-logo-variations.svg'), sheet);
await sharp(Buffer.from(sheet)).png().toFile(path.join(root, 'petal-logo-variations.png'));
console.log(`Exported ${variants.length} SVG + PNG pairs, 6 sized icons, and the variation sheet.`);
