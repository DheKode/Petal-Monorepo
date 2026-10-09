import { GuidanceInputSchema, GuidanceResultSchema, IntakeEventSchema, type GuidanceInput, type GuidanceResult, type IntakeEvent, type IntakeState } from './schemas.js';
import { DomainValidationError } from './backup.js';
export function getIntakeState(doseId:string,events:readonly IntakeEvent[]):IntakeState {
  const records=events.filter(e=>e.doseId===doseId);
  if(records.length>1)throw new DomainValidationError([{path:'intakeEvents',message:'Duplicate current dose records'}]);
  return records.length ? IntakeEventSchema.parse(records[0]).status:'no-entry';
}
/** Contract stub only. No product-specific clinical rule has been approved here. */
export function evaluateGuidance(input:GuidanceInput):GuidanceResult {
  const parsed=GuidanceInputSchema.safeParse(input);
  if(!parsed.success)throw new DomainValidationError([{path:'guidanceInput',message:'Invalid normalized records'}]);
  const {profile,doses,events}=parsed.data;
  const doseIds=new Set(doses.map(d=>d.id)),eventIds=new Set(events.map(e=>e.id));
  if(doseIds.size!==doses.length || eventIds.size!==events.length || events.some(e=>!doseIds.has(e.doseId)))throw new DomainValidationError([{path:'guidanceInput',message:'Duplicate or unresolved record identity'}]);
  const byDose=new Map<string,IntakeEvent>();
  for(const event of events){if(byDose.has(event.doseId))throw new DomainValidationError([{path:'events',message:'Duplicate current dose records'}]);byDose.set(event.doseId,event);}
  const positions=new Set<string>();
  for(const dose of doses){const slot=JSON.stringify([dose.packId,dose.position]);if(positions.has(slot)||profile.tabletMap.find(t=>t.position===dose.position)?.kind!==dose.tabletKind)throw new DomainValidationError([{path:'doses',message:'Inconsistent scheduled dose'}]);positions.add(slot);}
  const missingFacts:GuidanceResult['missingFacts']=[{doseId:null,field:'profile-verification',reason:'Product-specific clinical rules are not implemented or approved in this contract stub.'}];
  for(const dose of doses){
    const event=byDose.get(dose.id),state=event?.status ?? 'no-entry';
    if(state==='no-entry'||state==='unsure')missingFacts.push({doseId:dose.id,field:'intake-status',reason:'History remains unknown until the user confirms it.'});
    else if(state==='taken' && event?.timePrecision!=='exact')missingFacts.push({doseId:dose.id,field:'intake-time',reason:'Time is approximate or unknown; do not invent an exact timestamp.'});
  }
  return GuidanceResultSchema.parse({status:'unsupported',profileId:profile.id,ruleId:'unsupported.not-yet-verified',ruleVersion:'0',relevantEventIds:events.map(e=>e.id),fixedActions:[],missingFacts,flags:['clinical-guidance-unverified'],evidenceIds:[]});
}
