import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStore } from '@petal/storage';
import { PetalService } from '../src/main/service';
import { MemoryStore } from '../src/main/store';
import { SqliteStore } from '../src/main/sqliteStore';
import type { BleedingInput, SetupInput } from '../src/shared/ipc';

const NOW = new Date('2026-10-09T13:30:00Z'); // 21:30 on Oct 9 in Manila, so "today" is 2026-10-09 in the schedule's zone
const setupInput: SetupInput = { usualTime: '21:00', timeZone: 'Asia/Manila', anchor: { kind: 'first-pack', startDate: '2026-10-01' } };
const value = <T>(result: { ok: true; value: T } | { ok: false; message: string }): T => {
  assert.ok(result.ok, result.ok ? '' : result.message);
  return result.value;
};
const entry = (extra: Partial<BleedingInput> = {}): BleedingInput => ({ startDate: '2026-10-05', category: 'bleeding', ...extra });

async function memory() {
  const service = new PetalService(new MemoryStore(), () => NOW);
  value(await service.saveSetup(setupInput));
  return service;
}

async function tempDb(t: TestContext) {
  const dir = await mkdtemp(join(tmpdir(), 'petal-bleed-'));
  t.after(() => rm(dir, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }).catch(() => {}));
  return join(dir, 'petal.db');
}
async function disk(path: string, t: TestContext) {
  const store = await SqliteStore.open(path, '0.1.0');
  t.after(() => { try { store.close(); } catch { /* closed by the test */ } });
  return { store, service: new PetalService(store, () => NOW) };
}

test('an entry is created with a generated id, a trimmed note and optional fields left empty', async () => {
  const service = await memory();
  const state = value(await service.saveBleeding(entry({ endDate: '2026-10-07', intensity: 'moderate', note: '  from memory  ' })));
  assert.equal(state.bleeding.length, 1);
  const saved = state.bleeding[0];
  assert.match(saved.id, /^bleeding-/);
  assert.deepEqual([saved.startDate, saved.endDate, saved.category, saved.intensity, saved.note], ['2026-10-05', '2026-10-07', 'bleeding', 'moderate', 'from memory']);
  const minimal = value(await service.saveBleeding({ startDate: '2026-10-08', category: 'spotting', note: '   ' })).bleeding.find(e => e.startDate === '2026-10-08')!;
  assert.deepEqual([minimal.endDate, minimal.intensity, minimal.note], [null, null, null]);
});

test('an entry can be edited and keeps its id; saving it unchanged writes nothing', async () => {
  const service = await memory();
  const created = value(await service.saveBleeding(entry({ note: 'first' }))).bleeding[0];
  const edited = value(await service.saveBleeding({ ...entry({ category: 'spotting', intensity: 'light', note: null }), id: created.id })).bleeding;
  assert.equal(edited.length, 1);
  assert.deepEqual([edited[0].id, edited[0].category, edited[0].intensity, edited[0].note], [created.id, 'spotting', 'light', null]);
  const again = value(await service.saveBleeding({ ...entry({ category: 'spotting', intensity: 'light' }), id: created.id }));
  assert.deepEqual(again.bleeding, edited);
  const missing = await service.saveBleeding({ ...entry(), id: 'bleeding-gone' });
  assert.ok(!missing.ok && missing.message === 'That entry no longer exists.');
});

test('an entry can be deleted, and deleting an unknown or malformed id changes nothing', async () => {
  const service = await memory();
  const [first, second] = [value(await service.saveBleeding(entry())).bleeding[0], value(await service.saveBleeding(entry({ startDate: '2026-10-06' }))).bleeding[1]];
  assert.deepEqual(value(await service.deleteBleeding(first.id)).bleeding.map(e => e.id), [second.id]);
  for (const id of ['bleeding-gone', '', 'not an id!', null as never]) assert.equal((await service.deleteBleeding(id)).ok, false);
  assert.equal((await service.getState()).bleeding.length, 1);
});

