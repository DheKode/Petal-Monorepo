import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {z} from 'zod';
import {fixture} from './fixtures.js';
import {BackupSchema,parseBackup,parseBackupJson,serializeBackup,DomainValidationError,LocalDateSchema,TimestampSchema,IntakeEventSchema,SettingsSchema,ScheduledDoseSchema,MAX_BACKUP_BYTES,evaluateGuidance,getIntakeState,createEvidenceIndex,resolveEvidenceIds,parseEvidenceCorpusJson} from '../src/index.js';
test('complete backup round trip preserves uncertainty, offsets, settings and audit history',()=>{
 const b=fixture(),copy=parseBackupJson(serializeBackup(b));assert.deepEqual(copy,b);assert.equal(copy.intakeEvents[0].timePrecision,'approximate');assert.equal(copy.intakeEvents[0].actualAt,'2026-10-09T21:30:00+08:00');assert.deepEqual(copy.auditEntries,b.auditEntries);
});
test('no entry, confirmed missed, unsure and taken with unknown time remain distinct',()=>{
 const b=fixture();assert.equal(getIntakeState('dose-2',b.intakeEvents),'no-entry');
 for(const status of ['confirmed-missed','unsure','taken'] as const){const e={...b.intakeEvents[0],status,actualAt:null,timePrecision:'unknown' as const};assert.equal(getIntakeState('dose-1',[e]),status);assert.equal(IntakeEventSchema.parse(e).actualAt,null);}
 for(const status of ['confirmed-missed','unsure'] as const)assert.equal(IntakeEventSchema.safeParse({...b.intakeEvents[0],status}).success,false);
 assert.equal(IntakeEventSchema.safeParse({...b.intakeEvents[0],actualAt:null,timePrecision:'exact'}).success,false);
 assert.equal(IntakeEventSchema.safeParse({...b.intakeEvents[0],timePrecision:'unknown'}).success,false);
});
test('two doses taken on one day survive import; duplicate current dose records reject',()=>{
 const b=fixture();b.intakeEvents.push({...b.intakeEvents[0],id:'event-2',doseId:'dose-2'});assert.equal(parseBackup(b).intakeEvents.length,2);
 b.intakeEvents[1].doseId='dose-1';assert.throws(()=>parseBackup(b),DomainValidationError);
});
test('calendar and timestamp validation rejects fabricated dates and missing offsets',()=>{
 assert.equal(LocalDateSchema.safeParse('2024-02-29').success,true);
 for(const d of ['2026-02-29','2026-04-31','2026-13-01'])assert.equal(LocalDateSchema.safeParse(d).success,false);
 assert.equal(TimestampSchema.safeParse('2026-10-09T21:00:00').success,false);
 assert.equal(TimestampSchema.safeParse('2026-10-09T13:00:00Z').success,true);
 const d=fixture().scheduledDoses[0];assert.equal(ScheduledDoseSchema.safeParse({...d,scheduledAt:'2026-10-09T13:00:00Z'}).success,true);
 assert.equal(ScheduledDoseSchema.safeParse({...d,localDate:'2026-10-10'}).success,false);
 assert.equal(SettingsSchema.safeParse({...fixture().settings,timeZone:'not/a-zone'}).success,false);
});
test('malformed, oversized, unsupported-version and credential-bearing imports fail without mutations',()=>{
 const b=fixture(),before=structuredClone(b);assert.throws(()=>parseBackupJson('{'),DomainValidationError);assert.deepEqual(b,before);
 assert.throws(()=>parseBackupJson(' '.repeat(MAX_BACKUP_BYTES+1)),DomainValidationError);
 for(const changed of [{...b,schemaVersion:2},{...b,clerkToken:'sensitive-value'},{...b,settings:{...b.settings,recoveryKey:'sensitive-value'}},{...b,guidanceResults:[]}])assert.throws(()=>parseBackup(changed),DomainValidationError);
 try{parseBackup({...b,secret:'never-include-me'});}catch(e){assert.ok(e instanceof DomainValidationError);assert.ok(!e.message.includes('never-include-me'));assert.ok(!JSON.stringify(e.issues).includes('never-include-me'));}
});
test('backup rejects dangling relationships, duplicate IDs, duplicate pack positions and mismatched tablet kinds',()=>{
 const changes=[(b:ReturnType<typeof fixture>)=>{b.packs[0].profileId='missing';},(b:ReturnType<typeof fixture>)=>{b.intakeEvents[0].doseId='missing';},(b:ReturnType<typeof fixture>)=>{b.scheduledDoses[0].packId='missing';},(b:ReturnType<typeof fixture>)=>{b.profiles[0].evidenceIds=['missing'];},(b:ReturnType<typeof fixture>)=>{b.evidence[0].supportedProfileIds=['missing'];},(b:ReturnType<typeof fixture>)=>{b.intakeEvents.push({...b.intakeEvents[0]});},(b:ReturnType<typeof fixture>)=>{b.scheduledDoses[1].position=1;},(b:ReturnType<typeof fixture>)=>{b.scheduledDoses[0].tabletKind='active';}];
 for(const change of changes){const b=fixture();change(b);assert.throws(()=>parseBackup(b),DomainValidationError);}
});
test('correction audit preserves prior values; deleted entities may retain audit snapshots',()=>{
 const b=fixture(),old=structuredClone(b.intakeEvents[0]);b.intakeEvents[0].status='unsure';b.intakeEvents[0].actualAt=null;b.intakeEvents[0].timePrecision='unknown';b.intakeEvents[0].updatedAt='2026-10-09T22:30:00+08:00';
 b.auditEntries.push({id:'audit-2',entityId:old.id,entityType:'intake-event',priorValue:old,newValue:{...b.intakeEvents[0]},timestamp:b.intakeEvents[0].updatedAt,origin:'chat'});
 assert.deepEqual(parseBackupJson(serializeBackup(b)).auditEntries[1].priorValue,old);
 const deletion=fixture();deletion.auditEntries[0].priorValue=deletion.auditEntries[0].newValue;deletion.auditEntries[0].newValue=null;deletion.intakeEvents=[];assert.equal(parseBackup(deletion).auditEntries.length,1);
 b.auditEntries[1].entityId='wrong';assert.throws(()=>parseBackup(b),DomainValidationError);
 const malformed=fixture();malformed.auditEntries[0].newValue={id:'event-1',plaintext:'invalid entity'};assert.throws(()=>parseBackup(malformed),DomainValidationError);
});
test('verified profile metadata requires a full tablet map and reviewed applicable evidence',()=>{
 const b=fixture();b.profiles[0].verificationState='verified';assert.throws(()=>parseBackup(b),DomainValidationError);
 b.profiles[0]={...b.profiles[0],formulation:'FICTIONAL TEST ONLY',ingredients:[{name:'Fictional ingredient',strength:'Fixture only'}],leafletVersion:'fixture',evidenceVersion:'fixture',tabletMap:b.profiles[0].tabletMap.map((t,i)=>({...t,kind:i<21?'active':'non-hormonal'}))};
 b.scheduledDoses.forEach(d=>d.tabletKind='active');assert.throws(()=>parseBackup(b),DomainValidationError);
 b.evidence[0].reviewStatus='reviewed';assert.equal(parseBackup(b).profiles[0].verificationState,'verified');
 b.profiles[0].tabletMap[1].position=1;assert.throws(()=>parseBackup(b),DomainValidationError);
});
test('guidance stub stays unsupported even when input profile claims verification',()=>{
 const b=fixture();b.profiles[0]={...b.profiles[0],verificationState:'verified',formulation:'FICTIONAL TEST ONLY',ingredients:[{name:'Fictional',strength:'Fixture'}],leafletVersion:'fixture',evidenceVersion:'fixture',tabletMap:b.profiles[0].tabletMap.map((t,i)=>({...t,kind:i<21?'active':'non-hormonal'}))};b.scheduledDoses.forEach(d=>d.tabletKind='active');b.evidence[0].reviewStatus='reviewed';parseBackup(b);
 const input={profile:b.profiles[0],doses:b.scheduledDoses,events:b.intakeEvents};const result=evaluateGuidance(input);
 assert.equal(result.status,'unsupported');assert.deepEqual(result.fixedActions,[]);assert.deepEqual(result.evidenceIds,[]);assert.ok(result.missingFacts.some(f=>f.doseId==='dose-2'&&f.field==='intake-status'));assert.ok(result.missingFacts.some(f=>f.doseId==='dose-1'&&f.field==='intake-time'));assert.deepEqual(input,{profile:b.profiles[0],doses:b.scheduledDoses,events:b.intakeEvents});
 assert.throws(()=>evaluateGuidance({...input,events:[...input.events,{...input.events[0],id:'duplicate'}]}),DomainValidationError);
});
test('offline citations resolve exact IDs and never fabricate missing passages',()=>{
 const b=fixture(),index=createEvidenceIndex(b.evidence);assert.equal(resolveEvidenceIds(['fictional-source'],index)[0].excerpt,b.evidence[0].excerpt);assert.throws(()=>resolveEvidenceIds(['invented'],index),DomainValidationError);assert.throws(()=>createEvidenceIndex([...b.evidence,b.evidence[0]]),DomainValidationError);
});
test('published JSON Schema independently validates structural round trip and matches generated schema',async()=>{
 const saved=JSON.parse(await readFile(new URL('../schemas/backup-v1.schema.json',import.meta.url),'utf8'));const generated=z.toJSONSchema(BackupSchema,{target:'draft-2020-12'});const {title,description,...structure}=saved;assert.deepEqual(structure,generated);
 const ajv=new Ajv2020({strict:false});addFormats(ajv);const validate=ajv.compile(saved);assert.equal(validate(fixture()),true,JSON.stringify(validate.errors));assert.equal(validate({...fixture(),schemaVersion:2}),false);assert.equal(validate({...fixture(),secret:'unexpected'}),false);
});

test('bundled source corpus loads offline; empty corpus never implies reviewed guidance',async()=>{
 const corpus=await readFile(new URL('../evidence/approved.json',import.meta.url),'utf8');assert.equal(parseEvidenceCorpusJson(corpus).size,0);
 const b=fixture(),index=parseEvidenceCorpusJson(JSON.stringify(b.evidence));assert.equal(resolveEvidenceIds(['fictional-source'],index)[0].reviewStatus,'draft');assert.throws(()=>parseEvidenceCorpusJson(JSON.stringify([b.evidence[0],b.evidence[0]])),DomainValidationError);
});
