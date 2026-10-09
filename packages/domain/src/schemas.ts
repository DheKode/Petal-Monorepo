import { z } from 'zod';
export const IdSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
export const LocalDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === value;
},'Invalid calendar date');
export const TimestampSchema = z.iso.datetime({offset:true}).refine(value => LocalDateSchema.safeParse(value.slice(0,10)).success,'Invalid timestamp date');
export const TimeZoneSchema = z.string().min(1).max(80).refine(value => {
  if (value !== 'UTC' && !value.includes('/')) return false;
  try { new Intl.DateTimeFormat('en',{timeZone:value}); return true; } catch { return false; }
},'Unsupported IANA time zone');
const VersionSchema = z.string().min(1).max(80);
const NullableText = z.string().min(1).max(500).nullable();
export const ReviewStatusSchema = z.enum(['draft','reviewed','rejected']);
export const TabletKindSchema = z.enum(['active','non-hormonal','unverified']);
export const PillProfileSchema = z.strictObject({
  id:IdSchema, product:z.literal('Trust 28'), formulation:NullableText,
  ingredients:z.array(z.strictObject({name:z.string().min(1).max(150),strength:z.string().min(1).max(100)})).max(20),
  regimen:z.literal('28-tablet-pack'),
  tabletMap:z.array(z.strictObject({position:z.number().int().min(1).max(28),kind:TabletKindSchema,label:z.string().min(1).max(100)})).length(28),
  leafletVersion:VersionSchema.nullable(), evidenceVersion:VersionSchema.nullable(),
  evidenceIds:z.array(IdSchema).max(100), verificationState:z.enum(['unverified','verified']),
}).superRefine((p,ctx) => {
  if (new Set(p.tabletMap.map(t=>t.position)).size !== 28) ctx.addIssue({code:'custom',message:'Tablet positions must be unique',path:['tabletMap']});
  if (p.verificationState === 'verified' && (!p.formulation || !p.ingredients.length || !p.leafletVersion || !p.evidenceVersion || !p.evidenceIds.length || p.tabletMap.some(t=>t.kind==='unverified') || p.tabletMap.filter(t=>t.kind==='active').length!==21 || p.tabletMap.filter(t=>t.kind==='non-hormonal').length!==7)) ctx.addIssue({code:'custom',message:'Verified profile requires complete reviewed product metadata',path:['verificationState']});
});
export const SettingsSchema = z.strictObject({
  id:IdSchema, usualTime:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), timeZone:TimeZoneSchema,
  notificationPreference:z.enum(['disabled','enabled','permission-denied']), locale:z.literal('en'),
  modelConfiguration:z.strictObject({enabled:z.boolean(),modelId:IdSchema.nullable(),artifactSha256:z.string().regex(/^[a-f0-9]{64}$/).nullable(),runtime:NullableText}),
});
export const PackSchema = z.strictObject({
  id:IdSchema, profileId:IdSchema, startDate:LocalDateSchema, scheduleVersion:VersionSchema,
  transitionState:z.enum(['planned','current','completed','delayed','uncertain']),
});
export const ScheduledDoseSchema = z.strictObject({
  id:IdSchema,packId:IdSchema,position:z.number().int().min(1).max(28),tabletKind:TabletKindSchema,
  scheduledAt:TimestampSchema,localDate:LocalDateSchema,timeZone:TimeZoneSchema,
}).superRefine((dose,ctx) => {
  try {
    const parts = new Intl.DateTimeFormat('en',{timeZone:dose.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(dose.scheduledAt));
    const part=(type:string)=>parts.find(p=>p.type===type)?.value;
    if (`${part('year')}-${part('month')}-${part('day')}`!==dose.localDate) ctx.addIssue({code:'custom',message:'Local date must match timestamp in schedule zone',path:['localDate']});
  } catch { /* Primitive validators report invalid timestamps/zones. */ }
});
export const IntakeStatusSchema = z.enum(['taken','confirmed-missed','unsure']);
export const TimePrecisionSchema = z.enum(['exact','approximate','unknown']);
export const RecordOriginSchema = z.enum(['manual','chat','import']);
export const IntakeEventSchema = z.strictObject({
  id:IdSchema,doseId:IdSchema,status:IntakeStatusSchema,actualAt:TimestampSchema.nullable(),timePrecision:TimePrecisionSchema,
  timeZone:TimeZoneSchema,origin:RecordOriginSchema,createdAt:TimestampSchema,updatedAt:TimestampSchema,
}).superRefine((e,ctx) => {
  if (e.status!=='taken' && (e.actualAt!==null || e.timePrecision!=='unknown')) ctx.addIssue({code:'custom',message:'Missed and unsure records cannot assert an intake timestamp',path:['actualAt']});
  if (e.timePrecision==='unknown' && e.actualAt!==null) ctx.addIssue({code:'custom',message:'Unknown time must remain null',path:['actualAt']});
  if (e.status==='taken' && e.timePrecision!=='unknown' && e.actualAt===null) ctx.addIssue({code:'custom',message:'Known time precision requires an actual or approximate timestamp',path:['actualAt']});
  if (Date.parse(e.updatedAt)<Date.parse(e.createdAt)) ctx.addIssue({code:'custom',message:'Update precedes creation',path:['updatedAt']});
});
export const BleedingEntrySchema = z.strictObject({
  id:IdSchema,startDate:LocalDateSchema,endDate:LocalDateSchema.nullable(),category:z.enum(['spotting','bleeding']),
  intensity:z.enum(['light','moderate','heavy']).nullable(),note:z.string().max(4000).nullable(),
}).superRefine((e,ctx)=>{if(e.endDate && e.endDate<e.startDate)ctx.addIssue({code:'custom',message:'End date precedes start date',path:['endDate']});});
export const EvidenceSchema = z.strictObject({
  id:IdSchema,publisher:z.string().min(1).max(200),title:z.string().min(1).max(500),
  url:z.url({protocol:/^https?$/}),sectionOrPage:z.string().min(1).max(200),excerpt:z.string().min(1).max(20000),
  publicationDate:LocalDateSchema.nullable(),retrievalDate:LocalDateSchema,
  supportedProfileIds:z.array(IdSchema).min(1).max(100),version:VersionSchema,reviewStatus:ReviewStatusSchema,
});
export const AuditEntityTypeSchema = z.enum(['profile','settings','pack','scheduled-dose','intake-event','bleeding-entry']);
export const AuditEntrySchema = z.strictObject({
  id:IdSchema,entityId:IdSchema,entityType:AuditEntityTypeSchema,priorValue:z.json().nullable(),newValue:z.json().nullable(),
  timestamp:TimestampSchema,origin:RecordOriginSchema,
}).superRefine((e,ctx)=>{if(e.priorValue===null && e.newValue===null)ctx.addIssue({code:'custom',message:'Audit must describe a creation, correction or deletion',path:['newValue']});});
export const GuidanceResultSchema = z.strictObject({
  status:z.enum(['supported','unsupported','incomplete']),profileId:IdSchema,
  ruleId:IdSchema,ruleVersion:VersionSchema,relevantEventIds:z.array(IdSchema).max(50000),
  fixedActions:z.array(z.strictObject({id:IdSchema,text:z.string().min(1).max(2000)})).max(100),
  missingFacts:z.array(z.strictObject({doseId:IdSchema.nullable(),field:z.enum(['profile-verification','intake-status','intake-time','other']),reason:z.string().min(1).max(1000)})).max(50000),
  flags:z.array(z.string().min(1).max(100)).max(100),evidenceIds:z.array(IdSchema).max(100),
});
export const GuidanceInputSchema = z.strictObject({profile:PillProfileSchema,doses:z.array(ScheduledDoseSchema).max(50000),events:z.array(IntakeEventSchema).max(50000)});
export type PillProfile=z.infer<typeof PillProfileSchema>;
export type Settings=z.infer<typeof SettingsSchema>;
export type Pack=z.infer<typeof PackSchema>;
export type ScheduledDose=z.infer<typeof ScheduledDoseSchema>;
export type IntakeEvent=z.infer<typeof IntakeEventSchema>;
export type AuditEntry=z.infer<typeof AuditEntrySchema>;
export type BleedingEntry=z.infer<typeof BleedingEntrySchema>;
export type Evidence=z.infer<typeof EvidenceSchema>;
export type GuidanceResult=z.infer<typeof GuidanceResultSchema>;
export type GuidanceInput=z.infer<typeof GuidanceInputSchema>;
export type IntakeState=z.infer<typeof IntakeStatusSchema> | 'no-entry';
