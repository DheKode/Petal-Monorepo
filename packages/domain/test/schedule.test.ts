import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveSchedule, startDateFromPosition, nextPackStartDate, applyIntake, listUnresolvedDoses, selectTakenNowTarget, compareZones,
  getIntakeState, toZonedIso, localDateIn, addDays, intakeEventId, ScheduledDoseSchema, DomainValidationError,
  type PillProfile, type IntakeEvent,
} from '../src/index.js';

const profile = (kinds?: PillProfile['tabletMap'][number]['kind'][]): PillProfile => ({
  id: 'trust-demo', product: 'Trust 28', formulation: null, ingredients: [], regimen: '28-tablet-pack',
  tabletMap: Array.from({ length: 28 }, (_, i) => ({ position: i + 1, kind: kinds?.[i] ?? 'unverified', label: `Tablet ${i + 1}` })),
  leafletVersion: null, evidenceVersion: null, evidenceIds: [], verificationState: 'unverified',
});
const manila = (startDate = '2026-10-01') => deriveSchedule({ packId: 'pack-1', profile: profile(), usualTime: '21:00', timeZone: 'Asia/Manila', startDate });
const at = (iso: string) => new Date(iso);

test('first pack derives 28 consecutive, schema-valid doses with offsets and deterministic IDs', () => {
  const { pack, doses } = manila();
  assert.equal(doses.length, 28);
  assert.deepEqual(doses.map(d => d.position), Array.from({ length: 28 }, (_, i) => i + 1));
  assert.equal(doses[0].id, 'pack-1:1');
  assert.equal(doses[0].scheduledAt, '2026-10-01T21:00:00+08:00');
  assert.equal(doses[27].localDate, '2026-10-28');
  assert.equal(pack.transitionState, 'current');
  assert.deepEqual(manila(), manila());
  for (const d of doses) assert.equal(ScheduledDoseSchema.safeParse(d).success, true);
});

test('tablet kinds come from the profile map and unverified stays unverified', () => {
  const kinds = Array.from({ length: 28 }, (_, i) => (i < 21 ? 'active' : 'non-hormonal')) as PillProfile['tabletMap'][number]['kind'][];
  const { doses } = deriveSchedule({ packId: 'p', profile: profile(kinds), usualTime: '08:30', timeZone: 'UTC', startDate: '2026-01-01' });
  assert.equal(doses.filter(d => d.tabletKind === 'active').length, 21);
  assert.equal(doses[21].tabletKind, 'non-hormonal');
  assert.equal(manila().doses[0].tabletKind, 'unverified');
});

test('mid-pack setup anchors the schedule on the stated position and date', () => {
  const start = startDateFromPosition({ position: 10, date: '2026-10-09' });
  assert.equal(start, '2026-09-30');
  const { doses } = manila(start);
  assert.equal(doses[9].localDate, '2026-10-09');
  assert.equal(nextPackStartDate(start), '2026-10-28');
  assert.throws(() => startDateFromPosition({ position: 0, date: '2026-10-09' }), DomainValidationError);
  assert.throws(() => startDateFromPosition({ position: 29, date: '2026-10-09' }), DomainValidationError);
  assert.throws(() => startDateFromPosition({ position: 5, date: '2026-02-30' }), DomainValidationError);
});

test('invalid setup input is rejected', () => {
  const base = { packId: 'p', profile: profile(), usualTime: '21:00', timeZone: 'Asia/Manila', startDate: '2026-10-01' };
  for (const bad of [{ usualTime: '9pm' }, { usualTime: '24:00' }, { timeZone: 'Mars/Base' }, { startDate: '2026-13-01' }, { packId: '' }]) {
    assert.throws(() => deriveSchedule({ ...base, ...bad }), DomainValidationError);
  }
});

test('daylight saving: offsets follow the zone while the local time of day stays fixed', () => {
  const { doses } = deriveSchedule({ packId: 'ny', profile: profile(), usualTime: '21:00', timeZone: 'America/New_York', startDate: '2026-03-06' });
  assert.equal(doses[0].scheduledAt, '2026-03-06T21:00:00-05:00');
  assert.equal(doses[1].scheduledAt, '2026-03-07T21:00:00-05:00');
  assert.equal(doses[2].scheduledAt, '2026-03-08T21:00:00-04:00');
  assert.ok(doses.every(d => d.scheduledAt.slice(11, 16) === '21:00'));
  const fall = deriveSchedule({ packId: 'ny2', profile: profile(), usualTime: '21:00', timeZone: 'America/New_York', startDate: '2026-10-31' });
  assert.equal(fall.doses[0].scheduledAt, '2026-10-31T21:00:00-04:00');
  assert.equal(fall.doses[2].scheduledAt, '2026-11-02T21:00:00-05:00');
});

