// A12 / DEC4 (#15). Weights are local build inputs, never Git assets. Fail closed before packaging.
const { createHash } = require('node:crypto');
const { createReadStream } = require('node:fs');
const { mkdir, stat, copyFile, rename, rm } = require('node:fs/promises');
const { homedir } = require('node:os');
const { join, resolve } = require('node:path');
const FILE = 'gemma-3-1b-it-Q4_K_M.gguf';
const BYTES = 806058240;
const SHA256 = '8ccc5cd1f1b3602548715ae25a66ed73fd5dc68a210412eea643eb20eb75a135';

async function verify(path) {
  const info = await stat(path);
  if (!info.isFile() || info.size !== BYTES) throw new Error('Bundled Gemma has an incorrect size');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  if (hash.digest('hex') !== SHA256) throw new Error('Bundled Gemma failed SHA-256 verification');
}

async function bundle(context) {
  const root = context?.appDir ?? resolve(__dirname, '..');
  const target = join(root, '.model-bundle', FILE);
  // Explicit path supports CI and teammates; the existing spike cache is the default build source.
  const source = process.env.PETAL_BUNDLE_MODEL ?? join(process.env.PETAL_MODELS_DIR ?? join(homedir(), '.cache', 'petal', 'models'), FILE);
  await verify(source);
  await mkdir(join(root, '.model-bundle'), { recursive: true });
  const partial = target + '.partial';
  try {
    await copyFile(source, partial);
    await verify(partial);
    await rename(partial, target);
  } finally {
    await rm(partial, { force: true });
  }
  console.log('Bundled pinned Gemma: 806,058,240 bytes, SHA-256 verified.');
}

module.exports = bundle;
module.exports.verify = verify;
if (require.main === module) bundle().catch(error => { console.error(error.message); process.exitCode = 1; });
