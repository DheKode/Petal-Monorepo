import { z } from 'zod';
import { PillProfileSchema, SettingsSchema, PackSchema, ScheduledDoseSchema, IntakeEventSchema, AuditEntrySchema, BleedingEntrySchema, EvidenceSchema, TimestampSchema } from './schemas.js';
export const BACKUP_VERSION = 1 as const;
export const MAX_BACKUP_BYTES = 1_500_000;
const collection = <T extends z.ZodType>(schema:T) => z.array(schema).max(50000);
export const BackupSchema = z.strictObject({
  schemaVersion:z.literal(BACKUP_VERSION),appVersion:z.string().min(1).max(80),exportedAt:TimestampSchema,encryption:z.literal('none'),
  profiles:collection(PillProfileSchema),settings:SettingsSchema.nullable(),packs:collection(PackSchema),
  scheduledDoses:collection(ScheduledDoseSchema),intakeEvents:collection(IntakeEventSchema),
  auditEntries:collection(AuditEntrySchema),bleedingEntries:collection(BleedingEntrySchema),evidence:collection(EvidenceSchema),
}).superRefine((b,ctx) => {
  const issue = (path:(string|number)[],message:string)=>ctx.addIssue({code:'custom',path,message});
  for (const name of ['profiles','packs','scheduledDoses','intakeEvents','auditEntries','bleedingEntries','evidence'] as const) {
    const seen=new Set<string>();b[name].forEach((record,i)=>{if(seen.has(record.id))issue([name,i,'id'],'Duplicate record ID');seen.add(record.id);});
  }
  const profiles=new Map(b.profiles.map(p=>[p.id,p])),packs=new Map(b.packs.map(p=>[p.id,p])),doses=new Map(b.scheduledDoses.map(d=>[d.id,d])),evidence=new Map(b.evidence.map(e=>[e.id,e]));
  b.profiles.forEach((profile,i)=>profile.evidenceIds.forEach((id,j)=>{
    const passage=evidence.get(id);
    if(!passage)issue(['profiles',i,'evidenceIds',j],'Missing evidence reference');
    else if(!passage.supportedProfileIds.includes(profile.id))issue(['profiles',i,'evidenceIds',j],'Evidence does not apply to profile');
    else if(profile.verificationState==='verified' && passage.reviewStatus!=='reviewed')issue(['profiles',i,'evidenceIds',j],'Verified profile requires reviewed evidence');
  }));
  b.evidence.forEach((e,i)=>e.supportedProfileIds.forEach((id,j)=>{if(!profiles.has(id))issue(['evidence',i,'supportedProfileIds',j],'Missing profile reference');}));
  b.packs.forEach((p,i)=>{if(!profiles.has(p.profileId))issue(['packs',i,'profileId'],'Missing profile reference');});
  const positions=new Set<string>();
  b.scheduledDoses.forEach((d,i)=>{
    const pack=packs.get(d.packId);if(!pack)issue(['scheduledDoses',i,'packId'],'Missing pack reference');
    const slot=JSON.stringify([d.packId,d.position]);if(positions.has(slot))issue(['scheduledDoses',i,'position'],'Duplicate position in pack');positions.add(slot);
    const tablet=pack && profiles.get(pack.profileId)?.tabletMap.find(t=>t.position===d.position);
    if(tablet && tablet.kind!==d.tabletKind)issue(['scheduledDoses',i,'tabletKind'],'Tablet kind differs from profile');
  });
  const recordedDoses=new Set<string>();
  b.intakeEvents.forEach((e,i)=>{
    if(!doses.has(e.doseId))issue(['intakeEvents',i,'doseId'],'Missing scheduled dose reference');
    if(recordedDoses.has(e.doseId))issue(['intakeEvents',i,'doseId'],'Only one current record per dose; corrections belong in audit');recordedDoses.add(e.doseId);
  });
  const entitySchemas={profile:PillProfileSchema,settings:SettingsSchema,pack:PackSchema,'scheduled-dose':ScheduledDoseSchema,'intake-event':IntakeEventSchema,'bleeding-entry':BleedingEntrySchema};
  b.auditEntries.forEach((entry,i)=>{
    for(const side of ['priorValue','newValue'] as const){
      const value=entry[side];if(value===null)continue;
      const parsed=entitySchemas[entry.entityType].safeParse(value);
      if(!parsed.success)issue(['auditEntries',i,side],'Invalid domain entity snapshot');
      else if(parsed.data.id!==entry.entityId)issue(['auditEntries',i,side,'id'],'Audit entity ID mismatch');
    }
    // Deleted entities may be absent from current collections; their audit snapshots remain valid.
  });
});
export type Backup = z.infer<typeof BackupSchema>;
export class DomainValidationError extends Error {
  constructor(public readonly issues:readonly {path:string;message:string}[]){super('Invalid Petal data; local records were not changed');this.name='DomainValidationError';}
}
export function parseBackup(value:unknown):Backup {
  const result=BackupSchema.safeParse(value);
  if(!result.success)throw new DomainValidationError(result.error.issues.map(i=>({path:i.path.join('.'),message:i.code==='custom'?i.message:'Invalid field or unsupported schema'})));
  return result.data;
}
export function parseBackupJson(json:string):Backup {
  if(new TextEncoder().encode(json).byteLength>MAX_BACKUP_BYTES)throw new DomainValidationError([{path:'',message:'Backup exceeds size limit'}]);
  let value:unknown;try{value=JSON.parse(json);}catch{throw new DomainValidationError([{path:'',message:'Malformed JSON'}]);}
  return parseBackup(value);
}
export function serializeBackup(value:Backup):string {
  const json=JSON.stringify(parseBackup(value),null,2);
  if(new TextEncoder().encode(json).byteLength>MAX_BACKUP_BYTES)throw new DomainValidationError([{path:'',message:'Backup exceeds size limit'}]);
  return json;
}
