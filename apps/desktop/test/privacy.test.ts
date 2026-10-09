import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { PetalService } from '../src/main/service';
import { SqliteStore } from '../src/main/sqliteStore';

// K03/K04: records stay out of logs, and the app has no code path that sends anything off the device. These tests guard
// the claims made on the Privacy screen (src/renderer/src/Privacy.tsx).

const SRC = join(__dirname, '..', 'src');

async function sourceFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await sourceFiles(path)));
    else if (/\.(ts|tsx|html)$/.test(entry.name)) out.push(path);
  }
  return out;
}

test('the app has no network, telemetry, crash-reporting or auto-update code', async () => {
  const banned = /\b(crashReporter|autoUpdater|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b|\bfetch\s*\(|\bnet\.(request|fetch)\b|from 'node:(http|https|net|dgram|tls)'|from '(http|https|net)'|\brequire\('(http|https|net)'\)/;
  for (const file of await sourceFiles(SRC)) {
    const text = await readFile(file, 'utf8');
    assert.ok(!banned.test(text), `${relative(SRC, file)} must not contain network or telemetry code`);
  }
});

test('the only logging is one fixed-format error line per failure kind, never record contents', async () => {
  for (const file of await sourceFiles(SRC)) {
    const text = await readFile(file, 'utf8');
    const lines = text.split('\n').filter(line => /\bconsole\.\w+\(/.test(line));
    for (const line of lines) {
      assert.ok(
        /console\.error\(`Petal (could not open its data file \(\$\{code\}\)|hit an unexpected error \(\$\{name\}\))`\)/.test(line),
        `${relative(SRC, file)} has an unreviewed log line: ${line.trim()}`,
      );
    }
  }
});

test('a full flow writes nothing containing record data to the console or stdio', async (t: TestContext) => {
  const dir = await mkdtemp(join(tmpdir(), 'petal-privacy-'));
  t.after(() => rm(dir, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }).catch(() => {}));
  const captured: string[] = [];
  const methods = ['log', 'info', 'warn', 'error', 'debug'] as const;
  const original = Object.fromEntries(methods.map(m => [m, console[m]]));
  const stdout = process.stdout.write.bind(process.stdout);
  const stderr = process.stderr.write.bind(process.stderr);
  for (const m of methods) console[m] = (...args: unknown[]) => { captured.push(args.map(String).join(' ')); };
  // Test runner output itself uses stdout, so only watch for writes made while the flow runs.
  const sink = (chunk: unknown) => { captured.push(String(chunk)); return true; };
  process.stdout.write = sink as typeof process.stdout.write;
  process.stderr.write = sink as typeof process.stderr.write;
  try {
    const store = await SqliteStore.open(join(dir, 'petal.db'), '0.1.0');
    const service = new PetalService(store, () => new Date('2026-10-09T13:30:00Z'));
    await service.saveSetup({ usualTime: '21:00', timeZone: 'Asia/Manila', anchor: { kind: 'mid-pack', position: 10, date: '2026-10-09' } });
    const state = await service.getState();
    await service.recordIntake({ doseId: state.doses[0].id, status: 'taken', actualAt: '2026-10-09T13:00:00Z' });
    await service.recordIntakeBatch([{ doseId: state.doses[1].id, status: 'confirmed-missed' }]);
    await service.recordIntake({ doseId: 'not-a-real-dose', status: 'taken' });
    store.close();
  } finally {
    for (const m of methods) console[m] = original[m] as never;
    process.stdout.write = stdout;
    process.stderr.write = stderr;
  }
  const output = captured.join('\n');
    assert.ok(!/2026-10-09|Asia\/Manila|confirmed-missed|21:00/.test(output), 'record data must not be logged');
});
