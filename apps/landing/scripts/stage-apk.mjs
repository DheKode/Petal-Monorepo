// Usage: node scripts/stage-apk.mjs <path/to/app.apk> <published-name.apk>
// Run after `vite build`. Splits the APK into <20 MiB parts under dist/apk/
// (Cloudflare Pages allows 25 MiB per file) and writes a manifest that
// functions/download/[name].js uses to stream the whole file. The APK itself
// is never committed. Prints the size and SHA-256 for src/downloads.ts.
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const PART_BYTES = 20 * 1024 * 1024;
const [source, name] = process.argv.slice(2);
if (!source || !/^[a-z0-9][a-z0-9.-]*\.apk$/.test(name ?? ''))
    throw new Error('Usage: node scripts/stage-apk.mjs <path/to/app.apk> <published-name.apk>');

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'apk');
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
console.log(JSON.stringify({name, size: bytes.length, sizeLabel: `${(bytes.length / 1e6).toFixed(1)} MB`, sha256, parts: parts.length}));
