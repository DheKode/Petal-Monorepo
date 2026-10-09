import { createClient, type Client, type Transaction } from '@libsql/client';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { isAbsolute } from 'node:path';
import { parseBackupJson, serializeBackup, parseBackup, evaluateGuidance, IntakeEventSchema, type Backup, type IntakeEvent, type AuditEntry } from '@petal/domain';

export class StorageError extends Error {
  constructor(public readonly code:'stale-preview'|'invalid-preview'|'storage-failed'|'invalid-correction'|'unsupported-storage-version') {
    super(`Petal storage: ${code}; no replacement was applied`); this.name='StorageError';
  }
}
const empty = ():Backup => ({schemaVersion:1,appVersion:'0.1.0',exportedAt:new Date().toISOString(),encryption:'none',profiles:[],settings:null,packs:[],scheduledDoses:[],intakeEvents:[],auditEntries:[],bleedingEntries:[],evidence:[]});
export type Snapshot = {revision:number; backup:Backup};
export type Preview = {token:string; revision:number; kind:'import'|'correction'; counts:Record<string,number>; encryption:'none'; sensitivityNotice:string; changes:readonly {prior:IntakeEvent|null; next:IntakeEvent|null}[]; backup:Backup};
type Pending = {revision:number; kind:'import'|'correction'; backup:Backup; expires:number};
const collections = ['profiles','packs','scheduledDoses','intakeEvents','auditEntries','bleedingEntries','evidence'] as const;
const audited = {profiles:'profile',packs:'pack',scheduledDoses:'scheduled-dose',intakeEvents:'intake-event',bleedingEntries:'bleeding-entry'} as const;
const notice = 'Contains sensitive personal records in plaintext. Store and share privately.';

