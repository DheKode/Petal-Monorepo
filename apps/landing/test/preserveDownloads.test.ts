import {test, type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {preserveDownloads} from '../scripts/preserve-downloads.mjs';

const bytes = Buffer.from('fictional installer bytes');
const sha256 = createHash('sha256').update(bytes).digest('hex');

async function fixture(t: TestContext) {
    const folder = await mkdtemp(join(tmpdir(), 'petal-release-'));
    assert.equal(dirname(resolve(folder)), resolve(tmpdir()));
    t.after(() => rm(folder, {recursive: true, force: true}));
    const metadataPath = join(folder, 'downloads.ts');
    const downloadsDir = join(folder, 'downloads');
    const platforms = ['android', 'windows', 'macos'].map(id => `  {\n    id: '${id}',\n    url: ${id === 'windows' ? "'https://releases.example.test/download/petal.exe'" : 'null'},\n    sha256: ${id === 'windows' ? `'${sha256}'` : 'null'},\n  },`);
    await writeFile(metadataPath, `export const downloads = [\n${platforms.join('\n')}\n];`);
    return {metadataPath, downloadsDir, log: () => {}};
}

test('a clean deploy restores published bytes and an intact staged copy needs no network', async t => {
    const options = await fixture(t);
    await preserveDownloads({...options, fetchImpl: async input => {
        assert.equal(input, 'https://releases.example.test/download/petal.exe');
        return new Response(bytes);
    }});
    const manifest = JSON.parse(await readFile(join(options.downloadsDir, 'petal.exe.json'), 'utf8'));
    assert.equal(manifest.sha256, sha256);
    assert.equal(manifest.size, bytes.length);
    assert.deepEqual(await readFile(join(options.downloadsDir, manifest.parts[0])), bytes);
    await preserveDownloads({...options, fetchImpl: async () => { throw new Error('Unexpected network request'); }});
});

test('tampered staged chunks are replaced from the checksum-verified original', async t => {
    const options = await fixture(t);
    await preserveDownloads({...options, fetchImpl: async () => new Response(bytes)});
    await writeFile(join(options.downloadsDir, 'petal.exe.part0'), 'tampered');
    await preserveDownloads({...options, fetchImpl: async () => new Response(bytes)});
    assert.deepEqual(await readFile(join(options.downloadsDir, 'petal.exe.part0')), bytes);
});

test('an unavailable original stops deployment rather than dropping its download', async t => {
    const options = await fixture(t);
    await assert.rejects(preserveDownloads({...options, fetchImpl: async () => new Response('missing', {status: 404})}), /HTTP 404/);
    await assert.rejects(readFile(join(options.downloadsDir, 'petal.exe.json')), /ENOENT/);
});

test('a different remote binary never replaces metadata or staged data', async t => {
    const options = await fixture(t);
    await preserveDownloads({...options, fetchImpl: async () => new Response(bytes)});
    const part = join(options.downloadsDir, 'petal.exe.part0');
    await writeFile(part, 'incomplete staged file');
    const metadata = await readFile(options.metadataPath, 'utf8');
    await assert.rejects(preserveDownloads({...options, fetchImpl: async () => new Response('wrong installer')}), /SHA-256 mismatch/);
    assert.equal(await readFile(options.metadataPath, 'utf8'), metadata);
    assert.equal(await readFile(part, 'utf8'), 'incomplete staged file');
});

test('unrecognized release metadata stops deployment instead of treating all builds as unpublished', async t => {
    const options = await fixture(t);
    await writeFile(options.metadataPath, 'export const downloads = [];');
    await assert.rejects(preserveDownloads({...options, fetchImpl: async () => { throw new Error('Unexpected network request'); }}), /three platform entries/);
});
