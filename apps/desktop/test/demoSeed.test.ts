import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { seedDemo } from '../scripts/demo-seed';
import { SqliteStore } from '../src/main/sqliteStore';

const NOW = new Date('2026-10-10T08:00:00Z'); // 16:00 on Oct 10 in Manila: today is tablet 12, due at 21:00
const OPTIONS = { now: NOW, timeZone: 'Asia/Manila' };

async function tempDir(t: { after: (fn: () => Promise<unknown>) => void }) {
  const dir = await mkdtemp(join(tmpdir(), 'petal-demo-'));
  t.after(() => rm(dir, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }).catch(() => {}));
  return dir;
}

test('the demo records tell the uncertain-day story and can be reset', async t => {
  const dir = join(await tempDir(t), 'demo');
  const summary = await seedDemo(dir, OPTIONS);
  assert.deepEqual([summary.uncertain.position, summary.uncertain.date, summary.remembered.position, summary.today], [10, '2026-10-08', 11, '2026-10-10']);

  const open = async () => {
    const store = await SqliteStore.open(join(dir, 'petal.db'), 'test');
    t.after(async () => { try { store.close(); } catch { /* already closed */ } });
    return store;
  };
  let store = await open();
  let state = await store.load();
  assert.equal(state.doses.length, 28);
  assert.equal(state.doses[11].localDate, '2026-10-10', 'today is tablet 12');
  const status = (position: number) => state.events.find(e => e.doseId === state.doses[position - 1].id);
  assert.equal(status(10), undefined, 'the uncertain day has no entry at all');
  assert.equal(status(12), undefined, "today's tablet is still to come");
  assert.equal(status(4)?.status, 'confirmed-missed');
  assert.equal(status(6)?.status, 'unsure');
  assert.deepEqual([status(11)?.status, status(11)?.timePrecision], ['taken', 'approximate']);
  assert.equal(status(1)?.timePrecision, 'exact');
  assert.equal(state.events.length, 10, 'tablets 1 to 11 are recorded except the uncertain tablet 10');
  assert.equal(state.bleeding.length, 1);
  assert.equal(state.bleeding[0].note, 'Fictional demo entry');
  store.close();

});

test('the command line resets the demo records in a fresh process instead of piling them up', async t => {
  // A separate process, as in real use: on Windows the SQLite file stays locked until the process that opened it exits.
  const dir = join(await tempDir(t), 'demo');
  const run = () => spawnSync(process.execPath, ['--import', 'tsx', 'scripts/demo-seed.ts', '--dir', dir], { cwd: join(__dirname, '..'), encoding: 'utf8' });
  for (const attempt of [1, 2]) {
    const result = run();
    assert.equal(result.status, 0, `run ${attempt}: ${result.stderr}`);
    assert.match(result.stdout, /The uncertain day is tablet 10/);
  }
  const store = await SqliteStore.open(join(dir, 'petal.db'), 'test');
  t.after(async () => { try { store.close(); } catch { /* closed */ } });
  const state = await store.load();
  assert.equal(state.events.length, 10);
  assert.equal(state.bleeding.length, 1);
});

test('the demo script refuses to touch a folder it did not create', async t => {
  const folder = await tempDir(t);
  await writeFile(join(folder, 'petal.db'), 'pretend these are real records');
  await assert.rejects(seedDemo(folder, OPTIONS), /Refusing to touch/);
  const fresh = join(folder, 'brand-new');
  await mkdir(fresh);
  await seedDemo(fresh, OPTIONS); // an empty folder is fine
});
