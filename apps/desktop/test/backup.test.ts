import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PetalService } from '../src/main/service';
import { SqliteStore } from '../src/main/sqliteStore';
import type { SetupInput } from '../src/shared/ipc';

async function tempDb(t: TestContext): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'petal-backup-'));
  t.after(() => rm(dir, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }).catch(() => {}));
  return join(dir, 'petal.db');
}

const NOW = new Date('2026-10-09T13:30:00Z');
const setupInput: SetupInput = { usualTime: '21:00', timeZone: 'Asia/Manila', anchor: { kind: 'mid-pack', position: 10, date: '2026-10-09' } };
const value = <T>(result: { ok: true; value: T } | { ok: false; message: string }): T => {
  assert.ok(result.ok, result.ok ? '' : result.message);
  return result.value;
};

async function open(path: string, t: TestContext) {
  const store = await SqliteStore.open(path, '0.1.0');
  t.after(() => { try { store.close(); } catch { /* already closed */ } });
  return { store, service: new PetalService(store, () => NOW) };
}

/** A database with a pack and one logged tablet. Returns its backup text. */
async function withOneEntry(t: TestContext) {
  const ctx = await open(await tempDb(t), t);
  value(await ctx.service.saveSetup(setupInput));
  const state = await ctx.service.getState();
  value(await ctx.service.recordIntake({ doseId: state.doses[0].id, status: 'confirmed-missed' }));
  return { ...ctx, backup: value(await ctx.service.exportBackup()).json };
}

test('export is a full backup that carries a plaintext sensitivity notice', async t => {
  const { backup, service } = await withOneEntry(t);
  const parsed = JSON.parse(backup);
  assert.equal(parsed.encryption, 'none');
  assert.equal(parsed.intakeEvents.length, 1);
  assert.match(value(await service.exportBackup()).sensitivityNotice, /plaintext/i);
});

test('importing a backup into an empty database restores the records after a restart', async t => {
  const { backup } = await withOneEntry(t);
  const path = await tempDb(t);
  const target = await open(path, t);
  const preview = value(await target.service.previewImport(backup));
  assert.equal(preview.current.intakeEvents, 0);
  assert.equal(preview.incoming.intakeEvents, 1);
  const done = value(await target.service.confirmImport(preview.token));
  assert.equal(done.state.events.length, 1);
  target.store.close();
  const reopened = await open(path, t);
  assert.equal((await reopened.service.getState()).events.length, 1);
});

test('a preview changes nothing until confirmed, and cancelling leaves records untouched', async t => {
  const { backup } = await withOneEntry(t);
  const target = await open(await tempDb(t), t);
  const before = await target.service.getState();
  const preview = value(await target.service.previewImport(backup));
  assert.deepEqual(await target.service.getState(), before);
  value(await target.service.cancelImport(preview.token));
  assert.deepEqual(await target.service.getState(), before);
  const late = await target.service.confirmImport(preview.token);
  assert.equal(late.ok, false);
  assert.deepEqual(await target.service.getState(), before);
});

test('importing over existing records keeps a recovery copy and replaces everything', async t => {
  const { backup } = await withOneEntry(t);
  const target = await open(await tempDb(t), t);
  value(await target.service.saveSetup({ ...setupInput, anchor: { kind: 'first-pack', startDate: '2026-10-01' } }));
  const preview = value(await target.service.previewImport(backup));
  assert.equal(preview.current.intakeEvents, 0);
  const done = value(await target.service.confirmImport(preview.token));
  assert.equal(done.recoveryKept, true);
  assert.equal(done.state.events.length, 1);
});

test('malformed, wrong-shape or oversized files are rejected with a general message and change nothing', async t => {
  const target = await open(await tempDb(t), t);
  value(await target.service.saveSetup(setupInput));
  const before = await target.service.getState();
  for (const bad of ['not json', '{}', '{"schemaVersion":99}', '[]', 'x'.repeat(2_000_000)]) {
    const result = await target.service.previewImport(bad);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.message, /Your records were not changed/);
      assert.ok(!result.message.includes('not json'), 'file contents must not be echoed');
    }
  }
  assert.deepEqual(await target.service.getState(), before);
});

test('a preview goes stale if records change before it is confirmed', async t => {
  const { backup } = await withOneEntry(t);
  const target = await open(await tempDb(t), t);
  value(await target.service.saveSetup(setupInput));
  const preview = value(await target.service.previewImport(backup));
  const state = await target.service.getState();
  value(await target.service.recordIntake({ doseId: state.doses[0].id, status: 'unsure' }));
  const result = await target.service.confirmImport(preview.token);
  assert.equal(result.ok, false);
  assert.equal((await target.service.getState()).events[0].status, 'unsure');
});
