import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createClient } from '@libsql/client';
import { serializeBackup, parseBackupJson, getIntakeState } from '@petal/domain';
import { LocalStore, StorageError } from '../src/index.js';
import { fixture } from './fixtures.js';

async function setup(t:test.TestContext) {
  const dir=await mkdtemp(join(tmpdir(),'petal-storage-'));const path=join(dir,'records.db');const store=await LocalStore.open(path);
  t.after(async()=>{store.close();await rm(dir,{recursive:true,force:true});});return {store,path};
}
async function seed(store:LocalStore) {return store.confirm((await store.previewImport(serializeBackup(fixture()))).token);}
function code(expected:string) {return (e:unknown)=>e instanceof StorageError && e.code===expected;}

test('all durable entities survive closing and reopening a real SQLite file',async t=>{
  const {store,path}=await setup(t);await seed(store);const before=await store.read();store.close();
  const reopened=await LocalStore.open(path);try{assert.deepEqual(await reopened.read(),before);}finally{reopened.close();}
});
test('fresh process sees durable intake without login or network configuration',async t=>{
  const {store,path}=await setup(t);await seed(store);store.close();
  const module=pathToFileURL(join(process.cwd(),'dist/index.js')).href;
  const script=`import {LocalStore} from ${JSON.stringify(module)}; const s=await LocalStore.open(${JSON.stringify(path)}); const b=await s.read(); if(b.backup.intakeEvents[0].timePrecision!=='approximate'||b.revision!==1)process.exit(2);s.close();`;
  const child=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',env:{PATH:process.env.PATH}});
  assert.equal(child.status,0,child.stderr);
});
test('preview and cancellation change neither records nor recovery copies',async t=>{
  const {store}=await setup(t);await seed(store);const prior=await store.read();const recovery=await store.listRecovery();
  const candidate=fixture();candidate.intakeEvents=[];
  const p=await store.previewImport(serializeBackup(candidate));assert.equal(p.kind,'import');assert.equal(p.encryption,'none');assert.match(p.sensitivityNotice,/plaintext/);
  assert.deepEqual(await store.read(),prior);store.cancel(p.token);
  await assert.rejects(store.confirm(p.token),code('invalid-preview'));assert.deepEqual(await store.read(),prior);assert.deepEqual(await store.listRecovery(),recovery);
});
test('malformed, too-large, incompatible and dangling imports preserve the database',async t=>{
  const {store}=await setup(t);await seed(store);const prior=await store.read();
  const wrongVersion={...fixture(),schemaVersion:2};const dangling=fixture();dangling.intakeEvents[0]!.doseId='absent';
  for(const json of ['{',' '.repeat(1_500_001),JSON.stringify(wrongVersion),JSON.stringify(dangling)]) await assert.rejects(store.previewImport(json));
  assert.deepEqual(await store.read(),prior);
});
test('confirmed replacement retains a durable recovery copy and adds import audits',async t=>{
  const {store,path}=await setup(t);await seed(store);const before=await store.read();
  const candidate=fixture();candidate.bleedingEntries=[];candidate.settings!.usualTime='20:00';
  const result=await store.confirm((await store.previewImport(serializeBackup(candidate))).token);assert.ok(result.recoveryId);
  assert.deepEqual(parseBackupJson(await store.recoveryJson(result.recoveryId!)),before.backup);
  const after=(await store.read()).backup;assert.equal(after.settings!.usualTime,'20:00');assert.equal(after.bleedingEntries.length,0);
  assert.ok(after.auditEntries.some(a=>a.entityType==='bleeding-entry' && a.newValue===null && a.origin==='import'));
  store.close();const reopened=await LocalStore.open(path);try{assert.deepEqual(parseBackupJson(await reopened.recoveryJson(result.recoveryId!)),before.backup);}finally{reopened.close();}
});
test('chat correction requires confirmation, preserves creation and audit, and reevaluates guidance',async t=>{
  const {store}=await setup(t);await seed(store);const before=await store.read();const old=before.backup.intakeEvents[0]!;
  const next={...old,status:'unsure',actualAt:null,timePrecision:'unknown',updatedAt:'2026-10-10T00:00:00+08:00'};
  const p=await store.previewIntakeCorrection(next,'chat');assert.deepEqual(p.changes[0]!.prior,old);assert.deepEqual(await store.read(),before);
  const previousGuidance=await store.guidance('trust-demo');await store.confirm(p.token);
  const after=(await store.read()).backup;assert.equal(after.intakeEvents[0]!.createdAt,old.createdAt);assert.equal(after.intakeEvents[0]!.origin,'chat');
  const audit=after.auditEntries.at(-1)!;assert.deepEqual(audit.priorValue,old);assert.equal(audit.origin,'chat');
  const changed=await store.guidance('trust-demo');assert.notDeepEqual(changed.missingFacts,previousGuidance.missingFacts);assert.equal(changed.status,'unsupported');assert.deepEqual(changed.fixedActions,[]);
});
test('unknown history, separate same-day dose identities and approximate precision remain intact',async t=>{
  const {store}=await setup(t);await seed(store);let b=(await store.read()).backup;
  assert.equal(getIntakeState('dose-2',b.intakeEvents),'no-entry');
  await store.confirm((await store.previewIntakeCorrection({...b.intakeEvents[0],id:'event-2',doseId:'dose-2'},'manual')).token);
  b=(await store.read()).backup;assert.equal(b.intakeEvents.length,2);assert.ok(b.intakeEvents.every(e=>e.timePrecision==='approximate'));
  const roundtrip=parseBackupJson((await store.exportJson()).json);assert.deepEqual(roundtrip.intakeEvents,b.intakeEvents);
});
test('cancelled, replayed and stale previews cannot overwrite newer data, including across connections',async t=>{
  const {store,path}=await setup(t);await seed(store);const other=await LocalStore.open(path);t.after(()=>other.close());
  const a=await store.previewImport(serializeBackup(fixture()));const b=await other.previewImport(serializeBackup(fixture()));
  await other.confirm(b.token);await assert.rejects(store.confirm(a.token),code('stale-preview'));
  await assert.rejects(other.confirm(b.token),code('invalid-preview'));
  const p=await store.previewImport(serializeBackup(fixture()));p.counts.intakeEvents=999;p.backup.intakeEvents=[]; // UI copies cannot alter staged data.
  await store.confirm(p.token);assert.equal((await store.read()).backup.intakeEvents.length,1);
});
test('SQLite failure rolls back both recovery insertion and replacement without leaking records',async t=>{
  const {store,path}=await setup(t);await seed(store);const before=await store.read();const recoveries=await store.listRecovery();
  const raw=createClient({url:pathToFileURL(path).href});t.after(()=>raw.close());
  await raw.execute("CREATE TRIGGER fail_write BEFORE UPDATE ON petal_state BEGIN SELECT RAISE(ABORT,'PRIVATE RECORD CONTENT'); END");
  const p=await store.previewImport(serializeBackup(fixture()));
  await assert.rejects(store.confirm(p.token),e=>code('storage-failed')(e) && !String(e).includes('PRIVATE'));
  assert.deepEqual(await store.read(),before);assert.deepEqual(await store.listRecovery(),recoveries);
});
test('corrections cannot change dose identity, creation time, or reverse update chronology',async t=>{
  const {store}=await setup(t);await seed(store);const old=(await store.read()).backup.intakeEvents[0]!;
  for(const edit of [{id:'replacement-id'},{createdAt:'2026-10-09T21:00:00+08:00'},{doseId:'missing'}]) await assert.rejects(store.previewIntakeCorrection({...old,...edit},'manual'));
  await assert.rejects(store.previewIntakeCorrection(old,'import' as 'manual'),code('invalid-correction'));
});
test('remote/relative paths and newer storage schemas are rejected without downgrading',async t=>{
  for(const path of ['libsql://example.com','https://example.com','records.db']) await assert.rejects(LocalStore.open(path));
  const dir=await mkdtemp(join(tmpdir(),'petal-version-'));t.after(()=>rm(dir,{recursive:true,force:true}));const path=join(dir,'future.db');
  const raw=createClient({url:pathToFileURL(path).href});await raw.execute('PRAGMA user_version=2');raw.close();
  await assert.rejects(LocalStore.open(path),code('unsupported-storage-version'));
});