test('a wall time skipped by daylight saving resolves forward on the same local date', () => {
  const { doses } = deriveSchedule({ packId: 'gap', profile: profile(), usualTime: '02:30', timeZone: 'America/New_York', startDate: '2026-03-07' });
  const skipped = doses[1];
  assert.equal(skipped.localDate, '2026-03-08');
  assert.equal(skipped.scheduledAt, '2026-03-08T03:30:00-04:00');
});

test('time helpers agree with each other', () => {
  const instant = at('2026-10-09T13:00:00Z');
  assert.equal(toZonedIso(instant, 'Asia/Manila'), '2026-10-09T21:00:00+08:00');
  assert.equal(toZonedIso(instant, 'UTC'), '2026-10-09T13:00:00+00:00');
  assert.equal(localDateIn(at('2026-10-09T17:00:00Z'), 'Asia/Manila'), '2026-10-10');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-03-01', -1), '2028-02-29');
});

const firstDose = () => manila().doses[0];

test('taken now creates one deterministic current event with an exact time', () => {
  const dose = firstDose();
  const now = at('2026-10-01T13:05:00Z');
  const { event, change } = applyIntake(dose, undefined, { status: 'taken', actualAt: now.toISOString() }, now);
  assert.equal(change, 'created');
  assert.equal(event.id, intakeEventId(dose.id));
  assert.equal(event.timePrecision, 'exact');
  assert.equal(event.createdAt, '2026-10-01T21:05:00+08:00');
});

test('repeating the same entry is a no-op, so a dose cannot be confirmed twice by accident', () => {
  const dose = firstDose();
  const now = at('2026-10-01T13:05:00Z');
  const first = applyIntake(dose, undefined, { status: 'taken', actualAt: now.toISOString() }, now).event;
  const again = applyIntake(dose, first, { status: 'taken', actualAt: '2026-10-01T21:05:00+08:00' }, at('2026-10-01T13:06:00Z'));
  assert.equal(again.change, 'unchanged');
  assert.equal(again.event, first);
});

test('corrections keep the event ID and creation time and only change what was edited', () => {
  const dose = firstDose();
  const t1 = at('2026-10-01T13:05:00Z');
  const created = applyIntake(dose, undefined, { status: 'taken', actualAt: t1.toISOString() }, t1).event;
  const t2 = at('2026-10-02T01:00:00Z');
  const { event, change } = applyIntake(dose, created, { status: 'confirmed-missed', origin: 'chat' }, t2);
  assert.equal(change, 'corrected');
  assert.equal(event.id, created.id);
  assert.equal(event.createdAt, created.createdAt);
  assert.equal(event.updatedAt, '2026-10-02T09:00:00+08:00');
  assert.equal(event.status, 'confirmed-missed');
  assert.equal(event.actualAt, null);
  assert.equal(event.timePrecision, 'unknown');
  assert.equal(event.origin, 'chat');
});

test('approximate and unknown times are preserved, never promoted to exact', () => {
  const dose = firstDose();
  const now = at('2026-10-02T03:00:00Z');
  const approx = applyIntake(dose, undefined, { status: 'taken', actualAt: '2026-10-01T21:00:00+08:00', timePrecision: 'approximate' }, now).event;
  assert.equal(approx.timePrecision, 'approximate');
  const unknown = applyIntake(dose, undefined, { status: 'taken' }, now).event;
  assert.equal(unknown.actualAt, null);
  assert.equal(unknown.timePrecision, 'unknown');
  const corrected = applyIntake(dose, approx, { status: 'taken', actualAt: '2026-10-01T21:00:00+08:00' }, now);
  assert.equal(corrected.change, 'corrected');
});

test('invalid intake input is rejected without producing an event', () => {
  const dose = firstDose();
  const now = at('2026-10-01T13:05:00Z');
  assert.throws(() => applyIntake(dose, undefined, { status: 'confirmed-missed', actualAt: now.toISOString() }, now), DomainValidationError);
  assert.throws(() => applyIntake(dose, undefined, { status: 'unsure', timePrecision: 'exact' }, now), DomainValidationError);
  assert.throws(() => applyIntake(dose, undefined, { status: 'taken', actualAt: '2026-10-02T21:00:00+08:00' }, now), DomainValidationError);
  const other = manila().doses[1];
  const mine = applyIntake(dose, undefined, { status: 'taken' }, now).event;
  assert.throws(() => applyIntake(other, mine, { status: 'taken' }, now), DomainValidationError);
});

test('no entry, confirmed missed, unsure and taken stay distinct states', () => {
  const doses = manila().doses;
  const now = at('2026-10-05T13:00:00Z');
  const mk = (i: number, status: IntakeEvent['status']) => applyIntake(doses[i], undefined, { status }, now).event;
  const events = [mk(0, 'taken'), mk(1, 'confirmed-missed'), mk(2, 'unsure')];
  assert.deepEqual([0, 1, 2, 3].map(i => getIntakeState(doses[i].id, events)), ['taken', 'confirmed-missed', 'unsure', 'no-entry']);
});

