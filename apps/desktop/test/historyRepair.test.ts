import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyIntake, type IntakeEvent } from '@petal/domain';
import { deriveFromSetupInput } from '../src/shared/setup';
import type { PetalState, SetupInput } from '../src/shared/ipc';
import { proposeChanges, questionsFor, toInput, type Answer } from '../src/renderer/src/historyRepair';

const NOW = new Date('2026-10-09T13:30:00Z'); // 21:30 on Oct 9 in Manila; tablets 1-10 of this pack are due
const setup: SetupInput = { usualTime: '21:00', timeZone: 'Asia/Manila', anchor: { kind: 'mid-pack', position: 10, date: '2026-10-09' } };

function stateWith(events: IntakeEvent[] = []): PetalState {
  const { profile, settings, pack, doses } = deriveFromSetupInput(setup);
  return { profile, settings, pack, doses, events, bleeding: [], persistence: 'disk' };
}
const answers = (entries: [number, Answer][], state: PetalState) => new Map(entries.map(([position, answer]) => [state.doses[position - 1].id, answer]));

test('the questions are the due tablets that are unknown or unsure, newest first', () => {
  const state = stateWith();
  const asked = questionsFor(state, NOW);
  assert.deepEqual(asked.map(d => d.position), [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  const taken = applyIntake(state.doses[9], undefined, { status: 'taken', actualAt: NOW.toISOString() }, NOW).event;
  const missed = applyIntake(state.doses[8], undefined, { status: 'confirmed-missed' }, NOW).event;
  const unsure = applyIntake(state.doses[7], undefined, { status: 'unsure' }, NOW).event;
  assert.deepEqual(questionsFor({ ...state, events: [taken, missed, unsure] }, NOW).map(d => d.position), [8, 7, 6, 5, 4, 3, 2, 1].filter(p => p !== 9 && p !== 10),
    'taken and confirmed missed are settled; unsure is asked again');
});

test('each answer becomes the right entry, and remembered times are always approximate', () => {
  const dose = stateWith().doses[7];
  assert.deepEqual(toInput(dose, { kind: 'taken-usual' }), { doseId: dose.id, status: 'taken', actualAt: dose.scheduledAt, timePrecision: 'approximate' });
  assert.deepEqual(toInput(dose, { kind: 'taken-time', at: '2026-10-08T20:30:00+08:00' }), { doseId: dose.id, status: 'taken', actualAt: '2026-10-08T20:30:00+08:00', timePrecision: 'approximate' });
  assert.deepEqual(toInput(dose, { kind: 'taken-unknown' }), { doseId: dose.id, status: 'taken' });
  assert.deepEqual(toInput(dose, { kind: 'missed' }), { doseId: dose.id, status: 'confirmed-missed' });
  assert.deepEqual(toInput(dose, { kind: 'unsure' }), { doseId: dose.id, status: 'unsure' });
});

test('the preview shows before and after for each change, oldest tablet first, and skipped tablets are absent', () => {
  const state = stateWith();
  const proposal = proposeChanges(state, answers([[9, { kind: 'missed' }], [7, { kind: 'taken-unknown' }], [8, { kind: 'taken-usual' }]], state), NOW);
  assert.deepEqual(proposal.changes.map(c => c.tablet), [7, 8, 9]);
  assert.deepEqual(proposal.changes.map(c => [c.before, c.after]), [
    ['No entry', 'Taken (time unknown)'],
    ['No entry', 'Taken at 2026-10-07 21:00 (approximate)'],
    ['No entry', 'Confirmed missed'],
  ]);
  assert.equal(proposal.unchanged, 0);
  assert.deepEqual(proposal.problems, []);
  assert.equal(proposeChanges(state, new Map(), NOW).changes.length, 0, 'answering nothing proposes nothing');
});

test('answers that match the records are reported as unchanged, not as changes', () => {
  const state = stateWith();
  const unsure = applyIntake(state.doses[7], undefined, { status: 'unsure' }, NOW).event;
  const proposal = proposeChanges({ ...state, events: [unsure] }, answers([[8, { kind: 'unsure' }], [9, { kind: 'unsure' }]], state), NOW);
  assert.equal(proposal.unchanged, 1);
  assert.deepEqual(proposal.changes.map(c => c.tablet), [9]);
});

test('an unsure tablet can be settled, and the preview says what it was', () => {
  const state = stateWith();
  const unsure = applyIntake(state.doses[7], undefined, { status: 'unsure' }, NOW).event;
  const proposal = proposeChanges({ ...state, events: [unsure] }, answers([[8, { kind: 'missed' }]], state), NOW);
  assert.deepEqual([proposal.changes[0].before, proposal.changes[0].after], ['Unsure', 'Confirmed missed']);
});

test('a time in the future cannot be saved and is reported with the reason', () => {
  const state = stateWith();
  const proposal = proposeChanges(state, answers([[9, { kind: 'taken-time', at: '2026-10-10T21:00:00+08:00' }], [8, { kind: 'missed' }]], state), NOW);
  assert.equal(proposal.problems.length, 1);
  assert.match(proposal.problems[0].message, /future/i);
  assert.equal(proposal.changes.length, 1, 'other answers are still previewed');
});
