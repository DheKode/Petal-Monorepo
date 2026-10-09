import { useState } from 'react';
import type { PetalState } from '../../shared/ipc';

// Functional markup only; visual design belongs to the designer (#11).
export function UsualTime({ state, onState }: { state: PetalState; onState: (state: PetalState) => void }) {
  const [time, setTime] = useState(state.settings?.usualTime ?? '');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!state.settings) return null;
  const current = state.settings.usualTime;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    const result = await window.petal.changeUsualTime(time);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onState(result.value);
    setMessage(time === current ? 'No change.' : `Saved. From tomorrow your tablets are scheduled at ${time}.`);
  }

  return (
    <section aria-labelledby="settings-heading">
      <h2 id="settings-heading">Settings</h2>
      <form onSubmit={save}>
        <p>
          <label>Usual time to take your tablet <input type="time" value={time} onChange={e => setTime(e.target.value)} required /></label>
        </p>
        <p>Right now: {current} ({state.settings.timeZone}). A change takes effect from tomorrow. Tablets up to today keep their times, and none of your entries change.</p>
        {message && <p role="status">{message}</p>}
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save usual time'}</button>
      </form>
    </section>
  );
}
