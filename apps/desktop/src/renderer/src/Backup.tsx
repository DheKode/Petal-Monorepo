import { useState } from 'react';
import { Feedback } from '@petal/ui/components';
import type { ImportPreview, PetalState, RecordCounts } from '../../shared/ipc';

const COUNT_LABELS: [keyof RecordCounts & string, string][] = [
  ['packs', 'Packs'],
  ['scheduledDoses', 'Scheduled tablets'],
  ['intakeEvents', 'Tablet entries'],
  ['auditEntries', 'Change history entries'],
  ['bleedingEntries', 'Bleeding entries'],
];

// Functional screen only. Visual direction belongs to the designer (#11); do not add styling decisions here.
export function Backup({ onState }: { onState: (state: PetalState) => void }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);

  async function exportBackup() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await window.petal.exportBackup();
    setBusy(false);
    if (!result.ok) return setError(result.message);
    if (!result.value.canceled) setMessage(`Saved ${result.value.fileName}. ${result.value.sensitivityNotice}`);
  }

  async function pickImport() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await window.petal.pickImport();
    setBusy(false);
    if (!result.ok) return setError(result.message);
    if (!result.value.canceled) setPreview(result.value.preview);
  }

  async function confirmImport() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    const result = await window.petal.confirmImport(preview.token);
    setBusy(false);
    setPreview(null);
    if (!result.ok) return setError(result.message);
    onState(result.value.state);
    setMessage(
      result.value.recoveryKept
        ? 'Import finished. Your earlier records are kept as a recovery copy inside the app, but there is no screen to restore it yet.'
        : 'Import finished.',
    );
  }

  async function cancelImport() {
    if (preview) await window.petal.cancelImport(preview.token);
    setPreview(null);
    setMessage('Import canceled. Nothing was changed.');
  }

  return (
    <section className="petal-card" aria-labelledby="backup-heading">
      <h2 id="backup-heading">Backup</h2>
      <p>
        A backup is a file with all your records. It is not encrypted, so anyone who can open it can read it. Store it
        somewhere private.
      </p>
      {message && <Feedback kind="success" message={message} />}
      {error && <Feedback kind="error" message={error} />}

      {preview ? (
        <div role="group" aria-labelledby="import-heading">
          <h3 id="import-heading">Replace your records with this file?</h3>
          <p>Importing replaces everything on this device with the contents of the file. Nothing has changed yet.</p>
          <table>
            <caption>Records now and in the file</caption>
            <thead>
              <tr>
                <th scope="col">Record type</th>
                <th scope="col">On this device now</th>
                <th scope="col">In the file</th>
              </tr>
            </thead>
            <tbody>
              {COUNT_LABELS.map(([key, label]) => (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td>{preview.current[key] ?? 0}</td>
                  <td>{preview.incoming[key] ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>Your current records are kept as a recovery copy inside the app's database before they are replaced.</p>
          <p>{preview.sensitivityNotice}</p>
          <p>
            <button type="button" className="petal-button" onClick={confirmImport} disabled={busy}>Replace my records</button>{' '}
            <button type="button" className="petal-button" data-variant="secondary" onClick={cancelImport} disabled={busy}>Cancel</button>
          </p>
        </div>
      ) : (
        <p>
          <button type="button" className="petal-button" data-variant="secondary" onClick={exportBackup} disabled={busy}>Save a backup file</button>{' '}
          <button type="button" className="petal-button" data-variant="secondary" onClick={pickImport} disabled={busy}>Import from a backup file</button>
        </p>
      )}
    </section>
  );
}
