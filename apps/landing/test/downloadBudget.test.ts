import {test, type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, rm, stat, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {PART_BYTES, downloadPartCount, stage} from '../scripts/stage-download.mjs';
import worker from '../worker/index.js';

test('the measured Windows artifact fits the request budget and larger builds fail before staging', () => {
    assert.equal(downloadPartCount(1_190_242_528), 48);
    assert.equal(downloadPartCount(49 * PART_BYTES), 49);
    assert.throws(() => downloadPartCount(49 * PART_BYTES + 1), /request budget/);
    assert.throws(() => downloadPartCount(0), /nonempty/);
});

test('chunk boundaries preserve all bytes and stay below the 25 MiB asset limit', async (t: TestContext) => {
    const folder = await mkdtemp(join(tmpdir(), 'petal-chunks-'));
    assert.equal(dirname(resolve(folder)), resolve(tmpdir()));
    t.after(() => rm(folder, {recursive: true, force: true}));
    const source = join(folder, 'build.exe');
    const bytes = Buffer.alloc(PART_BYTES + 3, 42);
    await writeFile(source, bytes);
    const output = join(folder, 'staged');
    const result = stage(source, 'petal.exe', output);
    assert.equal(result.parts, 2);
    const manifest = JSON.parse(await readFile(join(output, 'petal.exe.json'), 'utf8'));
    const hash = createHash('sha256');
    for (const part of manifest.parts) {
        assert.ok((await stat(join(output, part))).size < 25 * 1024 * 1024);
        hash.update(await readFile(join(output, part)));
    }
    assert.equal(hash.digest('hex'), createHash('sha256').update(bytes).digest('hex'));
    assert.equal(manifest.size, bytes.length);
});

test('oversized manifests return an error before a partial successful download can begin', async () => {
    let fetches = 0;
    const env = {ASSETS: {fetch: async () => {
        fetches++;
        return Response.json({name: 'petal.exe', size: 1_190_242_528, parts: Array.from({length: 50}, (_, i) => `petal.exe.part${i}`)});
    }}};
    const response = await worker.fetch(new Request('https://example.test/download/petal.exe'), env);
    assert.equal(response.status, 503);
    assert.equal(fetches, 1);
});

test('a bounded manifest exposes the exact download length to HEAD requests', async () => {
    const env = {ASSETS: {fetch: async () => Response.json({name: 'petal.exe', size: 1_190_242_528, parts: Array.from({length: 48}, (_, i) => `petal.exe.part${i}`)})}};
    const response = await worker.fetch(new Request('https://example.test/download/petal.exe', {method: 'HEAD'}), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-length'), '1190242528');
});
