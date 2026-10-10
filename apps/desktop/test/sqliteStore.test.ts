import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStore } from '@petal/storage';
import { PetalService } from '../src/main/service';
import { SqliteStore } from '../src/main/sqliteStore';
import { SetupExistsError } from '../src/main/store';
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

/** Opens a store and always closes it when the test ends, even if an assertion fails (a lingering handle blocks cleanup on Windows). */
async function open(path: string, t: TestContext, now: () => Date = () => NOW) {
  const store = await SqliteStore.open(path, '0.1.0');
  t.after(() => { try { store.close(); } catch { /* already closed by the test */ } });
  return { store, service: new PetalService(store, now) };
}

test('a new database is empty and reports disk persistence', async t => {
  const { store, service } = await open(await tempDb(t), t);
  t.after(() => store.close());
  const state = await service.getState();
  assert.equal(state.pack, null);
  assert.deepEqual(state.events, []);
  assert.equal(state.persistence, 'disk');
});

test('setup survives closing and reopening the database file', async t => {
  const path = await tempDb(t);
  const first = await open(path, t);
  value(await first.service.saveSetup(setupInput));
  first.store.close();
  const second = await open(path, t);
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
  const first = await open(path, t);
  const doses = value(await first.service.saveSetup(setupInput)).doses;
  value(await first.service.recordIntake({ doseId: doses[9].id, status: 'taken', actualAt: '2026-10-09T21:05:00+08:00', timePrecision: 'approximate' }));
  value(await first.service.recordIntake({ doseId: doses[8].id, status: 'unsure' }));
  first.store.close();
  const second = await open(path, t);
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
  const { store, service } = await open(path, t);
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
  const { store, service } = await open(path, t);
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

test('overlapping identical taps are serialized: one entry, no failure, one audit entry', async t => {
  const path = await tempDb(t);
  const { store, service } = await open(path, t);
  const dose = value(await service.saveSetup(setupInput)).doses[9];
  const tap = { doseId: dose.id, status: 'taken' as const, actualAt: NOW.toISOString() };
  const results = await Promise.all([service.recordIntake(tap), service.recordIntake(tap), service.recordIntake(tap)]);
  assert.ok(results.every(r => r.ok), 'no tap fails with a stale-revision error');
  assert.deepEqual(results.map(r => (r.ok ? r.value.change : 'failed')).sort(), ['created', 'unchanged', 'unchanged']);
  assert.equal((await service.getState()).events.length, 1);
  store.close();
  const raw = await LocalStore.open(path);
  try {
    assert.equal((await raw.read()).backup.auditEntries.filter(a => a.entityType === 'intake-event').length, 1);
  } finally {
    raw.close();
  }
});

test('overlapping setups: exactly one succeeds and nothing is erased', async t => {
  const { service } = await open(await tempDb(t), t);
  const results = await Promise.all([service.saveSetup(setupInput), service.saveSetup(setupInput)]);
  assert.deepEqual(results.map(r => r.ok).sort(), [false, true]);
  const dose = (await service.getState()).doses[9];
  value(await service.recordIntake({ doseId: dose.id, status: 'unsure' }));
  assert.equal((await service.saveSetup(setupInput)).ok, false);
  assert.equal((await service.getState()).events.length, 1);
});

test('the store itself refuses setup over existing data', async t => {
  const path = await tempDb(t);
  const { store, service } = await open(path, t);
  const doses = value(await service.saveSetup(setupInput)).doses;
  value(await service.recordIntake({ doseId: doses[9].id, status: 'unsure' }));
  const { deriveFromSetupInput } = await import('../src/shared/setup');
  const derived = deriveFromSetupInput(setupInput);
  await assert.rejects(store.saveSetup({ profile: derived.profile, settings: derived.settings, pack: derived.pack, doses: derived.doses }), SetupExistsError);
  assert.equal((await store.load()).events.length, 1, 'existing records were not erased');
});

test('undo still works after the system clock moves backwards', async t => {
  let clock = NOW;
  const { service } = await open(await tempDb(t), t, () => clock);
  const dose = value(await service.saveSetup(setupInput)).doses[9];
  value(await service.recordIntake({ doseId: dose.id, status: 'taken', actualAt: NOW.toISOString() }));
  clock = new Date(NOW.getTime() + 60_000);
  value(await service.recordIntake({ doseId: dose.id, status: 'confirmed-missed' }));
  clock = new Date(NOW.getTime() - 3_600_000);
  const state = value(await service.undoIntake(dose.id));
  assert.equal(state.events[0].status, 'taken');
});

test('closing waits for requests already accepted', async t => {
  const { service } = await open(await tempDb(t), t);
  const pending = service.saveSetup(setupInput);
  await service.idle();
  assert.equal((await pending).ok, true);
});

test('undoing a new entry removes it from the database with an audit entry, and it survives a restart', async t => {
  const path = await tempDb(t);
  const first = await open(path, t);
  const dose = value(await first.service.saveSetup(setupInput)).doses[9];
  const created = value(await first.service.recordIntake({ doseId: dose.id, status: 'taken', actualAt: NOW.toISOString() }));
  assert.equal(created.undoable, true);
  assert.deepEqual(value(await first.service.undoIntake(dose.id)).events, []);
  first.store.close();

  const second = await open(path, t);
  assert.deepEqual((await second.service.getState()).events, [], 'the removal is durable');
  const again = value(await second.service.recordIntake({ doseId: dose.id, status: 'unsure' }));
  assert.equal(again.change, 'created', 'the tablet can be recorded again after an undo');
  second.store.close();

  const raw = await LocalStore.open(path);
  try {
    const audits = (await raw.read()).backup.auditEntries.filter(a => a.entityType === 'intake-event');
    assert.deepEqual(audits.map(a => [a.priorValue === null, a.newValue === null]), [[true, false], [false, true], [true, false]], 'create, removal and re-create are all audited');
    assert.equal((audits[1].priorValue as { status: string }).status, 'taken', 'the removed values stay in the audit trail');
  } finally {
    raw.close();
  }
});
