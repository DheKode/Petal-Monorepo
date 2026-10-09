import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const bundle = require('../scripts/bundle-model.cjs');

test('packaging refuses missing/corrupt model inputs without staging weights', async t => {
  const folder = await mkdtemp(join(tmpdir(), 'petal-bundle-'));
  const previous = process.env.PETAL_BUNDLE_MODEL;
  t.after(async () => {
    if (previous === undefined) delete process.env.PETAL_BUNDLE_MODEL;
    else process.env.PETAL_BUNDLE_MODEL = previous;
    await rm(folder, { recursive: true, force: true });
  });
  process.env.PETAL_BUNDLE_MODEL = join(folder, 'missing.gguf');
  await assert.rejects(() => bundle({ appDir: folder }));
  const bad = join(folder, 'bad.gguf');
  await writeFile(bad, 'invalid model');
  process.env.PETAL_BUNDLE_MODEL = bad;
  await assert.rejects(() => bundle({ appDir: folder }), /incorrect size/);
  assert.deepEqual(await readdir(folder), ['bad.gguf']);
});
