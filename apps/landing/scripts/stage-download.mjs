// Usage: node scripts/stage-download.mjs <path/to/build> <published-name.apk|.exe|.dmg>
// Run after `vite build`, once per platform build. Splits the file into
// 24 MiB parts under dist/downloads/ (Workers static assets allow 25 MiB per
// file) and writes a manifest that worker/index.js uses to stream the whole
// file from /download/<name>. Builds are never committed. Prints the size and
// SHA-256 to put in src/downloads.ts. scripts/publish-build.mjs uses stage().
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const PART_BYTES = 24 * 1024 * 1024;
// One manifest fetch plus at most 49 chunks fits the default 50-subrequest budget.
export function downloadPartCount(size) {
    if (!Number.isSafeInteger(size) || size <= 0) throw new Error('Build must be a nonempty file');
    const count = Math.ceil(size / PART_BYTES);
    if (count > 49) throw new Error('Build exceeds the 49-chunk download request budget');
    return count;
}
export const SITE = 'https://petal.necookie.dev';
export const BUILD_NAME = /^[a-z0-9][a-z0-9.-]*\.(apk|exe|dmg)$/;
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'downloads');

export function sizeLabel(bytes) {
    return `${(bytes / 1e6).toFixed(1)} MB`;
}

export function stage(source, name, destination = outDir) {
    if (!BUILD_NAME.test(name)) throw new Error(`Invalid published name "${name}" (expected lowercase *.apk, *.exe or *.dmg)`);
    downloadPartCount(statSync(source).size);
    mkdirSync(destination, {recursive: true});

    const bytes = readFileSync(source);
    const parts = [];
    for (let offset = 0, index = 0; offset < bytes.length; offset += PART_BYTES, index++) {
        const part = `${name}.part${index}`;
        writeFileSync(path.join(destination, part), bytes.subarray(offset, offset + PART_BYTES));
        parts.push(part);
    }

    const sha256 = createHash('sha256').update(bytes).digest('hex');
    writeFileSync(path.join(destination, `${name}.json`), JSON.stringify({name, size: bytes.length, sha256, parts}, null, 2));
    return {url: `${SITE}/download/${name}`, name, size: bytes.length, sizeLabel: sizeLabel(bytes.length), sha256, parts: parts.length};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const [source, name] = process.argv.slice(2);
    if (!source || !name) throw new Error('Usage: node scripts/stage-download.mjs <path/to/build> <published-name.apk|.exe|.dmg>');
    console.log(JSON.stringify(stage(source, name)));
}
