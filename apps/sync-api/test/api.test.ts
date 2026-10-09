import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@libsql/client';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from '../src/app.js';
import {SnapshotStore} from '../src/store.js';
import {createRecoveryKey,encryptSnapshot,decryptSnapshot,SyncClient,SyncConflict} from '@petal/encrypted-sync';
test('HTTP API isolates accounts, detects concurrent edits, deletes ciphertext and keeps tombstones',async () => {
 const dir=await mkdtemp(join(tmpdir(),'petal-sync-test-'));const db=createClient({url:`file:${join(dir,'test.db')}`}),store=new SnapshotStore(db);await store.migrate();
 // Test-only authentication adapter. Production always uses Clerk verification.
 const clientToken='test.'+Buffer.from(JSON.stringify({sub:'alice'})).toString('base64url')+'.sig';
 const app=createApp({store,allowedOrigins:['http://localhost:5173'],authenticate:(req,res,next) => {const t=req.headers.authorization?.slice(7);if(t==='alice'||t==='bob') res.locals.userId=t;else if(t===clientToken)res.locals.userId='alice';next();}});
 const server=app.listen(0,'127.0.0.1');await new Promise<void>(resolve => server.on('listening',resolve));const address=server.address();if(!address||typeof address==='string')throw new Error('listen');const base=`http://127.0.0.1:${address.port}`;
 const request=(method:string,token?:string,revision?:number,body?:unknown,extra={}) => fetch(base+'/v1/snapshot',{method,headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(revision!==undefined?{'If-Match':`"${revision}"`}:{}),...(body?{'Content-Type':'application/json'}:{}),...extra},body:body?JSON.stringify(body):undefined});
 try {
 assert.equal((await request('GET')).status,401);assert.equal((await request('GET','forged')).status,401);
 assert.equal((await request('GET','alice',undefined,undefined,{Origin:'https://evil.test'})).status,403);
 const key=await createRecoveryKey(),e=await encryptSnapshot({note:'fictional secret'},key,'alice',1);
 assert.equal((await request('PUT','alice',undefined,e)).status,428);
 assert.equal((await request('PUT','alice',0,{note:'plaintext'})).status,400);
 assert.equal((await request('PUT','alice',0,e)).status,200);
 assert.equal((await request('GET','bob')).status,200);assert.equal((await (await request('GET','bob')).json()).revision,0);
 const snapshot=await (await request('GET','alice')).json();assert.deepEqual(await decryptSnapshot(snapshot.envelope,key,'alice',snapshot.revision),{note:'fictional secret'});
 const stored=await db.execute('SELECT envelope FROM petal_sync_vaults');assert.ok(!String(stored.rows[0].envelope).includes('fictional secret'));
 const next=await encryptSnapshot({note:'changed'},key,'alice',2);
 const race=await Promise.all([request('PUT','alice',1,next),request('PUT','alice',1,next)]);assert.deepEqual(race.map(x=>x.status).sort(),[200,409]);
 assert.equal((await request('DELETE','alice',1)).status,409);
 assert.equal((await request('DELETE','alice',2)).status,200);
 const deleted=await store.read('alice');assert.deepEqual(deleted,{revision:3,deleted:true,envelope:null});
 assert.equal((await request('PUT','alice',0,e)).status,409);
 assert.equal((await request('PUT','bob',4,e)).status,409);
 assert.equal((await request('PUT','alice',3,await encryptSnapshot({note:'recreated'},key,'alice',4))).status,200);
 const clientA=new SyncClient({baseUrl:base,userId:'alice',getToken:async()=>clientToken}),clientB=new SyncClient({baseUrl:base,userId:'alice',getToken:async()=>clientToken});clientA.setEnabled(true);clientB.setEnabled(true);
 const a=await clientA.download<{note:string}>(key),b=await clientB.read();assert.equal(a.value?.note,'recreated');
 await clientA.upload({note:'client integration'},key,a.snapshot.revision);await assert.rejects(clientB.upload({note:'stale'},key,b.revision),SyncConflict);
 assert.equal((await clientA.download<{note:string}>(key)).value?.note,'client integration');
 const reopened=createClient({url:`file:${join(dir,'test.db')}`});try{assert.equal((await new SnapshotStore(reopened).read('alice')).revision,5);}finally{reopened.close();}
 } finally {await new Promise<void>((resolve,reject)=>server.close(err=>err?reject(err):resolve()));db.close();await rm(dir,{recursive:true,force:true});}
});
