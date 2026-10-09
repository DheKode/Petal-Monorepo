import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyIntake, createEvidenceIndex, type Evidence, type GuidanceResult, type IntakeEvent } from '@petal/domain';
import { deriveFromSetupInput } from '../src/shared/setup';
import type { PetalState, SetupInput } from '../src/shared/ipc';
import { describeGuidance, guidanceFor } from '../src/renderer/src/guidanceView';

const NOW = new Date('2026-10-09T13:30:00Z'); // 21:30 on Oct 9 in Manila
const setup: SetupInput = { usualTime: '21:00', timeZone: 'Asia/Manila', anchor: { kind: 'mid-pack', position: 10, date: '2026-10-09' } };
const noEvidence = createEvidenceIndex([]);

function stateWith(events: IntakeEvent[] = []): PetalState {
  const { profile, settings, pack, doses } = deriveFromSetupInput(setup);
  return { profile, settings, pack, doses, events, persistence: 'disk' };
}
const eventFor = (state: PetalState, index: number, input: Parameters<typeof applyIntake>[2]) =>
  applyIntake(state.doses[index], undefined, input, NOW).event;

test('before setup there is no guidance panel', () => {
  assert.equal(guidanceFor({ profile: null, settings: null, pack: null, doses: [], events: [], persistence: 'disk' }, noEvidence), null);
});

test('with unverified product details the panel says no guidance is available, with no actions or sources', () => {
  const view = guidanceFor(stateWith(), noEvidence)!;
  assert.equal(view.status, 'unsupported');
  assert.match(view.headline, /No guidance is available yet/);
  assert.deepEqual(view.actions, []);
  assert.deepEqual(view.citations, []);
  assert.equal(view.rule, 'unsupported.not-yet-verified v0');
  assert.equal(view.relevantEventCount, 0);
  assert.deepEqual(view.flags, ['Clinical guidance has not been verified for this product.']);
});

test('missing facts name the tablet and the reason, and unknown history is not called missed', () => {
  const view = guidanceFor(stateWith(), noEvidence)!;
  assert.equal(view.missing[0].subject, 'Whole pack');
  assert.equal(view.missing[0].field, 'Product verification');
  const intake = view.missing.filter(m => m.field === 'Intake status');
  assert.equal(intake.length, 28);
  assert.equal(intake[9].subject, 'Tablet 10, 2026-10-09 at 21:00');
  assert.match(intake[9].reason, /History stays unknown until you confirm it/);
  assert.ok(view.missing.every(m => !/missed/i.test(m.reason) || /not counted as missed/i.test(m.reason)));
  assert.equal(view.missing[0].reason, 'Product-specific rules have not been reviewed and approved yet.');
  assert.ok(view.missing.every(m => !/stub/i.test(m.reason)), 'no developer wording on screen');
});

test('the panel updates as records change: entries are counted and answered facts drop out', () => {
  const base = stateWith();
  const taken = eventFor(base, 9, { status: 'taken', actualAt: NOW.toISOString() });
  let view = guidanceFor({ ...base, events: [taken] }, noEvidence)!;
  assert.equal(view.relevantEventCount, 1);
  assert.equal(view.missing.filter(m => m.field === 'Intake status').length, 27);

  const approximate = eventFor(base, 8, { status: 'taken', actualAt: '2026-10-08T21:00:00+08:00', timePrecision: 'approximate' });
  view = guidanceFor({ ...base, events: [taken, approximate] }, noEvidence)!;
  const timeFacts = view.missing.filter(m => m.field === 'Intake time');
  assert.equal(timeFacts.length, 1, 'an approximate time stays flagged and is not turned into an exact one');
  assert.match(timeFacts[0].subject, /^Tablet 9,/);

  const unsure = eventFor(base, 7, { status: 'unsure' });
  view = guidanceFor({ ...base, events: [taken, approximate, unsure] }, noEvidence)!;
  assert.equal(view.relevantEventCount, 3);
  assert.ok(view.missing.some(m => m.field === 'Intake status' && /^Tablet 8,/.test(m.subject)), 'unsure still needs the user to confirm');
});

test('the unsupported view makes no claims about safety, protection or effectiveness', () => {
  const view = guidanceFor(stateWith(), noEvidence)!;
  const text = [view.headline, ...view.flags, ...view.missing.map(m => `${m.field} ${m.reason}`)].join(' ');
  for (const word of [/\bsafe\b/i, /protect/i, /effective/i, /pregnan/i, /fertil/i, /\bcover/i]) assert.doesNotMatch(text, word);
});

test('fixed actions are shown verbatim and citations resolve only from the bundled sources', () => {
  const passage: Evidence = {
    id: 'src-1', publisher: 'Fictional Publisher', title: 'Fictional leaflet', url: 'https://example.invalid/leaflet', sectionOrPage: 'p. 3',
    excerpt: 'Fictional excerpt for a test.', publicationDate: null, retrievalDate: '2026-10-09', supportedProfileIds: ['trust-28-unverified'],
    version: '1', reviewStatus: 'reviewed',
  };
  const result: GuidanceResult = {
    status: 'supported', profileId: 'trust-28-unverified', ruleId: 'fictional.rule', ruleVersion: '2',
    relevantEventIds: ['e1'], fixedActions: [{ id: 'a1', text: 'Fictional fixed action text.' }], missingFacts: [],
    flags: ['some-unknown-flag'], evidenceIds: ['src-1', 'src-missing'],
  };
  const view = describeGuidance(result, stateWith().doses, createEvidenceIndex([passage]));
  assert.deepEqual(view.actions, [{ id: 'a1', text: 'Fictional fixed action text.' }]);
  assert.equal(view.rule, 'fictional.rule v2');
  assert.equal(view.citations[0].passage?.title, 'Fictional leaflet');
  assert.equal(view.citations[1].passage, null, 'a citation that is not bundled is reported, never invented');
  assert.deepEqual(view.flags, ['some-unknown-flag']);
});

test('records that cannot be evaluated produce an error view instead of throwing', () => {
  const base = stateWith();
  const stray: IntakeEvent = { ...eventFor(base, 9, { status: 'taken', actualAt: NOW.toISOString() }), doseId: 'not-in-this-pack' };
  const view = guidanceFor({ ...base, events: [stray] }, noEvidence)!;
  assert.equal(view.status, 'error');
  assert.match(view.headline, /Tracking still works/);
  assert.deepEqual(view.actions, []);
});

test('a reason the panel has no plain wording for is shown exactly as the domain wrote it', () => {
  const result: GuidanceResult = {
    status: 'incomplete', profileId: 'p', ruleId: 'r', ruleVersion: '1', relevantEventIds: [], fixedActions: [],
    missingFacts: [{ doseId: null, field: 'other', reason: 'A reason the panel has never seen.' }], flags: [], evidenceIds: [],
  };
  const view = describeGuidance(result, [], noEvidence);
  assert.equal(view.missing[0].reason, 'A reason the panel has never seen.');
  assert.match(view.headline, /needs more information/);
});
