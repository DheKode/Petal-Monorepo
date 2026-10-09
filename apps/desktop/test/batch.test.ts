import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStore } from '@petal/storage';
import { PetalService } from '../src/main/service';
import { MemoryStore } from '../src/main/store';
import { SqliteStore } from '../src/main/sqliteStore';
import { MAX_BATCH, type RecordIntakeInput, type SetupInput } from '../src/shared/ipc';

const NOW = new Date('2026-10-09T13:30:00Z'); // 21:30 on Oct 9 in Manila; tablets 1-9 of this pack are due
const firstPack: SetupInput = { usualTime: '21:00', timeZone: 'Asia/Manila', anchor: { kind: 'first-pack', startDate: '2026-10-01' } };

const value = <T>(result: { ok: true; value: T } | { ok: false; message: string }): T => {
  assert.ok(result.ok, result.ok ? '' : result.message);
  return result.value;
};

class FailingStore extends MemoryStore {
  /** Throw on the nth call to putIntakeEvent (1-based). */
  failOnCall = 0;
  private calls = 0;
  override async putIntakeEvent(event: Parameters<MemoryStore['putIntakeEvent']>[0]) {
    this.calls += 1;
    if (this.calls === this.failOnCall) throw new Error('simulated storage failure');
    return super.putIntakeEvent(event);
  }
}

async function ready(store: MemoryStore = new MemoryStore()) {
  const service = new PetalService(store, () => NOW);
  const doses = value(await service.saveSetup(firstPack)).doses;
  const entry = (position: number, extra: Partial<RecordIntakeInput> = {}): RecordIntakeInput => ({ doseId: doses[position - 1].id, status: 'unsure', ...extra });
  return { service, doses, entry };
}

test('a reviewed set of entries is saved together, counted, and later undo entries are cleared', async () => {
  const { service, doses, entry } = await ready();
  value(await service.recordIntake({ doseId: doses[6].id, status: 'taken', actualAt: NOW.toISOString() }));
  value(await service.recordIntake({ doseId: doses[6].id, status: 'confirmed-missed' })); // a correction, so it has an undo entry
  const outcome = value(await service.recordIntakeBatch([
    entry(9, { status: 'confirmed-missed' }),
    entry(8, { status: 'taken', actualAt: '2026-10-08T21:00:00+08:00', timePrecision: 'approximate' }),
    entry(7, { status: 'unsure' }),
  ]));
  assert.equal(outcome.applied, 3);
  assert.equal(outcome.unchanged, 0);
  const byDose = new Map(outcome.state.events.map(e => [e.doseId, e]));
  assert.equal(byDose.get(doses[8].id)?.status, 'confirmed-missed');
  assert.equal(byDose.get(doses[7].id)?.timePrecision, 'approximate');
  assert.equal(byDose.get(doses[6].id)?.status, 'unsure');
  assert.equal((await service.undoIntake(doses[6].id)).ok, false, 'a stale undo entry would restore the wrong thing');
});

test('nothing is written when any entry is invalid, including the valid ones before it', async () => {
  const { service, doses, entry } = await ready();
  const bad: RecordIntakeInput[][] = [
    [entry(9), { doseId: doses[8].id, status: 'not-a-status' as never }],
    [entry(9), entry(8, { status: 'taken', actualAt: '2026-10-10T21:00:00+08:00' })],
    [entry(9), { doseId: 'not-in-this-pack', status: 'unsure' }],
    [entry(9), entry(9, { status: 'confirmed-missed' })],
    [entry(9), entry(8, { status: 'confirmed-missed', actualAt: '2026-10-08T21:00:00+08:00' })],
  ];
  for (const inputs of bad) assert.equal((await service.recordIntakeBatch(inputs)).ok, false);
  assert.deepEqual((await service.getState()).events, [], 'every attempt left the records untouched');
});

test('the size of a set is bounded', async () => {
  const { service, entry } = await ready();
  assert.equal((await service.recordIntakeBatch([])).ok, false);
  assert.equal((await service.recordIntakeBatch(Array.from({ length: MAX_BATCH + 1 }, () => entry(9)))).ok, false);
  assert.equal((await service.recordIntakeBatch('nope' as never)).ok, false);
});

test('entries that already match are counted as unchanged, so confirming twice is harmless', async () => {
  const { service, entry } = await ready();
  const inputs = [entry(9, { status: 'confirmed-missed' }), entry(8)];
  const first = value(await service.recordIntakeBatch(inputs));
  const again = value(await service.recordIntakeBatch(inputs));
  assert.deepEqual([first.applied, first.unchanged], [2, 0]);
  assert.deepEqual([again.applied, again.unchanged], [0, 2]);
  assert.equal(again.state.events.length, 2);
});

test('a storage failure part-way reports how many were saved and keeps what was saved', async () => {
  const store = new FailingStore();
  const { service, entry } = await ready(store);
  store.failOnCall = 2;
  const result = await service.recordIntakeBatch([entry(9, { status: 'confirmed-missed' }), entry(8), entry(7)]);
  assert.equal(result.ok, false);
  assert.match(!result.ok ? result.message : '', /Saved 1 of 3 changes/);
  assert.equal((await service.getState()).events.length, 1);
  const retry = value(await service.recordIntakeBatch([entry(9, { status: 'confirmed-missed' }), entry(8), entry(7)]));
  assert.deepEqual([retry.applied, retry.unchanged], [2, 1], 'retrying finishes the job without duplicating the saved entry');
});

test('with the real database, every entry in a confirmed set is saved and audited, and survives a restart', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'petal-batch-'));
  t.after(() => rm(dir, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }).catch(() => {}));
  const path = join(dir, 'petal.db');
  const open = async (t2: TestContext) => {
    const store = await SqliteStore.open(path, '0.1.0');
    t2.after(() => { try { store.close(); } catch { /* already closed */ } });
    return { store, service: new PetalService(store, () => NOW) };
  };
  const first = await open(t);
  const doses = value(await first.service.saveSetup(firstPack)).doses;
  value(await first.service.recordIntakeBatch([
    { doseId: doses[8].id, status: 'confirmed-missed' },
    { doseId: doses[7].id, status: 'taken', actualAt: '2026-10-08T21:00:00+08:00', timePrecision: 'approximate' },
    { doseId: doses[6].id, status: 'taken' },
  ]));
  first.store.close();

  const second = await open(t);
  const events = (await second.service.getState()).events;
  assert.deepEqual(events.map(e => e.status).sort(), ['confirmed-missed', 'taken', 'taken']);
  assert.equal(events.find(e => e.doseId === doses[7].id)?.timePrecision, 'approximate');
  assert.equal(events.some(e => e.doseId === doses[0].id), false, 'tablets that were not answered stay without an entry');
  second.store.close();

  const raw = await LocalStore.open(path);
  t.after(() => raw.close());
  assert.equal((await raw.read()).backup.auditEntries.filter(a => a.entityType === 'intake-event').length, 3);
});
