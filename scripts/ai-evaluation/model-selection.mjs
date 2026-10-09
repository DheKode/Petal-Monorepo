import os from 'node:os';
import path from 'node:path';
export const DEFAULT_MODEL_FAMILY = 'gemma3';
const artifacts = {
  gemma3: {file: 'gemma-3-1b-it-Q4_K_M.gguf', sha256: '8ccc5cd1f1b3602548715ae25a66ed73fd5dc68a210412eea643eb20eb75a135'},
  qwen3: {file: 'Qwen3-0.6B-Q4_K_M.gguf', sha256: 'ac2d97712095a558e31573f62f466a3f9d93990898b0ec79d7c974c1780d524a'}
};
/** User-selected Gemma default; overrides retain the pinned family/artifact pairing. */
export function selectModel(options = {}, modelsDir = process.env.PETAL_MODELS_DIR || path.join(os.homedir(), '.cache', 'petal', 'models')) {
  const family = options.family ?? DEFAULT_MODEL_FAMILY;
  const artifact = artifacts[family];
  if (!artifact) throw new Error('Unknown model family');
  if (options.sha256 && options.sha256 !== artifact.sha256) throw new Error('Artifact hash does not match selected family');
  return {family, model: options.model ?? path.join(modelsDir, artifact.file), sha256: artifact.sha256};
}
