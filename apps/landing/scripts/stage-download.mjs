// Usage: node scripts/stage-download.mjs <path/to/build> <published-name.apk|.exe|.dmg>
// Run after `vite build`, once per platform build. Splits the file into
// <20 MiB parts under dist/downloads/ (Workers static assets allow 25 MiB per
// file) and writes a manifest that worker/index.js uses to stream the whole
// file from /download/<name>. Builds are never committed. Prints the size and
// SHA-256 to put in src/downloads.ts.
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PART_BYTES = 20 * 1024 * 1024;
const [source, name] = process.argv.slice(2);
if (!source || !/^[a-z0-9][a-z0-9.-]*\.(apk|exe|dmg)$/.test(name ?? ''))
    throw new Error('Usage: node scripts/stage-download.mjs <path/to/build> <published-name.apk|.exe|.dmg>');

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'downloads');
mkdirSync(outDir, {recursive: true});

const bytes = readFileSync(source);
const parts = [];
for (let offset = 0, index = 0; offset < bytes.length; offset += PART_BYTES, index++) {
    const part = `${name}.part${index}`;
    writeFileSync(path.join(outDir, part), bytes.subarray(offset, offset + PART_BYTES));
    parts.push(part);
}

const sha256 = createHash('sha256').update(bytes).digest('hex');
writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify({name, size: bytes.length, sha256, parts}, null, 2));
console.log(JSON.stringify({url: `https://petal.necookie.dev/download/${name}`, name, size: bytes.length, sizeLabel: `${(bytes.length / 1e6).toFixed(1)} MB`, sha256, parts: parts.length}));
