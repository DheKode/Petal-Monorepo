import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { isAbsolute } from 'node:path';

// The one supported model (DEC3): Gemma 3 1B IT Q4_K_M. See docs/models.md.
export const GEMMA_SHA256 = '8ccc5cd1f1b3602548715ae25a66ed73fd5dc68a210412eea643eb20eb75a135';
export const GEMMA_BYTES = 806058240;

/** Throws unless `path` is the exact pinned artifact. No discovery, download or alternate models; never trust the filename. */
export async function verifyGemma(path: string): Promise<void> {
  if (typeof path !== 'string' || !isAbsolute(path)) throw new Error('invalid-artifact');
  const info = await stat(path);
  if (!info.isFile() || info.size !== GEMMA_BYTES) throw new Error('invalid-artifact');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  if (hash.digest('hex') !== GEMMA_SHA256) throw new Error('invalid-artifact');
}
