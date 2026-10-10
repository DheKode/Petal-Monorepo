import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDefaultDemoState,
  getTrust28Profile,
  MobileStorageService,
} from '../src/services/storage.js';
import {
  companionAi,
  APPROVED_EVIDENCE_EXCERPTS,
  GEMMA_LOCAL_MODEL_CONFIG,
  formatGemmaPrompt,
} from '../src/services/ai.js';
import { listUnresolvedDoses, selectTakenNowTarget } from '@petal/domain';

test('Trust 28 profile verification', () => {
  const profile = getTrust28Profile();
  assert.equal(profile.product, 'Trust 28');
  assert.equal(profile.regimen, '28-tablet-pack');
  assert.equal(profile.tabletMap.length, 28);

  // 21 active white tablets, 7 non-hormonal brown tablets
  const activeTablets = profile.tabletMap.filter(t => t.kind === 'active');
  const brownTablets = profile.tabletMap.filter(t => t.kind === 'non-hormonal');
  assert.equal(activeTablets.length, 21);
  assert.equal(brownTablets.length, 7);
  assert.equal(profile.verificationState, 'verified');
});

test('Default demo state initializes correctly with Day 13 unresolved for history repair', () => {
  const store = new MobileStorageService();
  const state = store.getState();

  assert.equal(state.isConfigured, true);
  assert.equal(state.doses.length, 28);
  assert.equal(state.events.length, 12); // Days 1 to 12

  // Verify Day 13 has no entry
  const day13Dose = state.doses[12];
  const day13Event = state.events.find(e => e.doseId === day13Dose.id);
  assert.equal(day13Event, undefined);

  // Unresolved doses should include Day 13 and Day 14
  const now = new Date();
  const unresolved = listUnresolvedDoses(state.doses, state.events, now);
  assert.ok(unresolved.some(d => d.position === 13));
});

test('Setup wizard: first-pack and mid-pack schedule derivation', () => {
  const store = new MobileStorageService();

  // First pack setup
  store.setupPack({
    mode: 'first-pack',
    usualTime: '20:30',
    timeZone: 'Asia/Manila',
    startDate: '2026-10-01',
    remindersEnabled: true,
  });

  let state = store.getState();
  assert.equal(state.doses.length, 28);
  assert.equal(state.doses[0].localDate, '2026-10-01');
  assert.equal(state.doses[27].localDate, '2026-10-28');
  assert.equal(state.settings.usualTime, '20:30');

  // Mid-pack setup: on 2026-10-15 user is at tablet 15
  store.setupPack({
    mode: 'current-pack',
    usualTime: '22:00',
    timeZone: 'Asia/Manila',
    currentPosition: 15,
    currentDate: '2026-10-15',
    remindersEnabled: false,
  });

  state = store.getState();
  assert.equal(state.doses.length, 28);
  assert.equal(state.doses[14].position, 15);
  assert.equal(state.doses[14].localDate, '2026-10-15');
  assert.equal(state.settings.usualTime, '22:00');
  assert.equal(state.settings.notificationPreference, 'disabled');
});

test('Daily logging: Taken now, Taken earlier, Confirmed missed, and Undo', () => {
  const store = new MobileStorageService();
  const state = store.getState();
  const dose = state.doses[13]; // Day 14 (due today)

  // Record Taken now
  const result1 = store.recordIntake({
    doseId: dose.id,
    status: 'taken',
    actualAt: new Date().toISOString(),
    timePrecision: 'exact',
  });
  assert.equal(result1.ok, true);
  assert.equal(result1.change, 'created');

  let updatedEvent = store.getState().events.find(e => e.doseId === dose.id);
  assert.equal(updatedEvent?.status, 'taken');
  assert.equal(updatedEvent?.timePrecision, 'exact');

  // Repeat identical tap: should be unchanged
  const repeat = store.recordIntake({
    doseId: dose.id,
    status: 'taken',
    actualAt: updatedEvent?.actualAt,
    timePrecision: 'exact',
  });
  assert.equal(repeat.ok, true);
  assert.equal(repeat.change, 'unchanged');

  // Correct to confirmed-missed
  const correct = store.recordIntake({
    doseId: dose.id,
    status: 'confirmed-missed',
  });
  assert.equal(correct.ok, true);
  assert.equal(correct.change, 'corrected');
  assert.equal(correct.undoable, true);

  updatedEvent = store.getState().events.find(e => e.doseId === dose.id);
  assert.equal(updatedEvent?.status, 'confirmed-missed');
  assert.equal(updatedEvent?.actualAt, null);

  // Undo correction
  const undoResult = store.undoIntake(dose.id);
  assert.equal(undoResult.ok, true);

  const restoredEvent = store.getState().events.find(e => e.doseId === dose.id);
  assert.equal(restoredEvent?.status, 'taken');
});

