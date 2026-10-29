// L01/P02 (#11/#12): fresh Workers Builds must not replace published installers with HTML-only assets.
import {createHash} from 'node:crypto';
import {createReadStream, createWriteStream} from 'node:fs';
import {mkdtemp, readFile, rm, rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Readable, Transform} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {fileURLToPath} from 'node:url';
import {BUILD_NAME, stage} from './stage-download.mjs';

const landingDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function publishedBuilds(source) {
    const blocks = [...source.matchAll(/\{\s*id: '(android|windows|macos)',[\s\S]*?\n  \},/g)];
    if (blocks.length !== 3 || new Set(blocks.map(block => block[1])).size !== 3)
        throw new Error('Cannot read the three platform entries in downloads.ts');
    const field = (block, key) => {
        const value = block.match(new RegExp(`${key}: (null|'[^']*')`))?.[1];
        if (!value) throw new Error(`Missing ${key} in downloads.ts`);
        return value === 'null' ? null : value.slice(1, -1);
    };
    return blocks.flatMap(block => {
        const url = field(block[0], 'url');
        if (url === null) return [];
        const sha256 = field(block[0], 'sha256');
        const parsed = new URL(url);
        const name = decodeURIComponent(parsed.pathname.split('/').pop());
        const extension = {android: 'apk', windows: 'exe', macos: 'dmg'}[block[1]];
        if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !BUILD_NAME.test(name) ||
            !name.endsWith(`.${extension}`) || !/^[a-f0-9]{64}$/.test(sha256 ?? ''))
            throw new Error(`Invalid published ${block[1]} download metadata`);
        return [{url, sha256, name}];
    });
}

async function stagedMatches(directory, build) {
    try {
        const manifest = JSON.parse(await readFile(path.join(directory, `${build.name}.json`), 'utf8'));
        if (manifest.name !== build.name || manifest.sha256 !== build.sha256 || !Number.isSafeInteger(manifest.size) ||
            manifest.size <= 0 || !Array.isArray(manifest.parts) || !manifest.parts.length || manifest.parts.length > 1000 ||
            !manifest.parts.every((part, i) => part === `${build.name}.part${i}`)) return false;
        const hash = createHash('sha256');
        let size = 0;
        for (const part of manifest.parts) {
            for await (const chunk of createReadStream(path.join(directory, part))) {
                hash.update(chunk);
                size += chunk.length;
            }
        }
        return size === manifest.size && hash.digest('hex') === build.sha256;
    } catch {
        return false;
    }
}

export async function preserveDownloads({
    metadataPath = path.join(landingDir, 'src/downloads.ts'),
    downloadsDir = path.join(landingDir, 'dist/downloads'),
    fetchImpl = fetch,
    log = console.log,
} = {}) {
    const builds = publishedBuilds(await readFile(metadataPath, 'utf8'));
    for (const build of builds) {
        if (await stagedMatches(downloadsDir, build)) {
            log(`Verified staged download: ${build.name}`);
            continue;
        }
        log(`Restoring published download: ${build.url}`);
        const response = await fetchImpl(build.url, {cache: 'no-store'});
        if (!response.ok || !response.body) throw new Error(`Cannot preserve ${build.name}: HTTP ${response.status}`);
        const folder = await mkdtemp(path.join(tmpdir(), 'petal-preserve-'));
        const file = path.join(folder, build.name);
        try {
            const hash = createHash('sha256');
            const hashing = new Transform({transform(chunk, _encoding, next) { hash.update(chunk); next(null, chunk); }});
            await pipeline(Readable.fromWeb(response.body), hashing, createWriteStream(file));
            if (hash.digest('hex') !== build.sha256) throw new Error(`Cannot preserve ${build.name}: SHA-256 mismatch`);
            stage(file, build.name, downloadsDir);
            log(`Preserved checksum-verified download: ${build.name}`);
        } finally {
            await rm(file, {force: true});
            await rmdir(folder);
        }
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    preserveDownloads().catch(error => {
        console.error(`Download preservation failed; deployment stopped: ${error.message}`);
        process.exitCode = 1;
    });
}