test('two doses taken on one day stay separate events', () => {
  const doses = manila().doses;
  const now = at('2026-10-03T14:00:00Z');
  const a = applyIntake(doses[1], undefined, { status: 'taken', actualAt: '2026-10-03T20:00:00+08:00' }, now).event;
  const b = applyIntake(doses[2], undefined, { status: 'taken', actualAt: '2026-10-03T21:30:00+08:00' }, now).event;
  assert.notEqual(a.id, b.id);
  assert.equal(a.actualAt?.slice(0, 10), b.actualAt?.slice(0, 10));
  assert.deepEqual([getIntakeState(doses[1].id, [a, b]), getIntakeState(doses[2].id, [a, b])], ['taken', 'taken']);
});

test('unresolved doses are those due with no entry or unsure; missed and taken are resolved', () => {
  const doses = manila().doses;
  const now = at('2026-10-04T14:00:00Z'); // 22:00 on Oct 4 in Manila: doses 1-4 are due
  const mk = (i: number, status: IntakeEvent['status']) => applyIntake(doses[i], undefined, { status }, now).event;
  const unresolved = listUnresolvedDoses(doses, [mk(0, 'taken'), mk(1, 'confirmed-missed'), mk(2, 'unsure')], now);
  assert.deepEqual(unresolved.map(d => d.position), [3, 4]);
});

test('mid-pack onboarding: Taken now targets today, older unknown history is reported but never chosen', () => {
  const doses = manila(startDateFromPosition({ position: 10, date: '2026-10-09' })).doses;
  const now = at('2026-10-09T13:30:00Z'); // 21:30 Oct 9 in Manila
  const target = selectTakenNowTarget(doses, [], now);
  assert.equal(target.dose?.position, 10);
  assert.equal(target.reason, 'todays-dose');
  assert.deepEqual(target.alternatives.map(d => d.position), [9]);
  assert.deepEqual(target.olderUnresolved.map(d => d.position), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(target.nextUpcoming?.position, 11);
});

test('Taken now falls back to a recent unresolved dose when today is already recorded', () => {
  const doses = manila(startDateFromPosition({ position: 10, date: '2026-10-09' })).doses;
  const now = at('2026-10-09T13:30:00Z');
  const todays = applyIntake(doses[9], undefined, { status: 'taken', actualAt: now.toISOString() }, now).event;
  const target = selectTakenNowTarget(doses, [todays], now);
  assert.equal(target.dose?.position, 9);
  assert.equal(target.reason, 'earliest-recent-unresolved');
});

test('Taken now reports nothing due before the first dose of the day and after everything is recorded', () => {
  const doses = manila('2026-10-09').doses;
  const early = selectTakenNowTarget(doses, [], at('2026-10-09T01:00:00Z')); // 09:00, dose due at 21:00
  assert.equal(early.dose, null);
  assert.equal(early.reason, 'none-due');
  assert.equal(early.nextUpcoming?.position, 1);
  const now = at('2026-10-09T13:30:00Z');
  const done = selectTakenNowTarget(doses, [applyIntake(doses[0], undefined, { status: 'taken' }, now).event], now);
  assert.equal(done.dose, null);
  assert.equal(done.nextUpcoming?.position, 2);
});

test('zone comparison never moves the schedule and distinguishes equal offsets', () => {
  const now = at('2026-10-09T13:00:00Z');
  assert.equal(compareZones('Asia/Manila', 'Asia/Manila', now), 'same');
  assert.equal(compareZones('Asia/Manila', 'Asia/Singapore', now), 'equivalent-offset');
  assert.equal(compareZones('Asia/Manila', 'America/New_York', now), 'different');
});

test('an ambiguous wall time (clocks go back) resolves to its first occurrence', () => {
  const { doses } = deriveSchedule({ packId: 'amb', profile: profile(), usualTime: '01:30', timeZone: 'America/New_York', startDate: '2026-10-31' });
  assert.equal(doses[1].localDate, '2026-11-01');
  assert.equal(doses[1].scheduledAt, '2026-11-01T01:30:00-04:00');
});

test('southern-hemisphere daylight saving and half-hour zones derive valid doses', () => {
  const sydney = deriveSchedule({ packId: 'syd', profile: profile(), usualTime: '02:30', timeZone: 'Australia/Sydney', startDate: '2026-10-03' });
  assert.equal(sydney.doses[0].scheduledAt, '2026-10-03T02:30:00+10:00');
  assert.equal(sydney.doses[1].scheduledAt, '2026-10-04T03:30:00+11:00');
  const india = deriveSchedule({ packId: 'ist', profile: profile(), usualTime: '07:15', timeZone: 'Asia/Kolkata', startDate: '2026-10-01' });
  assert.equal(india.doses[0].scheduledAt, '2026-10-01T07:15:00+05:30');
});
