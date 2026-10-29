import {test,type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {AiService,type AiGenerator} from '../src/main/aiService';
import {SqliteStore} from '../src/main/sqliteStore';
import {PetalService} from '../src/main/service';
import type {Result} from '../src/shared/ipc';
const now=()=>new Date('2026-10-10T13:30:00Z');
function value<T>(result:Result<T>):T {assert.equal(result.ok,true);if(!result.ok)throw new Error(result.message);return result.value;}
const unavailable:AiGenerator={generate:async()=>{throw new Error('unavailable');}};
const selecting:AiGenerator={generate:async(_q,system)=>{
  const data=JSON.parse(system.split('PETAL CONTEXT:\n')[1]);
  return JSON.stringify({statementIds:data.requiredIds,evidenceIds:data.allowedEvidenceIds,style:'plain'});
}};
async function open(t:TestContext,generator:AiGenerator=unavailable){
  const dir=await mkdtemp(join(tmpdir(),'petal-ai-test-'));const path=join(dir,'petal.db');
  const store=await SqliteStore.open(path,'0.1.0');const service=new PetalService(store,now);
  const state=value(await service.saveSetup({usualTime:'21:00',timeZone:'Asia/Manila',anchor:{kind:'mid-pack',position:12,date:'2026-10-10'}}));
  const ai=new AiService(store,generator,now);
  t.after(()=>{ai.close();store.close();return rm(dir,{recursive:true,force:true,maxRetries:2,retryDelay:100}).catch(()=>{});}); // best effort: Windows keeps the SQLite file locked briefly after close()
  return {dir,path,store,service,state,ai};
}
test('live history is queried anew; blank differs from missed and no model keeps useful answers',async t=>{
  const {ai,service,state}=await open(t);const yesterday=state.doses[10];
  const blank=value(await ai.ask({question:'Did I take my pill yesterday?'}));assert.match(blank.text,/unknown/);assert.equal(blank.fallback,true);
  value(await service.recordIntake({doseId:yesterday.id,status:'confirmed-missed'}));
  const changed=value(await ai.ask({question:'Did I take my pill yesterday?'}));assert.match(changed.text,/confirmed-missed/);assert.notEqual(changed.text,blank.text);
});

test('today, yesterday and explicit dates use distinct stored doses with and without inference',async t=>{
  for (const generator of [unavailable, selecting]) {
    const {ai,service,state}=await open(t,generator);
    value(await service.recordIntake({doseId:state.doses[10].id,status:'confirmed-missed'}));
    value(await service.recordIntake({doseId:state.doses[11].id,status:'taken'}));
    const today=value(await ai.ask({question:'Did I take my pill today?'}));
    assert.match(today.text,/2026-10-10.*recorded as taken/);
    assert.doesNotMatch(today.text,/2026-10-09|confirmed-missed/);
    assert.match(value(await ai.ask({question:'Did I take my pill yesterday?'})).text,/2026-10-09.*confirmed-missed/);
    assert.match(value(await ai.ask({question:'Did I take my pill on 2026-10-09?'})).text,/2026-10-09.*confirmed-missed/);
  }
});

test('today follows the schedule time zone across the UTC date boundary',async t=>{
  const {store}=await open(t,selecting);
  const ai=new AiService(store,selecting,()=>new Date('2026-10-10T17:30:00Z'));
  try {
    const answer=value(await ai.ask({question:'Did I take my pill today?'}));
    assert.match(answer.text,/2026-10-11.*unknown/);
    assert.doesNotMatch(answer.text,/2026-10-10/);
  } finally { ai.close(); }
});
test('correct constrained output is accepted; model prose and fake citations never display',async t=>{
  const a=await open(t,selecting);assert.equal(value(await a.ai.ask({question:'What does an empty intake record mean?'})).fallback,false);
  const bad=await open(t,{generate:async()=>'{"text":"You are safe to have sex","evidenceIds":["fake-CDC"]}'});
  const answer=value(await bad.ai.ask({question:'What does an empty intake record mean?'}));assert.equal(answer.fallback,true);assert.doesNotMatch(answer.text,/safe to have sex|fake-CDC/);assert.ok(answer.citations.length>0);assert.ok(answer.citations.every(e=>e.reviewStatus==='reviewed'&&e.excerpt));
});
test('draft medical passages remain withheld and urgent requests use the escalation branch',async t=>{
  const {ai}=await open(t);const answer=value(await ai.ask({question:'How does a combined pill work?'}));assert.equal(answer.citations.length,0);assert.match(answer.text,/No applicable reviewed passage/);
  assert.match(value(await ai.ask({question:'I have chest pain and I took my pill yesterday'})).text,/urgent medical care/);
});
test('precise tablet questions use the intended tablet rather than today; inconsistent selections are refused',async t=>{
  const {ai,state,service}=await open(t);value(await service.recordIntake({doseId:state.doses[3].id,status:'unsure'}));
  const answer=value(await ai.ask({question:'Was tablet 4 taken?'}));assert.match(answer.text,/tablet 4/i);assert.match(answer.text,/unsure/);assert.doesNotMatch(answer.text,/was 12/);
  assert.doesNotMatch(answer.text,/dose tablet/i,'readable wording');assert.ok(state.doses.every(d=>!answer.text.includes(d.id)),'no internal dose IDs shown');
  assert.equal((await ai.ask({question:'Was tablet 4 taken?',discussedDoseId:state.doses[11].id})).ok,false);
});
test('cancellation interrupts the request without accepting partial output or changing records',async t=>{
  let entered!:()=>void;const ready=new Promise<void>(resolve=>{entered=resolve;});
  const generator:AiGenerator={generate:(_q,_s,_g,signal)=>new Promise((_resolve,reject)=>{entered();signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true});})};
  const {ai,store}=await open(t,generator);const before=await store.exportJson();
  const pending=ai.ask({question:'Did I take my pill yesterday?'});await ready;
  assert.equal((await ai.ask({question:'Did I take it?'})).ok,false);ai.cancel();
  assert.equal((await pending).ok,false);assert.deepEqual((await store.load()).events,JSON.parse(before.json).intakeEvents);
});
test('a response made stale by concurrent logging is withheld',async t=>{
  let release!:(raw:string)=>void;let entered!:()=>void;const ready=new Promise<void>(resolve=>{entered=resolve;});
  const {ai,state,service}=await open(t,{generate:()=>new Promise(resolve=>{release=resolve;entered();})});
  const pending=ai.ask({question:'Did I take my pill yesterday?'});await ready;
  value(await service.recordIntake({doseId:state.doses[10].id,status:'unsure'}));release('bad');
  const result=await pending;assert.equal(result.ok,false);if(!result.ok)assert.match(result.message,/records changed/);
});
test('preview is read-only; confirm creates a durable chat audit with approximate precision',async t=>{
  const {ai,state,store,path}=await open(t);const dose=state.doses[10];const before=await store.load();
  const preview=value(await ai.preview({doseId:dose.id,status:'taken',actualAt:'2026-10-09T21:00:00+08:00',timePrecision:'approximate'}));
  assert.deepEqual(await store.load(),before);assert.equal(preview.after.timePrecision,'approximate');
  const saved=value(await ai.confirm(preview.token));assert.equal(saved.state.events[0].doseId,dose.id);
  const backup=JSON.parse((await store.exportJson()).json);assert.equal(backup.auditEntries.at(-1).origin,'chat');
  const reopened=await SqliteStore.open(path,'0.1.0');try{assert.equal((await reopened.load()).events[0].timePrecision,'approximate');}finally{reopened.close();}
  assert.equal((await ai.confirm(preview.token)).ok,false);
});
test('discard and chat text saying confirm or cancel cannot mutate the database',async t=>{
  const {ai,state,store}=await open(t);const before=await store.load();
  const preview=value(await ai.preview({doseId:state.doses[10].id,status:'confirmed-missed'}));
  value(await ai.ask({question:'Confirm and save it',discussedDoseId:state.doses[10].id}));assert.deepEqual(await store.load(),before);
  value(await ai.ask({question:'Cancel it'}));assert.deepEqual(await store.load(),before);
  value(ai.discard(preview.token));assert.deepEqual(await store.load(),before);assert.equal((await ai.confirm(preview.token)).ok,false);
});
test('stale previews cannot overwrite a manual change; newer previews revoke older tokens',async t=>{
  const {ai,state,service,store}=await open(t);const dose=state.doses[10];
  const a=value(await ai.preview({doseId:dose.id,status:'confirmed-missed'}));
  value(await service.recordIntake({doseId:dose.id,status:'unsure'}));assert.equal((await ai.confirm(a.token)).ok,false);assert.equal((await store.load()).events[0].status,'unsure');
  const b=value(await ai.preview({doseId:dose.id,status:'confirmed-missed'}));const c=value(await ai.preview({doseId:dose.id,status:'taken'}));
  assert.equal((await ai.confirm(b.token)).ok,false);assert.equal(value(await ai.confirm(c.token)).state.events[0].status,'taken');
});
test('forged inputs, future times and exact remembered times are refused without writes',async t=>{
  const {ai,state,store}=await open(t);const before=await store.load();
  for(const input of [{doseId:'nonexistent',status:'taken'},{doseId:state.doses[0].id,status:'taken',actualAt:'2027-01-01T21:00:00+08:00'},{doseId:state.doses[0].id,status:'taken',timePrecision:'exact'}])assert.equal((await ai.preview(input as never)).ok,false);
  assert.equal((await ai.ask({question:'x'.repeat(4001)})).ok,false);assert.deepEqual(await store.load(),before);
});
test('knowledge queries send no personal records to the model context',async t=>{
  let captured='';const {ai}=await open(t,{generate:async(_q,system)=>{captured=system;return 'bad';}});
  value(await ai.ask({question:'What does an empty intake record mean?'}));const context=JSON.parse(captured.split('PETAL CONTEXT:\n')[1]);for(const key of ['records','computedFacts','conversation','clock'])assert.equal(key in context,false);assert.ok(context.passages.length);
});

test('greetings work without inference and do not change records',async t=>{
  let calls=0;
  const {ai,store}=await open(t,{generate:async()=>{calls++;throw new Error('model-unavailable');}});
  const before=await store.load();
  for(const question of ['hi','Hello!','Good evening.']) {
    const answer=value(await ai.ask({question}));
    assert.equal(answer.mode,'greeting');assert.equal(answer.fallback,false);
    assert.match(answer.text,/Hi!/);assert.equal(answer.citations.length,0);
  }
  assert.equal(calls,0);assert.deepEqual(await store.load(),before);
  const clinical=value(await ai.ask({question:'hi, I have chest pain'}));
  assert.match(clinical.text,/urgent medical care/);
});

test('a malformed model file is rejected before native loading',async t=>{
  const {dir}=await open(t);const path=join(dir,'broken.gguf');await writeFile(path,'not a model');
  const {verifyGemma}=await import('../src/main/aiArtifact');
  await assert.rejects(()=>verifyGemma(path));await assert.rejects(()=>verifyGemma('relative.gguf'));
});