test('History Repair: focused clarification and proposal generation', async () => {
  const store = new MobileStorageService();
  const state = store.getState();

  // Ask Petal to clarify unresolved history
  const question = await companionAi.clarifyHistory(state);
  assert.match(question.text, /Tablet 13/);

  // User clarifies "I took it on time"
  const proposalMsg = await companionAi.clarifyHistory(state, 'I took it on time');
  assert.ok(proposalMsg.proposal);
  assert.equal(proposalMsg.proposal?.tabletNumber, 13);
  assert.equal(proposalMsg.proposal?.afterStatus, 'taken');
  assert.equal(proposalMsg.proposal?.timePrecision, 'approximate');

  // Record proposal mutation
  const res = store.recordIntake({
    doseId: proposalMsg.proposal!.doseId,
    status: proposalMsg.proposal!.afterStatus,
    actualAt: proposalMsg.proposal!.actualAt,
    timePrecision: proposalMsg.proposal!.timePrecision,
    origin: 'chat',
  });
  assert.equal(res.ok, true);

  // Verify audit log has origin 'chat'
  const lastAudit = store.getState().audits.slice(-1)[0];
  assert.equal(lastAudit.origin, 'chat');
});

test('Sourced FAQ retrieval with approved evidence excerpts', async () => {
  const reply = await companionAi.answerFaq('What if I miss an active pill?');
  assert.match(reply.text, /miss 1 active/);
  assert.ok(reply.citations && reply.citations.length > 0);
  assert.equal(reply.citations[0].id, 'trust-leaflet-2026');

  const brownReply = await companionAi.answerFaq('What are the brown tablets?');
  assert.match(brownReply.text, /ferrous fumarate/);
  assert.equal(brownReply.citations?.[0].id, 'trust-brown-tablets');
});

test('Bleeding journal: add, list, delete', () => {
  const store = new MobileStorageService();
  store.addBleeding({
    date: '2026-10-10',
    category: 'spotting',
    intensity: 'light',
    note: 'Mild spotting during week 2',
  });

  let state = store.getState();
  const found = state.bleeding.find(b => b.startDate === '2026-10-10');
  assert.ok(found);
  assert.equal(found?.category, 'spotting');
  assert.equal(found?.intensity, 'light');

  store.deleteBleeding(found!.id);
  state = store.getState();
  assert.equal(state.bleeding.find(b => b.id === found!.id), undefined);
});

test('Data Portability: export and import JSON backup v1', () => {
  const store = new MobileStorageService();
  const jsonStr = store.exportBackupJson();
  assert.ok(jsonStr.includes('"schemaVersion": 1'));
  assert.ok(jsonStr.includes('"Trust 28"'));

  const newStore = new MobileStorageService();
  newStore.resetAll();
  assert.equal(newStore.getState().isConfigured, false);

  const importResult = newStore.importBackupJson(jsonStr);
  assert.equal(importResult.ok, true);
  assert.equal(newStore.getState().isConfigured, true);
  assert.equal(newStore.getState().doses.length, 28);
});

test('Daily logging: Undoing a freshly created intake restores no-entry state and logs audit trail', () => {
  const store = new MobileStorageService();
  const state = store.getState();
  // Dose 13 (index 12) is unresolved in demo state (no prior event)
  const dose13 = state.doses[12];
  assert.equal(state.events.find(e => e.doseId === dose13.id), undefined);

  // Record a fresh intake
  const res = store.recordIntake({
    doseId: dose13.id,
    status: 'taken',
    actualAt: new Date().toISOString(),
    timePrecision: 'exact',
  });
  assert.equal(res.ok, true);
  assert.equal(res.change, 'created');
  assert.ok(store.getState().events.find(e => e.doseId === dose13.id));

  // Undo the fresh intake
  const undoRes = store.undoIntake(dose13.id);
  assert.equal(undoRes.ok, true);

  // The event should now be completely removed (dose is back to unresolved / no entry)
  assert.equal(store.getState().events.find(e => e.doseId === dose13.id), undefined);

  // Audit entry should exist for the undo removal
  const lastAudit = store.getState().audits.slice(-1)[0];
  assert.equal(lastAudit.entityType, 'intake-event');
  assert.equal(lastAudit.newValue, null);
  assert.ok(lastAudit.priorValue !== null);
});

