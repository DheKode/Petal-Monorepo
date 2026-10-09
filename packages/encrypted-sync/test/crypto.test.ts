import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRecoveryKey, encryptSnapshot, decryptSnapshot, SyncClient, SyncConflict } from '../src/index.js';
test('client encryption protects records, account, revision and authenticity',async () => {
 const key=await createRecoveryKey();const value={fictional:true,note:'private test timeline'};
 const e=await encryptSnapshot(value,key,'user_a',1);
 assert.ok(!JSON.stringify(e).includes(value.note));
 assert.deepEqual(await decryptSnapshot(e,key,'user_a',1),value);
 await assert.rejects(decryptSnapshot(e,await createRecoveryKey(),'user_a',1));
 await assert.rejects(decryptSnapshot(e,key,'user_b',1));
 await assert.rejects(decryptSnapshot(e,key,'user_a',2));
 await assert.rejects(decryptSnapshot({...e,ciphertext:(e.ciphertext[0]==='A'?'B':'A')+e.ciphertext.slice(1)},key,'user_a',1));
 assert.notEqual((await encryptSnapshot(value,key,'user_a',1)).iv,e.iv);
});
test('large snapshots encrypt without stack overflow; oversize rejects',async () => {
 const key=await createRecoveryKey(),value={note:'x'.repeat(200_000)};
 assert.deepEqual(await decryptSnapshot(await encryptSnapshot(value,key,'u',1),key,'u',1),value);
 await assert.rejects(encryptSnapshot({note:'x'.repeat(2_000_000)},key,'u',1));
});
test('disabled sync never requests credentials or network',async () => {
 let calls=0;const c=new SyncClient({baseUrl:'https://example.test',userId:'u',getToken:async () => {calls++;return 'token';},fetch:async () => {calls++;throw new Error('network');}});
 await assert.rejects(c.read());await assert.rejects(c.upload({},await createRecoveryKey(),0));assert.equal(calls,0);
});
test('client exposes conflicts and rejects rollback without replacing local data',async () => {
 let mode='conflict';const c=new SyncClient({baseUrl:'https://example.test',userId:'u',getToken:async () => 'test.'+Buffer.from(JSON.stringify({sub:'u'})).toString('base64url')+'.signature',highestRevision:3,fetch:async () => mode==='conflict' ? Response.json({revision:4},{status:409}):Response.json({revision:2,deleted:true,envelope:null})});c.setEnabled(true);
 await assert.rejects(c.deleteCloudCopy(3),SyncConflict);mode='rollback';await assert.rejects(c.read(),/rolled-back/);
});

test('account switches and disabled pending token acquisition prevent requests',async () => {
 let calls=0;const c=new SyncClient({baseUrl:'https://example.test',userId:'u',getToken:async () => 'test.'+Buffer.from(JSON.stringify({sub:'other'})).toString('base64url')+'.signature',fetch:async () => {calls++;return Response.json({});}});c.setEnabled(true);await assert.rejects(c.read(),/Account changed/);assert.equal(calls,0);
 let resolve!: (v:string)=>void;const pending=new SyncClient({baseUrl:'https://example.test',userId:'u',getToken:()=>new Promise(r=>{resolve=r;}),fetch:async () => {calls++;return Response.json({});}});pending.setEnabled(true);const request=pending.read();pending.setEnabled(false);resolve('token');await assert.rejects(request,/disabled/);assert.equal(calls,0);
});
