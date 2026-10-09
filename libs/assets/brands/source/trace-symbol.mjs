// Reconstruct the approved symbol silhouette as native vector geometry.
// Reads the original alpha channel; does not modify the reference PNG.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const sharpIndex = process.argv.indexOf('--sharp');
const sharp = require(sharpIndex >= 0 ? process.argv[sharpIndex + 1] : 'sharp');
const root = path.dirname(fileURLToPath(import.meta.url));
const input = await fs.readFile(path.join(root, 'petal-folded-symbol-reference.png'));
const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;
const pixel = (x, y) => x >= 0 && y >= 0 && x < width && y < height && data[(y * width + x) * channels + channels - 1] >= 128;
const edges = [], outgoing = new Map(), stride = width + 1;
function add(x, y, nx, ny, direction) {
  const edge = { x, y, nx, ny, direction, used: false };
  const key = y * stride + x;
  if (!outgoing.has(key)) outgoing.set(key, []);
  outgoing.get(key).push(edge);
  edges.push(edge);
}
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (pixel(x, y)) {
  if (!pixel(x, y - 1)) add(x, y, x + 1, y, 0);
  if (!pixel(x + 1, y)) add(x + 1, y, x + 1, y + 1, 1);
  if (!pixel(x, y + 1)) add(x + 1, y + 1, x, y + 1, 2);
  if (!pixel(x - 1, y)) add(x, y + 1, x, y, 3);
}
const area = points => points.reduce((sum, p, i) => {
  const next = points[(i + 1) % points.length];
  return sum + p[0] * next[1] - next[0] * p[1];
}, 0) / 2;
const contours = [];
for (const first of edges) if (!first.used) {
  const points = [];
  let current = first;
  while (true) {
    current.used = true;
    points.push([current.x, current.y]);
    if (current.nx === first.x && current.ny === first.y) break;
    const choices = (outgoing.get(current.ny * stride + current.nx) ?? []).filter(edge => !edge.used);
    if (!choices.length) throw new Error('Open silhouette contour.');
    const priority = edge => [1, 0, 3, 2].indexOf((edge.direction - current.direction + 4) % 4);
    choices.sort((a, b) => priority(a) - priority(b));
    current = choices[0];
    if (points.length > edges.length) throw new Error('Contour did not close.');
  }
  contours.push(points);
}
contours.sort((a, b) => Math.abs(area(b)) - Math.abs(area(a)));
const contour = contours[0];
if (!contour || Math.abs(area(contour)) < width * height * .1) throw new Error('Missing primary silhouette.');
function distanceSquared(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return (p[0] - a[0] - t * dx) ** 2 + (p[1] - a[1] - t * dy) ** 2;
}
function simplify(points) {
  if (points.length < 3) return points;
  let farthest = 0, index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const distance = distanceSquared(points[i], points[0], points.at(-1));
    if (distance > farthest) { farthest = distance; index = i; }
  }
  return farthest > 1.5 ** 2
    ? [...simplify(points.slice(0, index + 1)).slice(0, -1), ...simplify(points.slice(index))]
    : [points[0], points.at(-1)];
}
const start = contour.reduce((best, p, i) => p[1] < contour[best][1] ? i : best, 0);
const ordered = [...contour.slice(start), ...contour.slice(0, start)];
const split = ordered.reduce((best, p, i) => distanceSquared(p, ordered[0], ordered[0]) > distanceSquared(ordered[best], ordered[0], ordered[0]) ? i : best, 0);
const simplified = [...simplify(ordered.slice(0, split + 1)).slice(0, -1), ...simplify([...ordered.slice(split), ordered[0]]).slice(0, -1)];
const left = Math.min(...contour.map(p => p[0])), top = Math.min(...contour.map(p => p[1]));
const right = Math.max(...contour.map(p => p[0])), bottom = Math.max(...contour.map(p => p[1]));
const scale = 220 / (bottom - top);
const points = simplified.map(([x, y]) => [(x - left) * scale, (y - top) * scale]);
const format = value => Number(value.toFixed(4));
const coordinate = p => p.map(format).join(' ');
const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
let outline = 'M' + coordinate(midpoint(points.at(-1), points[0]));
for (let i = 0; i < points.length; i++) outline += 'Q' + coordinate(points[i]) + ' ' + coordinate(midpoint(points[i], points[(i + 1) % points.length]));
outline += 'Z';
const master = JSON.parse(await fs.readFile(path.join(root, 'petal-logo-master.json'), 'utf8'));
master.name = 'Petal folded petal';
master.version = 2;
master.symbol = { width: format((right - left) * scale), height: 220, paths: [outline], contours: 1 };
master.layout = { horizontal: { order: 'wordmark-symbol', gap: 34, symbolTop: 10 }, stacked: { order: 'wordmark-symbol', scale: .65, gap: 22.1 } };
master.symbolProvenance = { reference: 'petal-folded-symbol-reference.png', alphaThreshold: 128, sourceBounds: [left, top, right, bottom], simplifyTolerancePixels: 1.5, retainedContourArea: Math.abs(area(contour)), discardedContours: contours.length - 1, anchors: points.length };
await fs.writeFile(path.join(root, 'petal-logo-master.json'), JSON.stringify(master, null, 2) + '\n');
console.log(JSON.stringify({ symbol: master.symbol.width + ' × 220', anchors: points.length, discardedContours: contours.length - 1 }));
