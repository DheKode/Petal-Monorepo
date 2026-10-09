export const MAX_CIPHERTEXT_BYTES = 2_000_000;
export type Envelope = { version: 1; algorithm: 'AES-256-GCM'; keyId: string; iv: string; ciphertext: string };
export type RemoteSnapshot = { revision: number; deleted: boolean; envelope: Envelope | null };
export class SyncConflict extends Error {
  constructor(public readonly revision: number) { super('Cloud copy changed. Review both copies before retrying.'); }
}
const encode = (bytes: Uint8Array) => {
  let binary = '';
  for (let i=0;i<bytes.length;i+=8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
};
function decode(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Invalid encoding');
  const bytes = Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
  if (encode(bytes) !== value) throw new Error('Noncanonical encoding');
  return bytes;
}
export function validateEnvelope(value: unknown): Envelope {
  if (!value || typeof value !== 'object') throw new Error('Invalid envelope');
  const e = value as Envelope;
  if (Object.keys(e).sort().join(',') !== 'algorithm,ciphertext,iv,keyId,version' || e.version !== 1 || e.algorithm !== 'AES-256-GCM' || !/^[a-f0-9]{32}$/.test(e.keyId)) throw new Error('Unsupported envelope');
  if (typeof e.iv !== 'string' || decode(e.iv).length !== 12 || typeof e.ciphertext !== 'string' || e.ciphertext.length > Math.ceil(MAX_CIPHERTEXT_BYTES * 4 / 3)) throw new Error('Invalid envelope size');
  const size = decode(e.ciphertext).length;
  if (size < 16 || size > MAX_CIPHERTEXT_BYTES) throw new Error('Invalid ciphertext size');
  return e;
}
function aad(userId: string, revision: number) {
  if (!userId || !Number.isSafeInteger(revision) || revision < 1) throw new Error('Invalid snapshot identity');
  return new TextEncoder().encode(JSON.stringify(['petal-sync', 1, userId, revision]));
}
export async function createRecoveryKey(): Promise<string> { return encode(crypto.getRandomValues(new Uint8Array(32))); }
async function importKey(recoveryKey: string) {
  const raw = decode(recoveryKey.trim());
  if (raw.length !== 32) throw new Error('Recovery key must contain 32 random bytes');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', raw));
  const keyId = Array.from(digest.slice(0,16), b => b.toString(16).padStart(2,'0')).join('');
  const key = await crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt','decrypt']);
  raw.fill(0);
  return { key, keyId };
}
export async function encryptSnapshot(value: unknown, recoveryKey: string, userId: string, revision: number): Promise<Envelope> {
  const { key, keyId } = await importKey(recoveryKey);
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  if (plaintext.length + 16 > MAX_CIPHERTEXT_BYTES) throw new Error('Snapshot too large');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name:'AES-GCM', iv, additionalData:aad(userId, revision) }, key, plaintext);
  plaintext.fill(0);
  return { version:1, algorithm:'AES-256-GCM', keyId, iv:encode(iv), ciphertext:encode(new Uint8Array(ciphertext)) };
}
export async function decryptSnapshot<T>(value: unknown, recoveryKey: string, userId: string, revision: number): Promise<T> {
  const e = validateEnvelope(value);
  const { key, keyId } = await importKey(recoveryKey);
  if (e.keyId !== keyId) throw new Error('Recovery key does not match this vault');
  const plaintext = new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(e.iv),additionalData:aad(userId,revision)},key,decode(e.ciphertext)));
  try { return JSON.parse(new TextDecoder().decode(plaintext)) as T; } finally { plaintext.fill(0); }
}
export class SyncClient {
  private enabled = false;
  private highestRevision = 0;
  private controller = new AbortController();
  constructor(private readonly config: { baseUrl: string; userId: string; getToken: () => Promise<string | null>; fetch?: typeof fetch; highestRevision?: number }) {
    const u = new URL(config.baseUrl);
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(u.hostname))) throw new Error('Sync requires HTTPS');
    this.highestRevision = config.highestRevision ?? 0;
    if (!Number.isSafeInteger(this.highestRevision) || this.highestRevision < 0) throw new Error('Invalid local revision');
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.controller.abort();
    else if (this.controller.signal.aborted) this.controller = new AbortController();
  }
  get revision() { return this.highestRevision; }
  private async request(method: string, revision?: number, envelope?: Envelope): Promise<RemoteSnapshot> {
    if (!this.enabled) throw new Error('Cloud sync is disabled');
    const signal = this.controller.signal;
    const token = await this.config.getToken();
    if (!this.enabled || signal.aborted) throw new Error('Cloud sync is disabled');
    if (!token) throw new Error('Sign in to use optional cloud sync');
    const payload = token.split('.')[1];
    try { if (JSON.parse(new TextDecoder().decode(decode(payload))).sub !== this.config.userId) throw new Error(); }
    catch { throw new Error('Account changed; sign in and unlock sync again'); }
    const headers: Record<string,string> = { Authorization:`Bearer ${token}` };
    if (revision !== undefined) headers['If-Match'] = `"${revision}"`;
    if (envelope) headers['Content-Type'] = 'application/json';
    const response = await (this.config.fetch ?? fetch)(`${this.config.baseUrl.replace(/\/$/,'')}/v1/snapshot`, {method,headers,body:envelope ? JSON.stringify(envelope):undefined,credentials:'omit',cache:'no-store',signal});
    if (!this.enabled || signal.aborted) throw new Error('Cloud sync is disabled');
    if (response.status === 409) {
      const { revision: current } = await response.json() as {revision:number};
      throw new SyncConflict(current);
    }
    if (!response.ok) throw new Error(`Sync unavailable (${response.status}); local records remain unchanged`);
    const result = await response.json() as RemoteSnapshot;
    if (!Number.isSafeInteger(result.revision) || result.revision < this.highestRevision || typeof result.deleted !== 'boolean') throw new Error('Invalid or rolled-back cloud snapshot');
    if (method === 'GET' && result.revision > 0 && !result.deleted) validateEnvelope(result.envelope);
    this.highestRevision = result.revision;
    return result;
  }
  read() { return this.request('GET'); }
  async upload(value: unknown, recoveryKey: string, expectedRevision: number) {
    if (!this.enabled) throw new Error('Cloud sync is disabled');
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision >= Number.MAX_SAFE_INTEGER) throw new Error('Invalid revision');
    if (expectedRevision < this.highestRevision) throw new SyncConflict(this.highestRevision);
    const envelope = await encryptSnapshot(value,recoveryKey,this.config.userId,expectedRevision + 1);
    return this.request('PUT',expectedRevision,envelope);
  }
  async download<T>(recoveryKey: string): Promise<{ snapshot: RemoteSnapshot; value: T | null }> {
    const snapshot = await this.read();
    return { snapshot, value: snapshot.envelope && !snapshot.deleted ? await decryptSnapshot<T>(snapshot.envelope,recoveryKey,this.config.userId,snapshot.revision) : null };
  }
  deleteCloudCopy(expectedRevision: number) { return this.request('DELETE',expectedRevision); }
}
