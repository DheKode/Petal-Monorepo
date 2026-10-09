import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@libsql/client';
import { serializeBackup, parseBackupJson, getIntakeState, type BleedingEntry } from '@petal/domain';
import { LocalStore, StorageError } from '../src/index.js';
import { fixture } from './fixtures.js';

// Follow-ups from the review of PR #28 (issue #37). On Windows the SQLite driver keeps a file locked for a moment after
// close(), so temp-folder cleanup is best effort and never fails a test.
const cleanup = (dir: string) => rm(dir, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }).catch(() => {});

async function setup(t: test.TestContext) {
  const dir = await mkdtemp(join(tmpdir(), 'petal-ops-'));
  const path = join(dir, 'records.db');
  const store = await LocalStore.open(path);
  t.after(async () => { try { store.close(); } catch { /* closed by the test */ } await cleanup(dir); });
  return { store, path };
}
const seed = async (store: LocalStore) => store.confirm((await store.previewImport(serializeBackup(fixture()))).token);
const code = (expected: string) => (e: unknown) => e instanceof StorageError && e.code === expected;
const bleeding = (id: string, extra: Partial<BleedingEntry> = {}): BleedingEntry => ({
  id, startDate: '2026-10-05', endDate: null, category: 'bleeding', intensity: null, note: null, ...extra,
});

test('removing an intake event is previewed, audited with the deleted values, and changes guidance input', async t => {
  const { store } = await setup(t);
  await seed(store);
  const before = await store.read();
  const old = before.backup.intakeEvents[0]!;
  const preview = await store.previewIntakeRemoval(old.doseId, 'manual');
  assert.deepEqual(preview.changes, [{ prior: old, next: null }]);
  assert.deepEqual(await store.read(), before, 'a preview writes nothing');
  await store.confirm(preview.token);
  const after = (await store.read()).backup;
  assert.equal(after.intakeEvents.length, 0);
  assert.equal(getIntakeState(old.doseId, after.intakeEvents), 'no-entry');
  const audit = after.auditEntries.at(-1)!;
  assert.deepEqual([audit.entityType, audit.entityId, audit.newValue, audit.origin], ['intake-event', old.id, null, 'manual']);
  assert.deepEqual(audit.priorValue, old);
  await assert.rejects(store.previewIntakeRemoval(old.doseId, 'manual'), code('unknown-entry'));
  await assert.rejects(store.previewIntakeRemoval('dose-2', 'import' as 'manual'), code('invalid-correction'));
});

test('a cancelled removal changes nothing, and a stale removal cannot be applied', async t => {
  const { store, path } = await setup(t);
  await seed(store);
  const doseId = (await store.read()).backup.intakeEvents[0]!.doseId;
  const cancelled = await store.previewIntakeRemoval(doseId, 'manual');
  store.cancel(cancelled.token);
  await assert.rejects(store.confirm(cancelled.token), code('invalid-preview'));
  const stale = await store.previewIntakeRemoval(doseId, 'manual');
  const other = await LocalStore.open(path);
  t.after(() => other.close());
  await other.confirm((await other.previewBleedingEntry(bleeding('b-1'), 'manual')).token);
  await assert.rejects(store.confirm(stale.token), code('stale-preview'));
  assert.equal((await store.read()).backup.intakeEvents.length, 1);
});

test('bleeding entries can be created, edited and deleted with a preview, an audit entry and persistence', async t => {
  const { store, path } = await setup(t);
  await seed(store);
  const before = await store.read();
  const created = await store.previewBleedingEntry(bleeding('b-1', { note: 'first' }), 'manual');
  assert.equal(created.kind, 'bleeding');
  assert.deepEqual(created.bleedingChanges, [{ prior: null, next: bleeding('b-1', { note: 'first' }) }]);
  assert.deepEqual(created.changes, []);
  assert.deepEqual(await store.read(), before, 'a preview writes nothing');
  await store.confirm(created.token);

  const edited = await store.previewBleedingEntry(bleeding('b-1', { category: 'spotting', intensity: 'light', endDate: '2026-10-06', note: null }), 'manual');
  assert.equal(edited.bleedingChanges[0]!.prior!.note, 'first');
  await store.confirm(edited.token);
  let backup = (await store.read()).backup;
  const mine = backup.bleedingEntries.filter(e => e.id === 'b-1');
  assert.equal(mine.length, 1, 'an edit replaces the entry, it does not add one');
  assert.equal(backup.bleedingEntries.length, before.backup.bleedingEntries.length + 1, 'the entries that were already there are untouched');
  assert.deepEqual([mine[0]!.category, mine[0]!.intensity, mine[0]!.endDate], ['spotting', 'light', '2026-10-06']);

  const removed = await store.previewBleedingRemoval('b-1', 'manual');
  assert.equal(removed.bleedingChanges[0]!.next, null);
  await store.confirm(removed.token);
  backup = (await store.read()).backup;
  assert.equal(backup.bleedingEntries.filter(e => e.id === 'b-1').length, 0);

  const audits = backup.auditEntries.filter(a => a.entityId === 'b-1');
  assert.deepEqual(audits.map(a => [a.priorValue === null, a.newValue === null]), [[true, false], [false, false], [false, true]], 'create, edit and delete are all audited');
  assert.equal((audits[2]!.priorValue as BleedingEntry).category, 'spotting', 'the deleted values stay in the audit trail');

  store.close();
  const reopened = await LocalStore.open(path);
  t.after(() => reopened.close());
  assert.equal((await reopened.read()).backup.auditEntries.filter(a => a.entityId === 'b-1').length, 3);
});

