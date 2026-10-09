import {z} from 'zod';
import { EvidenceSchema, type Evidence } from './schemas.js';
import { DomainValidationError } from './backup.js';
/** ID lookup only: source inspection is offline and does not fetch external URLs. */
export function createEvidenceIndex(passages:readonly Evidence[]):ReadonlyMap<string,Evidence> {
  const result=new Map<string,Evidence>();
  for(const passage of passages){
    const parsed=EvidenceSchema.safeParse(passage);
    if(!parsed.success)throw new DomainValidationError([{path:'evidence',message:'Invalid source metadata'}]);
    if(result.has(parsed.data.id))throw new DomainValidationError([{path:'evidence',message:'Duplicate evidence ID'}]);
    result.set(parsed.data.id,parsed.data);
  }
  return result;
}
export function resolveEvidenceIds(ids:readonly string[],index:ReadonlyMap<string,Evidence>):Evidence[] {
  return ids.map(id=>{const value=index.get(id);if(!value)throw new DomainValidationError([{path:'evidenceIds',message:'Unresolved offline citation'}]);return value;});
}

export const EvidenceCorpusSchema=z.array(EvidenceSchema).max(2000).refine(passages=>new Set(passages.map(p=>p.id)).size===passages.length,'Duplicate evidence IDs');
export function parseEvidenceCorpusJson(json:string):ReadonlyMap<string,Evidence> {
  if(new TextEncoder().encode(json).byteLength>1_500_000)throw new DomainValidationError([{path:'evidence',message:'Evidence corpus exceeds size limit'}]);
  let value:unknown;try{value=JSON.parse(json);}catch{throw new DomainValidationError([{path:'evidence',message:'Malformed evidence JSON'}]);}
  const parsed=EvidenceCorpusSchema.safeParse(value);
  if(!parsed.success)throw new DomainValidationError([{path:'evidence',message:'Invalid or duplicate source metadata'}]);
  return createEvidenceIndex(parsed.data);
}
