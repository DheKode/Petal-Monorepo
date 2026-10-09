import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Reuse the desktop's declared/pinned Vite tool; add no second bundler dependency.
const pnpm = process.env.npm_execpath;
if (!pnpm) throw new Error('Run pnpm --filter @petal/ui preview:components');
const preview = fileURLToPath(new URL('../examples/web/', import.meta.url));
const config = fileURLToPath(new URL('../examples/web/vite.config.mjs', import.meta.url));
const child = spawn(process.execPath, [pnpm, '--filter', '@petal/desktop', 'exec', 'vite', preview,
  '--config', config, '--host', '127.0.0.1', '--port', '4179', '--strictPort'], { stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
process.on('SIGTERM', () => child.kill('SIGTERM'));
process.on('SIGINT', () => child.kill('SIGINT'));
