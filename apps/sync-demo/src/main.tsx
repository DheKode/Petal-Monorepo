import React, { useEffect, useMemo, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react';
import { SyncClient, SyncConflict, createRecoveryKey } from '@petal/encrypted-sync';
import './style.css';
type Demo = { schemaVersion:1; kind:'fictional-sync-demo'; note:string };
const initial = localStorage.getItem('petal-fictional-sync-demo') ?? 'A fictional note for testing optional sync.';
function LocalNote() {
  const [note,setNote] = useState(initial);
  return <section><h2>Local-only demo</h2><p>This setup tool uses fictional notes, not pill records. Your note remains on this browser when you close it.</p><label>Fictional note<textarea value={note} onChange={e => {setNote(e.target.value);localStorage.setItem('petal-fictional-sync-demo',e.target.value);window.dispatchEvent(new Event('petal-local-change'));}} /></label></section>;
}
function Account() {
  const {isLoaded,isSignedIn,userId,getToken} = useAuth();
  const [enabled,setEnabled] = useState(false), [key,setKey] = useState(''), [saved,setSaved] = useState(false), [message,setMessage] = useState('Cloud sync is off.'), [busy,setBusy] = useState(false);
  const [revision,setRevision] = useState<number | null>(null), [preview,setPreview] = useState<Demo | null>(null);
  const epoch = useRef(0);
  const client = useMemo(() => userId ? new SyncClient({baseUrl:import.meta.env.VITE_SYNC_API_URL ?? 'http://localhost:3001',userId,getToken,highestRevision:Number(localStorage.getItem(`petal-sync-revision:${userId}`) ?? 0)}) : null,[userId,getToken]);
  useEffect(() => {epoch.current++;setEnabled(false);setKey('');setSaved(false);setRevision(null);setPreview(null);setMessage('Cloud sync is off.');},[userId]);
  useEffect(() => {client?.setEnabled(enabled);return () => client?.setEnabled(false);},[client,enabled]);
  async function action(fn: () => Promise<void>) {
    const currentEpoch = epoch.current;
    setBusy(true);setPreview(null);
    try {await fn(); if (client && userId) localStorage.setItem(`petal-sync-revision:${userId}`,String(client.revision));}
    catch (error) {if (currentEpoch !== epoch.current) return;setMessage(error instanceof SyncConflict ? 'Another device changed the cloud copy. Read and review it before choosing which copy to upload.' : error instanceof Error ? error.message : 'Sync unavailable.');setRevision(null);}
    finally {if (currentEpoch === epoch.current) setBusy(false);}
  }
  if (!isLoaded) return <section><p>Loading optional account controls. Local notes remain available.</p></section>;
  if (!isSignedIn) return <section><h2>Optional account</h2><p>You can keep using local-only mode. Sign-in requires internet and does not enable uploads.</p><SignInButton mode="modal"><button>Sign in</button></SignInButton> <SignUpButton mode="modal"><button>Create account</button></SignUpButton></section>;
  return <section><h2>Optional encrypted sync</h2>{!busy && <UserButton />}<p>Clerk handles your account identity. Turso stores encrypted snapshots, your account ID, revision, update time, and deletion state. The recovery key stays with you. Losing it means the cloud copy cannot be recovered. Signing in alone never uploads data.</p>
    <label><input type="checkbox" checked={enabled} disabled={busy} onChange={e => {setEnabled(e.target.checked);setRevision(null);setPreview(null);setMessage(e.target.checked ? 'Sync enabled for explicit actions only.' : 'Sync disabled; existing cloud copy is retained.');}}/> I consent to optional encrypted cloud storage</label>
    <label>Recovery key (keep privately; never sent to the server)<input type="password" autoComplete="off" value={key} disabled={busy} onChange={e => {setKey(e.target.value);setSaved(false);setRevision(null);setPreview(null);}} /></label>
    <button disabled={busy || !enabled} onClick={() => action(async () => {setKey(await createRecoveryKey());setSaved(false);setRevision(null);setMessage('New key generated. Save it privately before uploading. Use your existing key to recover another device.');})}>Generate new key</button>
    <button disabled={busy || !key} onClick={() => {const blob = new Blob([key],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='petal-recovery-key.txt';a.click();URL.revokeObjectURL(url);}}>Save recovery key</button>
    <label><input type="checkbox" checked={saved} disabled={busy || !key} onChange={e => setSaved(e.target.checked)}/> I have saved my recovery key privately</label>
    <div className="actions">
    <button disabled={busy || !enabled || !key || !saved} onClick={() => action(async () => {const result=await client!.download<Demo>(key);setRevision(result.snapshot.revision);if (result.value) {if (result.value.schemaVersion !== 1 || result.value.kind !== 'fictional-sync-demo' || typeof result.value.note !== 'string') throw new Error('Unsupported demo snapshot');setPreview(result.value);setMessage('Cloud copy decrypted locally. Review before replacing your local note.');} else setMessage(result.snapshot.deleted ? 'Cloud copy was deleted. Upload only if you intend to recreate it.' : 'No cloud copy yet.');})}>Read cloud copy</button>
    <button disabled={busy || !enabled || !key || !saved || revision === null} onClick={() => {if (!window.confirm('Upload this fictional local note, replacing the reviewed cloud copy?')) return;void action(async () => {const result=await client!.upload({schemaVersion:1,kind:'fictional-sync-demo',note:localStorage.getItem('petal-fictional-sync-demo') ?? initial},key,revision!);setRevision(result.revision);setMessage('Encrypted note uploaded.');});}}>Upload local copy</button>
    <button disabled={busy || !enabled || revision === null} onClick={() => {if (!window.confirm('Delete your cloud copy? Your local note remains. Server backups may retain historical ciphertext.')) return;void action(async () => {const result=await client!.deleteCloudCopy(revision!);setRevision(result.revision);setMessage('Cloud ciphertext deleted; revision tombstone retained.');});}}>Delete cloud copy</button>
    </div>
    {preview && <aside><h3>Cloud preview</h3><p>{preview.note}</p><button disabled={busy} onClick={() => {if (!window.confirm('Replace your local demo note with this cloud preview?')) return;localStorage.setItem('petal-fictional-sync-demo-recovery',localStorage.getItem('petal-fictional-sync-demo') ?? initial);localStorage.setItem('petal-fictional-sync-demo',preview.note);window.location.reload();}}>Confirm local replacement</button><button onClick={() => setPreview(null)}>Cancel</button></aside>}
    <p role="status" aria-live="polite">{message}</p><p>Keys are held in memory for this development tool. On another device, sign in to the same account and enter your saved key. Native adapters must use OS secure storage. Turning sync off or signing out preserves local data.</p>
  </section>;
}
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
function App() {return <main><p className="eyebrow">PETAL · DEVELOPMENT SETUP</p><h1>Your device first.<br/>Sync only when you choose.</h1><LocalNote />{publishableKey ? <ClerkProvider publishableKey={publishableKey}><Account /></ClerkProvider> : <section><h2>Local mode is ready</h2><p>Configure the Clerk publishable key to enable optional account controls.</p></section>}</main>;}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