test('Bleeding journal: add and delete operations generate audit trail', () => {
  const store = new MobileStorageService();
  const initialAuditCount = store.getState().audits.length;

  store.addBleeding({
    date: '2026-10-09',
    category: 'spotting',
    intensity: 'light',
    note: 'Audit check spotting',
  });

  const state1 = store.getState();
  assert.equal(state1.audits.length, initialAuditCount + 1);
  const addAudit = state1.audits[state1.audits.length - 1];
  assert.equal(addAudit.entityType, 'bleeding-entry');
  assert.equal(addAudit.priorValue, null);
  assert.ok(addAudit.newValue !== null);

  const entry = state1.bleeding.find(b => b.startDate === '2026-10-09');
  assert.ok(entry);

  store.deleteBleeding(entry.id);
  const state2 = store.getState();
  assert.equal(state2.audits.length, initialAuditCount + 2);
  const delAudit = state2.audits[state2.audits.length - 1];
  assert.equal(delAudit.entityType, 'bleeding-entry');
  assert.equal(delAudit.newValue, null);
  assert.ok(delAudit.priorValue !== null);
});

test('Local AI configuration: DEC3 Gemma 4 1B IT Q4_K_M artifact and sha256', () => {
  const store = new MobileStorageService();
  const config = store.getState().settings.modelConfiguration;
  assert.ok(config);
  assert.equal(config.modelId, 'gemma-4-1b-it-q4_k_m');
  assert.equal(config.artifactSha256, '8ccc5cd1f1b3602548715ae25a66ed73fd5dc68a210412eea643eb20eb75a135');
  assert.equal(config.runtime, 'llama.rn-android');

  // Verify Gemma model metadata from Companion AI service
  const modelInfo = companionAi.getModelInfo();
  assert.equal(modelInfo.family, 'gemma4');
  assert.equal(modelInfo.modelId, 'gemma-4-1b-it-q4_k_m');
  assert.equal(modelInfo.quantization, 'Q4_K_M (4-bit)');
  assert.equal(modelInfo.artifactFileName, 'gemma-4-1b-it-Q4_K_M.gguf');
  assert.equal(modelInfo.artifactBytes, 806058240);
  assert.equal(modelInfo.artifactSha256, '8ccc5cd1f1b3602548715ae25a66ed73fd5dc68a210412eea643eb20eb75a135');

  // Verify Gemma chat prompt formatting
  const formatted = formatGemmaPrompt('You are Petal.', 'Did I take my pill today?');
  assert.ok(formatted.includes('<start_of_turn>system\nYou are Petal.<end_of_turn>'));
  assert.ok(formatted.includes('<start_of_turn>user\nDid I take my pill today?<end_of_turn>'));
  assert.ok(formatted.endsWith('<start_of_turn>model\n'));
});

test('Android SQLite Native Bridge: persistence across restarts and mutations', () => {
  const stateHolder = { savedSnapshot: null as string | null, revision: 1 };
  let saveCount = 0;
  let resetCalled = false;

  const mockNativeBridge = {
    getSnapshot: () => stateHolder.savedSnapshot,
    getRevision: () => stateHolder.revision,
    saveSnapshot: (rev: number, payload: string) => {
      stateHolder.revision = rev;
      stateHolder.savedSnapshot = payload;
      saveCount++;
      return true;
    },
    resetDatabase: () => {
      stateHolder.savedSnapshot = null;
      stateHolder.revision = 0;
      resetCalled = true;
      return true;
    },
  };

  // Simulate Android WebView environment
  (globalThis as any).window = {
    PetalNative: mockNativeBridge,
  };

  try {
    // 1. Initial boot with empty database -> initializes default demo and persists to SQLite
    const store1 = new MobileStorageService();
    assert.equal(store1.getState().isConfigured, true);
    assert.ok(saveCount >= 1, 'Initial boot immediately persisted to native SQLite');

    // 2. Log intake for Day 13 (which was empty)
    const day13Dose = store1.getState().doses[12];
    const prevSaves = saveCount;
    const res = store1.recordIntake({
      doseId: day13Dose.id,
      status: 'taken',
      actualAt: `${day13Dose.localDate}T21:00:00+08:00`,
      timePrecision: 'exact',
    });
    assert.equal(res.ok, true, res.message ?? 'Intake record failed');
    assert.ok(saveCount > prevSaves);
    assert.ok(stateHolder.savedSnapshot !== null);
    assert.ok(stateHolder.savedSnapshot?.includes(day13Dose.id));

    // 3. Simulate Android app termination and relaunch (fresh MobileStorageService instance)
    const store2 = new MobileStorageService();
    const reloadedEvent = store2.getState().events.find(e => e.doseId === day13Dose.id);
    assert.ok(reloadedEvent);
    assert.equal(reloadedEvent?.status, 'taken');

    // 4. Test resetAll clears SQLite database
    store2.resetAll();
    assert.equal(resetCalled, true);
    assert.equal(store2.getState().isConfigured, false);
  } finally {
    delete (globalThis as any).window;
  }
});