test('bleeding entries survive an export and import round trip', async t => {
  const { store } = await setup(t);
  await seed(store);
  await store.confirm((await store.previewBleedingEntry(bleeding('b-9', { intensity: 'moderate', note: 'from memory' }), 'manual')).token);
  const exported = parseBackupJson((await store.exportJson()).json);
  assert.deepEqual(exported.bleedingEntries.find(e => e.id === 'b-9'), bleeding('b-9', { intensity: 'moderate', note: 'from memory' }));
});

test('invalid bleeding entries and unknown ids are rejected with a storage error, never a raw validation error', async t => {
  const { store } = await setup(t);
  await seed(store);
  const bad: unknown[] = [
    bleeding('b-2', { endDate: '2026-10-01' }), // ends before it starts
    { ...bleeding('b-2'), category: 'heavy' },
    { ...bleeding('b-2'), diagnosis: 'not allowed' },
    { ...bleeding('b-2'), startDate: '2026-02-30' },
    { ...bleeding('b-2'), note: 'x'.repeat(4001) },
    null, 'text', 42,
  ];
  for (const entry of bad) await assert.rejects(store.previewBleedingEntry(entry, 'manual'), code('invalid-correction'));
  await assert.rejects(store.previewBleedingEntry(bleeding('b-2'), 'import' as 'manual'), code('invalid-correction'));
  await assert.rejects(store.previewBleedingRemoval('nope', 'manual'), code('unknown-entry'));
  await assert.rejects(store.previewIntakeCorrection({ nonsense: true }, 'manual'), code('invalid-correction'));
  await assert.rejects(store.previewIntakeCorrection(null, 'manual'), code('invalid-correction'));
});

test('a correction that would exceed the size limit is refused when previewed, and the data stays usable', async t => {
  const { store } = await setup(t);
  const candidate = fixture();
  candidate.bleedingEntries = Array.from({ length: 150 }, (_, i) => bleeding(`big-${i}`, { note: 'x'.repeat(4000) }));
  await store.confirm((await store.previewImport(serializeBackup(candidate))).token);
  let refused: unknown = null;
  for (let i = 0; i < 120 && refused === null; i++) {
    try {
      await store.confirm((await store.previewBleedingEntry(bleeding(`big-${i % 150}`, { note: `${i}`.repeat(1) + 'y'.repeat(3990) }), 'manual')).token);
    } catch (error) { refused = error; }
  }
  assert.ok(refused instanceof StorageError, 'the snapshot eventually reaches its limit');
  assert.equal((refused as StorageError).code, 'too-large', 'refused at preview time with a clear reason, not at confirm with a generic failure');
  assert.ok((await store.read()).backup.bleedingEntries.length === 150, 'records are untouched');
});

test('error codes are distinct and messages are neutral', async t => {
  const { store } = await setup(t);
  await seed(store);
  await assert.rejects(store.recoveryJson('no-such-recovery'), code('unknown-recovery'));
  await assert.rejects(store.guidance('no-such-profile'), code('unknown-profile'));
  const previews = [];
  for (let i = 0; i < 64; i++) previews.push(await store.previewBleedingEntry(bleeding(`p-${i}`), 'manual'));
  await assert.rejects(store.previewBleedingEntry(bleeding('p-64'), 'manual'), code('too-many-previews'));
  store.cancel(previews[0]!.token);
  await store.previewBleedingEntry(bleeding('p-64'), 'manual');
  assert.doesNotMatch(new StorageError('storage-failed').message, /replacement/);
});

test('a failed confirm uses up its preview, so the user starts again from a fresh one', async t => {
  // Known limit of the SQLite driver on Windows (#37 item 4): after a failed attempt to take the write lock the connection
  // reports "SQL statements in progress" until it is reopened, so keeping the preview for a retry would not help.
  const { store, path } = await setup(t);
  await seed(store);
  const preview = await store.previewBleedingEntry(bleeding('b-7'), 'manual');
  const raw = createClient({ url: pathToFileURL(path).href });
  t.after(() => raw.close());
  const holder = await raw.transaction('write'); // another process is writing
  await assert.rejects(store.confirm(preview.token), code('storage-failed'));
  await holder.rollback();
  holder.close();
  await assert.rejects(store.confirm(preview.token), code('invalid-preview'));
});

test('a new database is stamped with the storage version, and a newer schema is never touched or downgraded', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'petal-open-'));
  t.after(() => cleanup(dir));
  const path = join(dir, 'records.db');
  const first = await LocalStore.open(path);
  first.close();
  const raw = createClient({ url: pathToFileURL(path).href });
  assert.equal(Number((await raw.execute('PRAGMA user_version')).rows[0]!.user_version), 1);
  await raw.execute('PRAGMA user_version=2');
  raw.close();
  await assert.rejects(LocalStore.open(path), code('unsupported-storage-version'));
  const check = createClient({ url: pathToFileURL(path).href });
  t.after(() => check.close());
  assert.equal(Number((await check.execute('PRAGMA user_version')).rows[0]!.user_version), 2, 'a refused open leaves the newer version in place');
});
