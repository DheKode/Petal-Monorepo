// First-run model setup: download the pinned GGUF once, verify its SHA-256,
// then load it offline on every later launch. A file copied over USB to the
// same directory (tools/device.mjs push-model) is verified and used as is.
import {
  ExternalDirectoryPath,
  downloadFile,
  exists,
  getFSInfo,
  hash,
  moveFile,
  readFile,
  stat,
  unlink,
  writeFile,
} from '@dr.pogodin/react-native-fs';

export const MODEL = {
  file: 'Qwen3-0.6B-Q4_K_M.gguf',
  // Fixed Hugging Face commit; same artifact as the desktop spike (docs/models.md).
  url: 'https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/50968a4468ef4233ed78cd7c3de230dd1d61a56b/Qwen3-0.6B-Q4_K_M.gguf',
  sizeBytes: 396705472,
  sha256: 'ac2d97712095a558e31573f62f466a3f9d93990898b0ec79d7c974c1780d524a',
};

export const modelPath = `${ExternalDirectoryPath}/${MODEL.file}`;
const markerPath = `${modelPath}.verified`;
const partialPath = `${modelPath}.partial`;

export type SetupProgress =
  | {phase: 'checking'}
  | {phase: 'downloading'; bytesWritten: number; totalBytes: number}
  | {phase: 'verifying'};

async function isVerified(): Promise<boolean> {
  if (!(await exists(modelPath)) || !(await exists(markerPath))) return false;
  const [info, marker] = await Promise.all([stat(modelPath), readFile(markerPath, 'utf8')]);
  return Number(info.size) === MODEL.sizeBytes && marker.trim() === MODEL.sha256;
}

async function verifyAndMark(path: string): Promise<void> {
  const digest = (await hash(path, 'sha256')).toLowerCase();
  if (digest !== MODEL.sha256) {
    await unlink(path);
    throw new Error(`Model integrity check failed (sha256 ${digest}). The file was removed; try again.`);
  }
  if (path !== modelPath) await moveFile(path, modelPath);
  await writeFile(markerPath, MODEL.sha256, 'utf8');
}

export async function ensureModel(onProgress: (progress: SetupProgress) => void): Promise<string> {
  onProgress({phase: 'checking'});
  if (await isVerified()) return modelPath;

  if (await exists(modelPath)) {
    onProgress({phase: 'verifying'});
    await verifyAndMark(modelPath);
    return modelPath;
  }

  const {freeSpace} = await getFSInfo();
  if (freeSpace < MODEL.sizeBytes * 1.1)
    throw new Error(`Not enough free storage: need about ${Math.ceil(MODEL.sizeBytes / 1e6)} MB, ${Math.floor(freeSpace / 1e6)} MB free.`);

  if (await exists(partialPath)) await unlink(partialPath);
  const {promise} = downloadFile({
    fromUrl: MODEL.url,
    toFile: partialPath,
    progressInterval: 500,
    connectionTimeout: 30000,
    readTimeout: 60000,
    progress: ({bytesWritten, contentLength}) =>
      onProgress({phase: 'downloading', bytesWritten, totalBytes: contentLength > 0 ? contentLength : MODEL.sizeBytes}),
  });
  const result = await promise;
  if (result.statusCode !== 200) {
    if (await exists(partialPath)) await unlink(partialPath);
    throw new Error(`Model download failed (HTTP ${result.statusCode}). Check the connection and try again.`);
  }

  onProgress({phase: 'verifying'});
  await verifyAndMark(partialPath);
  return modelPath;
}