test('invalid entries are refused with a plain reason that never repeats what was typed', async () => {
  const service = await memory();
  const secret = 'SECRET-NOTE-TEXT';
  const bad: [BleedingInput, RegExp][] = [
    [entry({ startDate: '2026-02-30', note: secret }), /valid start date/],
    [entry({ startDate: 'yesterday', note: secret }), /valid start date/],
    [entry({ endDate: '2026-10-01', note: secret }), /end date, on or after the start date/],
    [entry({ startDate: '2026-10-10', note: secret }), /start date cannot be in the future/],
    [entry({ endDate: '2026-10-10', note: secret }), /end date cannot be in the future/],
    [{ ...entry({ note: secret }), category: 'heavy' as never }, /bleeding or spotting/],
    [entry({ intensity: 'severe' as never, note: secret }), /light, moderate or heavy/],
    [entry({ note: secret + 'x'.repeat(4000) }), /too long/],
    [null as never, /valid start date/],
  ];
  for (const [input, reason] of bad) {
    const result = await service.saveBleeding(input);
    assert.ok(!result.ok, JSON.stringify(input).slice(0, 80));
    assert.match(result.message, reason);
    assert.ok(!result.message.includes(secret), 'the message must not repeat the note');
  }
  assert.deepEqual((await service.getState()).bleeding, []);
  assert.equal((await service.saveBleeding(entry({ startDate: '2026-10-09', endDate: '2026-10-09' }))).ok, true, 'today is allowed');
});

test('the journal needs a finished setup, and it does not touch tablet entries or guidance input', async () => {
  const fresh = new PetalService(new MemoryStore(), () => NOW);
  const early = await fresh.saveBleeding(entry());
  assert.ok(!early.ok && /setting up your pack/.test(early.message));

  const service = await memory();
  const doses = (await service.getState()).doses;
  value(await service.recordIntake({ doseId: doses[7].id, status: 'confirmed-missed' }));
  const before = (await service.getState()).events;
  value(await service.saveBleeding(entry()));
  value(await service.saveBleeding(entry({ startDate: '2026-10-06', category: 'spotting' })));
  assert.deepEqual((await service.getState()).events, before, 'bleeding entries never change intake records');
});

test('overlapping saves are all kept, one at a time', async () => {
  const service = await memory();
  const results = await Promise.all(['2026-10-01', '2026-10-02', '2026-10-03'].map(startDate => service.saveBleeding(entry({ startDate }))));
  assert.ok(results.every(r => r.ok));
  assert.equal((await service.getState()).bleeding.length, 3);
});

test('with the real database, create, edit and delete are audited and survive a restart', async t => {
  const path = await tempDb(t);
  const first = await disk(path, t);
  value(await first.service.saveSetup(setupInput));
  const created = value(await first.service.saveBleeding(entry({ intensity: 'light', note: 'one' }))).bleeding[0];
  value(await first.service.saveBleeding({ ...entry({ intensity: 'heavy', note: 'two' }), id: created.id }));
  const keep = value(await first.service.saveBleeding(entry({ startDate: '2026-10-07' }))).bleeding.find(e => e.startDate === '2026-10-07')!;
  value(await first.service.deleteBleeding(created.id));
  first.store.close();

  const second = await disk(path, t);
  assert.deepEqual((await second.service.getState()).bleeding.map(e => e.id), [keep.id], 'what was deleted stays deleted');
  second.store.close();

  const raw = await LocalStore.open(path);
  t.after(() => raw.close());
  const audits = (await raw.read()).backup.auditEntries.filter(a => a.entityType === 'bleeding-entry' && a.entityId === created.id);
  assert.deepEqual(audits.map(a => [a.priorValue === null, a.newValue === null]), [[true, false], [false, false], [false, true]], 'create, edit and delete are all audited');
  assert.equal((audits[2].priorValue as { note: string }).note, 'two', 'the deleted values stay in the audit trail');
});

test('bleeding entries are part of a backup and come back after an import', async t => {
  const source = await disk(await tempDb(t), t);
  value(await source.service.saveSetup(setupInput));
  value(await source.service.saveBleeding(entry({ intensity: 'moderate', note: 'carried over' })));
  const { json } = await source.store.exportJson();

  const target = await disk(await tempDb(t), t);
  const preview = await target.store.previewImport(json);
  assert.equal(preview.incoming.bleedingEntries, 1);
  const { state } = await target.store.confirmImport(preview.token);
  assert.equal(state.bleeding.length, 1);
  assert.deepEqual([state.bleeding[0].intensity, state.bleeding[0].note], ['moderate', 'carried over']);
});

test('setup still refuses to run over an existing journal', async t => {
  const { store, service } = await disk(await tempDb(t), t);
  value(await service.saveSetup(setupInput));
  value(await service.saveBleeding(entry()));
  const second = await service.saveSetup(setupInput);
  assert.equal(second.ok, false);
  assert.equal((await service.getState()).bleeding.length, 1);
  void store;
});