/** Node/main-process adapter. Only an absolute local path is accepted; no remote replica or credentials. */
export class LocalStore {
  private pending = new Map<string,Pending>();
  private constructor(private readonly db:Client) {}
  static async open(path:string):Promise<LocalStore> {
    if(!isAbsolute(path)) throw new Error('An absolute local SQLite path is required');
    const db=createClient({url:pathToFileURL(path).href});
    try {
      await db.execute('PRAGMA busy_timeout=5000');
      const version=Number((await db.execute('PRAGMA user_version')).rows[0]?.user_version);
      if(version!==0 && version!==1) throw new StorageError('unsupported-storage-version');
      await db.batch([
        'CREATE TABLE IF NOT EXISTS petal_state (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, payload TEXT NOT NULL)',
        'CREATE TABLE IF NOT EXISTS petal_recovery (id TEXT PRIMARY KEY, revision INTEGER NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL)',
        {sql:'INSERT OR IGNORE INTO petal_state VALUES (1,0,?)',args:[serializeBackup(empty())]},
        'PRAGMA user_version=1',
      ],'write');
      return new LocalStore(db);
    } catch(error) {db.close(); if(error instanceof StorageError) throw error; throw new StorageError('storage-failed');}
  }
  close():void {this.pending.clear();this.db.close();}
  private async readFrom(db:Client|Transaction):Promise<Snapshot> {
    const row=(await db.execute('SELECT revision,payload FROM petal_state WHERE id=1')).rows[0];
    if(!row) throw new StorageError('storage-failed');
    return {revision:Number(row.revision),backup:parseBackupJson(String(row.payload))};
  }
  async read():Promise<Snapshot> {try{return await this.readFrom(this.db);}catch{throw new StorageError('storage-failed');}}
  async exportJson():Promise<{json:string;encryption:'none';sensitivityNotice:string}> {
    const {backup}=await this.read();backup.exportedAt=new Date().toISOString();
    return {json:serializeBackup(backup),encryption:'none',sensitivityNotice:notice};
  }
  private preview(revision:number,kind:Pending['kind'],backup:Backup,changes:Preview['changes']=[]):Preview {
    for(const [token,p] of this.pending) if(p.expires<Date.now()) this.pending.delete(token);
    if(this.pending.size>=64) throw new StorageError('invalid-preview');
    const token=randomUUID();
    this.pending.set(token,{revision,kind,backup:structuredClone(backup),expires:Date.now()+5*60_000});
    return {token,revision,kind,counts:Object.fromEntries(collections.map(k=>[k,backup[k].length])),encryption:'none',sensitivityNotice:notice,changes:structuredClone(changes),backup:structuredClone(backup)};
  }
  async previewImport(json:string):Promise<Preview> {
    const backup=parseBackupJson(json); // Validate bounded input before touching current data.
    const current=await this.read();return this.preview(current.revision,'import',backup);
  }
  async previewIntakeCorrection(event:unknown,origin:'manual'|'chat'):Promise<Preview> {
    if(origin!=='manual' && origin!=='chat') throw new StorageError('invalid-correction');
    const next=IntakeEventSchema.parse(event);const {backup,revision}=await this.read();
    const prior=backup.intakeEvents.find(e=>e.doseId===next.doseId) ?? null;
    if(prior && (prior.id!==next.id || prior.createdAt!==next.createdAt || Date.parse(next.updatedAt)<Date.parse(prior.updatedAt))) throw new StorageError('invalid-correction');
    if(!prior && backup.intakeEvents.some(e=>e.id===next.id)) throw new StorageError('invalid-correction');
    next.origin=origin;
    backup.intakeEvents=backup.intakeEvents.filter(e=>e.doseId!==next.doseId);backup.intakeEvents.push(next);
    backup.auditEntries.push({id:randomUUID(),entityId:next.id,entityType:'intake-event',priorValue:prior,newValue:next,timestamp:next.updatedAt,origin});
    return this.preview(revision,'correction',parseBackup(backup),[{prior,next}]);
  }
  cancel(token:string):void {this.pending.delete(token);}
  private importAudit(prior:Backup,next:Backup):void {
    const timestamp=new Date().toISOString();
    const append=(entityType:AuditEntry['entityType'],before:{id:string}|null,after:{id:string}|null) => {
      if(JSON.stringify(before)===JSON.stringify(after)) return;
      next.auditEntries.push({id:randomUUID(),entityId:(after ?? before)!.id,entityType,priorValue:before as AuditEntry['priorValue'],newValue:after as AuditEntry['newValue'],timestamp,origin:'import'});
    };
    for(const [collection,entityType] of Object.entries(audited) as [keyof typeof audited,AuditEntry['entityType']][]) {
      const before=new Map(prior[collection].map(e=>[e.id,e]));const after=new Map(next[collection].map(e=>[e.id,e]));
      for(const id of new Set([...before.keys(),...after.keys()])) append(entityType,before.get(id)??null,after.get(id)??null);
    }
    if(prior.settings?.id===next.settings?.id) append('settings',prior.settings,next.settings);
    else {if(prior.settings) append('settings',prior.settings,null);if(next.settings) append('settings',null,next.settings);}
  }
  /** Call only after the user accepts the displayed preview. No mutable input is accepted here. */
  async confirm(token:string):Promise<{revision:number;recoveryId:string|null}> {
    const pending=this.pending.get(token);this.pending.delete(token);
    if(!pending || pending.expires<Date.now()) throw new StorageError('invalid-preview');
    let tx:Transaction|undefined;
    try {
      tx=await this.db.transaction('write');const current=await this.readFrom(tx);
      if(current.revision!==pending.revision) throw new StorageError('stale-preview');
      const next=structuredClone(pending.backup);let recoveryId:string|null=null;
      if(pending.kind==='import') {
        recoveryId=randomUUID();
        await tx.execute({sql:'INSERT INTO petal_recovery VALUES (?,?,?,?)',args:[recoveryId,current.revision,new Date().toISOString(),serializeBackup(current.backup)]});
        this.importAudit(current.backup,next);
      }
      const json=serializeBackup(next); // Revalidate full graph, generated audits, and final size inside transaction.
      await tx.execute({sql:'UPDATE petal_state SET revision=?,payload=? WHERE id=1',args:[current.revision+1,json]});
      await tx.commit();return {revision:current.revision+1,recoveryId};
    } catch(error) {if(tx && !tx.closed) await tx.rollback().catch(()=>{});if(error instanceof StorageError) throw error;throw new StorageError('storage-failed');}
    finally {tx?.close();}
  }
  async listRecovery():Promise<readonly {id:string;revision:number;createdAt:string}[]> {
    try {const result=await this.db.execute('SELECT id,revision,created_at FROM petal_recovery ORDER BY revision DESC');return result.rows.map(r=>({id:String(r.id),revision:Number(r.revision),createdAt:String(r.created_at)}));}
    catch {throw new StorageError('storage-failed');}
  }
  async recoveryJson(id:string):Promise<string> {
    try {const row=(await this.db.execute({sql:'SELECT payload FROM petal_recovery WHERE id=?',args:[id]})).rows[0];if(!row)throw new StorageError('invalid-preview');return serializeBackup(parseBackupJson(String(row.payload)));}
    catch(error) {if(error instanceof StorageError)throw error;throw new StorageError('storage-failed');}
  }
  async guidance(profileId:string) {
    const {backup}=await this.read();const profile=backup.profiles.find(p=>p.id===profileId);
    if(!profile) throw new StorageError('invalid-correction');
    const packs=new Set(backup.packs.filter(p=>p.profileId===profileId).map(p=>p.id));
    const doses=backup.scheduledDoses.filter(d=>packs.has(d.packId));const doseIds=new Set(doses.map(d=>d.id));
    return evaluateGuidance({profile,doses,events:backup.intakeEvents.filter(e=>doseIds.has(e.doseId))});
  }
}
