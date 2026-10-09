import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStore } from '@petal/storage';
import { PetalService } from '../src/main/service';
import { SqliteStore } from '../src/main/sqliteStore';
import type { SetupInput } from '../src/shared/ipc';

// Real SQLite files in a temp folder. On Windows the driver keeps a file locked for a moment after close(), so cleanup is
// best effort and never fails a test (see #37 item 1).
async function tempDb(t: TestContext): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'petal-desktop-'));
  t.after(() => rm(dir, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }).catch(() => {}));
  return join(dir, 'petal.db');
}

const NOW = new Date('2026-10-09T13:30:00Z'); // 21:30 on Oct 9 in Manila
const setupInput: SetupInput = { usualTime: '21:00', timeZone: 'Asia/Manila', anchor: { kind: 'mid-pack', position: 10, date: '2026-10-09' } };
const value = <T>(result: { ok: true; value: T } | { ok: false; message: string }): T => {
  assert.ok(result.ok, result.ok ? '' : result.message);
  return result.value;
};

async function open(path: string) {
  const store = await SqliteStore.open(path, '0.1.0');
  return { store, service: new PetalService(store, () => NOW) };
}

test('a new database is empty and reports disk persistence', async t => {
  const { store, service } = await open(await tempDb(t));
  t.after(() => store.close());
  const state = await service.getState();
  assert.equal(state.pack, null);
  assert.deepEqual(state.events, []);
  assert.equal(state.persistence, 'disk');
});

test('setup survives closing and reopening the database file', async t => {
  const path = await tempDb(t);
  const first = await open(path);
  value(await first.service.saveSetup(setupInput));
  first.store.close();
  const second = await open(path);
  t.after(() => second.store.close());
  const state = await second.service.getState();
  assert.equal(state.doses.length, 28);
  assert.equal(state.doses[9].localDate, '2026-10-09');
  assert.equal(state.settings?.usualTime, '21:00');
  assert.deepEqual(state.events, []);
  assert.equal((await second.service.saveSetup(setupInput)).ok, false);
});

test('logged intake, approximate times and unknown history survive a restart', async t => {
  const path = await tempDb(t);
  const first = await open(path);
  const doses = value(await first.service.saveSetup(setupInput)).doses;
  value(await first.service.recordIntake({ doseId: doses[9].id, status: 'taken', actualAt: '2026-10-09T21:05:00+08:00', timePrecision: 'approximate' }));
  value(await first.service.recordIntake({ doseId: doses[8].id, status: 'unsure' }));
  first.store.close();
  const second = await open(path);
  t.after(() => second.store.close());
  const events = (await second.service.getState()).events;
  assert.equal(events.length, 2);
  const taken = events.find(e => e.doseId === doses[9].id);
  assert.equal(taken?.timePrecision, 'approximate');
  assert.equal(taken?.actualAt, '2026-10-09T21:05:00+08:00');
  assert.equal(events.find(e => e.doseId === doses[8].id)?.status, 'unsure');
  assert.equal(events.some(e => e.doseId === doses[0].id), false, 'tablets with no entry stay without a record');
});

test('every change leaves an audit entry, including a correction and its undo', async t => {
  const path = await tempDb(t);
  const { store, service } = await open(path);
  const dose = value(await service.saveSetup(setupInput)).doses[9];
  value(await service.recordIntake({ doseId: dose.id, status: 'taken', actualAt: NOW.toISOString() }));
  value(await service.recordIntake({ doseId: dose.id, status: 'confirmed-missed' }));
  const state = value(await service.undoIntake(dose.id));
  assert.equal(state.events[0].status, 'taken');
  store.close();

  const raw = await LocalStore.open(path);
  t.after(() => raw.close());
  const { backup } = await raw.read();
  const audits = backup.auditEntries.filter(a => a.entityType === 'intake-event');
  assert.equal(audits.length, 3);
  assert.equal(audits[0].priorValue, null);
  assert.deepEqual([(audits[1].priorValue as { status: string }).status, (audits[1].newValue as { status: string }).status], ['taken', 'confirmed-missed']);
  assert.deepEqual([(audits[2].priorValue as { status: string }).status, (audits[2].newValue as { status: string }).status], ['confirmed-missed', 'taken']);
  assert.ok(backup.auditEntries.some(a => a.entityType === 'pack' && a.origin === 'import'), 'setup is audited too');
});

test('a repeated identical entry changes nothing and writes no audit entry', async t => {
  const path = await tempDb(t);
  const { store, service } = await open(path);
  const dose = value(await service.saveSetup(setupInput)).doses[9];
  value(await service.recordIntake({ doseId: dose.id, status: 'taken', actualAt: NOW.toISOString() }));
  const again = value(await service.recordIntake({ doseId: dose.id, status: 'taken', actualAt: NOW.toISOString() }));
  assert.equal(again.change, 'unchanged');
  store.close();
  const raw = await LocalStore.open(path);
  t.after(() => raw.close());
  assert.equal((await raw.read()).backup.auditEntries.filter(a => a.entityType === 'intake-event').length, 1);
});

test('opening fails clearly for a newer storage schema instead of starting empty', async t => {
  const path = await tempDb(t);
  const { createClient } = await import('@libsql/client');
  const { pathToFileURL } = await import('node:url');
  const raw = createClient({ url: pathToFileURL(path).href });
  await raw.execute('PRAGMA user_version=2');
  raw.close();
  await assert.rejects(SqliteStore.open(path, '0.1.0'));
});
