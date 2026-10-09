import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalStore } from '@petal/storage';
import { PetalService } from '../src/main/service';
import { MemoryStore } from '../src/main/store';
import { SqliteStore } from '../src/main/sqliteStore';
import type { SetupInput } from '../src/shared/ipc';

const NOW = new Date('2026-10-09T13:30:00Z'); // 21:30 on Oct 9 in Manila, so tablet 9 is today's and tablets 10 to 28 are later
const setup: SetupInput = { usualTime: '21:00', timeZone: 'Asia/Manila', anchor: { kind: 'first-pack', startDate: '2026-10-01' } };
const value = <T>(result: { ok: true; value: T } | { ok: false; message: string }): T => {
  assert.ok(result.ok, result.ok ? '' : result.message);
  return result.value;
};

async function memory() {
  const service = new PetalService(new MemoryStore(), () => NOW);
  value(await service.saveSetup(setup));
  return service;
}

test('a new usual time moves only the tablets on later dates; today and the past keep their times', async () => {
  const service = await memory();
  const before = (await service.getState()).doses;
  const after = value(await service.changeUsualTime('08:30'));
  assert.equal(after.settings?.usualTime, '08:30');
  after.doses.forEach((dose, index) => {
    if (dose.localDate <= '2026-10-09') assert.deepEqual(dose, before[index], `tablet ${dose.position} (${dose.localDate}) must not change`);
    else assert.equal(dose.scheduledAt, `${dose.localDate}T08:30:00+08:00`, `tablet ${dose.position} moves to the new time`);
  });
  assert.equal(after.doses[8].scheduledAt, '2026-10-09T21:00:00+08:00', "today's tablet keeps its time");
  assert.equal(after.doses[9].scheduledAt, '2026-10-10T08:30:00+08:00', "tomorrow's tablet is the first to move");
  assert.equal(after.doses.length, 28);
  assert.deepEqual(after.doses.map(d => d.id), before.map(d => d.id), 'dose identities are unchanged');
});

test('entries and journal are untouched, and the same time again changes nothing', async () => {
  const service = await memory();
  const doses = (await service.getState()).doses;
  value(await service.recordIntake({ doseId: doses[8].id, status: 'taken', actualAt: NOW.toISOString() }));
  value(await service.recordIntake({ doseId: doses[11].id, status: 'unsure' }));
  value(await service.saveBleeding({ startDate: '2026-10-05', category: 'spotting' }));
  const before = await service.getState();
  const after = value(await service.changeUsualTime('07:15'));
  assert.deepEqual(after.events, before.events);
  assert.deepEqual(after.bleeding, before.bleeding);
  assert.deepEqual(value(await service.changeUsualTime('07:15')), after, 'saving the same time again is a no-op');
  assert.equal(value(await service.changeUsualTime('21:00')).doses[20].scheduledAt, '2026-10-21T21:00:00+08:00', 'it can be changed back');
});

test('an invalid time, or a change before setup, is refused and changes nothing', async () => {
  const service = await memory();
  const before = await service.getState();
  for (const bad of ['9pm', '24:00', '8:30', '', '12:60', null as never, 830 as never]) {
    const result = await service.changeUsualTime(bad);
    assert.ok(!result.ok, String(bad));
    assert.match(result.message, /hours and minutes/);
  }
  assert.deepEqual(await service.getState(), before);
  const fresh = new PetalService(new MemoryStore(), () => NOW);
  const early = await fresh.changeUsualTime('08:00');
  assert.ok(!early.ok && /setting up your pack/.test(early.message));
});

test('with the real database the change survives a restart and keeps every earlier record and audit entry', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'petal-time-'));
  t.after(() => rm(dir, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }).catch(() => {}));
  const path = join(dir, 'petal.db');
  const open = async (t2: TestContext) => {
    const store = await SqliteStore.open(path, '0.1.0');
    t2.after(() => { try { store.close(); } catch { /* closed by the test */ } });
    return { store, service: new PetalService(store, () => NOW) };
  };
  const first = await open(t);
  const doses = value(await first.service.saveSetup(setup)).doses;
  value(await first.service.recordIntake({ doseId: doses[8].id, status: 'taken', actualAt: NOW.toISOString() }));
  value(await first.service.saveBleeding({ startDate: '2026-10-05', category: 'bleeding', note: 'kept' }));
  const eventsBefore = (await first.service.getState()).events;
  value(await first.service.changeUsualTime('08:30'));
  first.store.close();

  const second = await open(t);
  const state = await second.service.getState();
  assert.equal(state.settings?.usualTime, '08:30');
  assert.equal(state.doses[9].scheduledAt, '2026-10-10T08:30:00+08:00');
  assert.equal(state.doses[8].scheduledAt, '2026-10-09T21:00:00+08:00');
  assert.deepEqual(state.events, eventsBefore);
  assert.equal(state.bleeding[0].note, 'kept');
  second.store.close();

  const raw = await LocalStore.open(path);
  t.after(() => raw.close());
  const { backup } = await raw.read();
  assert.ok(backup.auditEntries.some(a => a.entityType === 'intake-event' && a.origin === 'manual'), 'the earlier audit history is still there');
  assert.ok(backup.auditEntries.some(a => a.entityType === 'settings' && a.origin === 'import' && (a.newValue as { usualTime?: string } | null)?.usualTime === '08:30'), 'the change itself is audited');
});
