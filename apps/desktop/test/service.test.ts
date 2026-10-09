import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PetalService } from '../src/main/service';
import { MemoryStore } from '../src/main/store';
import type { SetupInput } from '../src/shared/ipc';

const NOW = new Date('2026-10-09T13:30:00Z'); // 21:30 on Oct 9 in Manila
const firstPack: SetupInput = { usualTime: '21:00', timeZone: 'Asia/Manila', anchor: { kind: 'first-pack', startDate: '2026-10-01' } };
const midPack: SetupInput = { usualTime: '21:00', timeZone: 'Asia/Manila', anchor: { kind: 'mid-pack', position: 10, date: '2026-10-09' } };

function setup(input: SetupInput = firstPack) {
  const service = new PetalService(new MemoryStore(), () => NOW);
  return { service, ready: service.saveSetup(input) };
}
const value = <T>(result: { ok: true; value: T } | { ok: false; message: string }): T => {
  assert.ok(result.ok, result.ok ? '' : result.message);
  return result.value;
};

test('first-pack setup saves a 28-dose schedule with no invented history', async () => {
  const { ready } = setup();
  const state = value(await ready);
  assert.equal(state.doses.length, 28);
  assert.equal(state.pack?.startDate, '2026-10-01');
  assert.deepEqual(state.events, []);
  assert.equal(state.persistence, 'memory');
  assert.equal(state.profile?.verificationState, 'unverified');
  assert.ok(state.doses.every(d => d.tabletKind === 'unverified'));
});

test('mid-pack setup anchors the stated tablet on the stated date and leaves earlier history unknown', async () => {
  const { ready } = setup(midPack);
  const state = value(await ready);
  assert.equal(state.doses[9].localDate, '2026-10-09');
  assert.equal(state.doses[0].localDate, '2026-09-30');
  assert.deepEqual(state.events, []);
});

test('invalid setup is rejected and changes nothing; setup cannot be silently replaced', async () => {
  const service = new PetalService(new MemoryStore(), () => NOW);
  const bad = await service.saveSetup({ ...firstPack, usualTime: '9pm' });
  assert.equal(bad.ok, false);
  assert.equal((await service.getState()).pack, null);
  value(await service.saveSetup(firstPack));
  const again = await service.saveSetup(midPack);
  assert.equal(again.ok, false);
  assert.equal((await service.getState()).pack?.startDate, '2026-10-01');
});

test('taken now records one event; repeating it is a no-op', async () => {
  const { service, ready } = setup();
  const dose = value(await ready).doses[8]; // Oct 9
  const first = value(await service.recordIntake({ doseId: dose.id, status: 'taken', actualAt: NOW.toISOString() }));
  assert.equal(first.change, 'created');
  assert.equal(first.state.events.length, 1);
  const again = value(await service.recordIntake({ doseId: dose.id, status: 'taken', actualAt: NOW.toISOString() }));
  assert.equal(again.change, 'unchanged');
  assert.equal(again.state.events.length, 1);
});

test('undo restores the record before the last change, or removes a new one', async () => {
  const { service, ready } = setup();
  const dose = value(await ready).doses[8];
  value(await service.recordIntake({ doseId: dose.id, status: 'taken', actualAt: NOW.toISOString() }));
  value(await service.recordIntake({ doseId: dose.id, status: 'confirmed-missed' }));
  let state = value(await service.undoIntake(dose.id));
  assert.equal(state.events[0].status, 'taken');
  assert.equal(state.events[0].actualAt, NOW.toISOString());
  const second = await service.undoIntake(dose.id);
  assert.equal(second.ok, false);
  const fresh = setup();
  const d2 = value(await fresh.ready).doses[0];
  value(await fresh.service.recordIntake({ doseId: d2.id, status: 'unsure' }));
  state = value(await fresh.service.undoIntake(d2.id));
  assert.deepEqual(state.events, []);
});

test('missed, unsure and no entry stay distinct, and two doses on one day stay separate', async () => {
  const { service, ready } = setup();
  const doses = value(await ready).doses;
  value(await service.recordIntake({ doseId: doses[7].id, status: 'confirmed-missed' }));
  value(await service.recordIntake({ doseId: doses[6].id, status: 'unsure' }));
  value(await service.recordIntake({ doseId: doses[7].id, status: 'confirmed-missed' }));
  const state = await service.getState();
  assert.deepEqual(state.events.map(e => [e.doseId, e.status]).sort(), [[doses[6].id, 'unsure'], [doses[7].id, 'confirmed-missed']].sort());
  const a = value(await service.recordIntake({ doseId: doses[4].id, status: 'taken', actualAt: '2026-10-09T20:00:00+08:00' }));
  const b = value(await service.recordIntake({ doseId: doses[5].id, status: 'taken', actualAt: '2026-10-09T21:00:00+08:00' }));
  assert.equal(b.state.events.filter(e => e.status === 'taken').length, 2);
  assert.equal(a.state.events.length + 1, b.state.events.length);
});

test('approximate and unknown times are stored as given', async () => {
  const { service, ready } = setup();
  const doses = value(await ready).doses;
  const approx = value(await service.recordIntake({ doseId: doses[0].id, status: 'taken', actualAt: '2026-10-01T21:00:00+08:00', timePrecision: 'approximate' }));
  assert.equal(approx.state.events[0].timePrecision, 'approximate');
  const unknown = value(await service.recordIntake({ doseId: doses[1].id, status: 'taken' }));
  const event = unknown.state.events.find(e => e.doseId === doses[1].id);
  assert.equal(event?.actualAt, null);
  assert.equal(event?.timePrecision, 'unknown');
});

test('bad renderer input is rejected without changing records', async () => {
  const { service, ready } = setup();
  const doses = value(await ready).doses;
  const bad: unknown[] = [
    { doseId: doses[0].id, status: 'taken-ish' },
    { doseId: 'nope', status: 'taken' },
    { doseId: doses[0].id, status: 'taken', actualAt: 'yesterday' },
    { doseId: doses[0].id, status: 'taken', actualAt: '2026-10-10T21:00:00+08:00' },
    { doseId: doses[0].id, status: 'confirmed-missed', actualAt: '2026-10-01T21:00:00+08:00' },
    null,
  ];
  for (const input of bad) assert.equal((await service.recordIntake(input as never)).ok, false);
  assert.deepEqual((await service.getState()).events, []);
  const message = await service.recordIntake({ doseId: doses[0].id, status: 'taken', actualAt: '2026-10-10T21:00:00+08:00' });
  assert.ok(!message.ok && !message.message.includes('Error:'));
});
