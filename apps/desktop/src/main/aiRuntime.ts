import { utilityProcess, type UtilityProcess } from 'electron';
import { randomUUID } from 'node:crypto';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AiModelInfo } from '../shared/ai';
import { GEMMA_BYTES, verifyGemma } from './aiArtifact';
import type { AiGenerator } from './aiService';

const CONFIG_FILE = 'ai-model.json';
// The first request loads ~800 MB of weights (and hashes them again in the worker); later requests reuse the loaded model.
const COLD_TIMEOUT_MS = 120_000;
const WARM_TIMEOUT_MS = 30_000;

/** Hosts the inference worker. Model selection is a user-chosen local file only; first-run download and redistribution remain #15. */
export class AiRuntime implements AiGenerator {
  private path: string | null = null;
  private child: UtilityProcess | null = null;
  private warm = false;
  private initialization: Promise<void> = Promise.resolve();
  private revision = 0;

  constructor(private folder: string, private workerPath = join(__dirname, 'aiWorker.js')) {}

  /** Re-verifies the remembered model in the background so startup and tracking are never blocked. */
  initialize(): Promise<void> {
    const revision = this.revision;
    this.initialization = (async () => {
      try {
        const config = JSON.parse(await readFile(join(this.folder, CONFIG_FILE), 'utf8'));
        if (config.version === 1 && typeof config.path === 'string') {
          await verifyGemma(config.path);
          if (revision === this.revision) this.path = config.path;
        }
      } catch {
        // No selection yet, or the remembered file moved or changed: fixed responses remain available.
        if (revision === this.revision) this.path = null;
      }
    })();
    return this.initialization;
  }

  async info(): Promise<AiModelInfo> {
    await this.initialization;
    let available = false;
    try {
      available = !!this.path && (await stat(this.path)).size === GEMMA_BYTES;
    } catch {
      // A missing file is a normal fallback state.
    }
    return {
      available,
      title: 'Gemma 3 1B IT Q4_K_M · node-llama-cpp 3.22.1',
      message: available
        ? 'Verified local model selected. Answers are checked before they are shown.'
        : 'No verified local model selected. Recorded-history help and reviewed FAQ passages still work with fixed responses.',
    };
  }

  async select(path: string): Promise<void> {
    this.revision++;
    await verifyGemma(path);
    await writeFile(join(this.folder, CONFIG_FILE), JSON.stringify({ version: 1, path }) + '\n', { mode: 0o600 });
    this.dispose();
    this.path = path;
  }

  /** Waits for the startup re-verification, so a question asked right after launch does not miss a remembered model. */
  async generate(question: string, system: string, schema: Record<string, unknown>, signal: AbortSignal): Promise<string> {
    await this.initialization;
    return this.run(question, system, schema, signal);
  }

  private run(question: string, system: string, schema: Record<string, unknown>, signal: AbortSignal): Promise<string> {
    if (signal.aborted) return Promise.reject(new Error('cancelled'));
    if (!this.path) return Promise.reject(new Error('model-unavailable'));
    const path = this.path;
    if (!this.child) {
      this.child = utilityProcess.fork(this.workerPath, [], { stdio: 'pipe', serviceName: 'Petal local AI' });
      this.warm = false;
      // Drain runtime output without ever exposing prompt or record contents to app logs or the renderer.
      this.child.stdout?.resume();
      this.child.stderr?.resume();
    }
    const child = this.child;
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const cleanup = () => {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
        child.removeListener('message', message);
        child.removeListener('exit', exit);
      };
      const stop = () => {
        if (this.child === child) this.child = null;
        child.kill();
      };
      const abort = () => { cleanup(); stop(); reject(new Error('cancelled')); };
      const exit = () => {
        cleanup();
        if (this.child === child) this.child = null;
        reject(new Error('worker-exited'));
      };
      const message = (data: { id?: string; raw?: unknown; error?: string }) => {
        if (data?.id !== id) return;
        cleanup();
        if (typeof data.raw === 'string' && data.raw.length <= 20000) {
          if (this.child === child) this.warm = true;
          resolve(data.raw);
        } else {
          stop();
          reject(new Error('worker-' + (data.error ?? 'generation-failed')));
        }
      };
      const timer = setTimeout(() => { cleanup(); stop(); reject(new Error('generation-timeout')); }, this.warm ? WARM_TIMEOUT_MS : COLD_TIMEOUT_MS);
      signal.addEventListener('abort', abort, { once: true });
      child.on('message', message);
      child.once('exit', exit);
      if (signal.aborted) abort();
      else child.postMessage({ id, path, question, system, schema });
    });
  }

  dispose(): void {
    this.child?.kill();
    this.child = null;
    this.warm = false;
  }
}
