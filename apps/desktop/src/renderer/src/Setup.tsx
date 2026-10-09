import { useState } from 'react';
import { localDateIn } from '@petal/domain';
import { deriveFromSetupInput, type DerivedSetup } from '../../shared/setup';
import type { PetalState, SetupInput } from '../../shared/ipc';
import { errorText, tabletTypeLabel, doseTime } from './format';

type Kind = 'first-pack' | 'mid-pack';

export function Setup({ onSaved }: { onSaved: (state: PetalState) => void }) {
  const deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [kind, setKind] = useState<Kind>('first-pack');
  const [startDate, setStartDate] = useState('');
  const [position, setPosition] = useState('');
  const [anchorDate, setAnchorDate] = useState(() => localDateIn(new Date(), deviceZone));
  const [usualTime, setUsualTime] = useState('');
  const [timeZone, setTimeZone] = useState(deviceZone);
  const [review, setReview] = useState<DerivedSetup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const buildInput = (): SetupInput => ({
    usualTime,
    timeZone,
    anchor: kind === 'first-pack' ? { kind, startDate } : { kind, position: Number(position), date: anchorDate },
  });

  function showReview() {
    setError(null);
    try {
      setReview(deriveFromSetupInput(buildInput()));
    } catch (e) {
      setError(errorText(e));
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    const result = await window.petal.saveSetup(buildInput());
    setSaving(false);
    if (result.ok) onSaved(result.value);
    else setError(result.message);
  }

  if (review) {
    return (
      <section aria-labelledby="review-heading">
        <h2 id="review-heading">Review your schedule</h2>
        <p>
          Tablets are scheduled daily at {usualTime} ({timeZone}), starting {review.pack.startDate}.
          {kind === 'mid-pack' && ' Earlier tablets in this pack have no entry; their history stays unknown.'}
        </p>
        <table>
          <caption>Derived 28-tablet schedule</caption>
          <thead>
            <tr><th scope="col">Tablet</th><th scope="col">Date</th><th scope="col">Time</th><th scope="col">Type</th></tr>
          </thead>
          <tbody>
            {review.doses.map(dose => (
              <tr key={dose.id}>
                <th scope="row">{dose.position}</th>
                <td>{dose.localDate}</td>
                <td>{doseTime(dose)}</td>
                <td>{tabletTypeLabel(dose.tabletKind)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {error && <p role="alert">{error}</p>}
        <p>
          <button type="button" onClick={() => setReview(null)} disabled={saving}>Back</button>{' '}
          <button type="button" onClick={save} disabled={saving}>Save schedule</button>
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="setup-heading">
      <h2 id="setup-heading">Set up your pack</h2>
      <p>Petal supports one product: the Trust 28-tablet pack (21 active and 7 non-hormonal tablets).</p>
      <form onSubmit={event => { event.preventDefault(); showReview(); }}>
        <fieldset>
          <legend>Which pack are you on?</legend>
          <label><input type="radio" name="kind" checked={kind === 'first-pack'} onChange={() => setKind('first-pack')} /> I am starting a first pack</label>
          <br />
          <label><input type="radio" name="kind" checked={kind === 'mid-pack'} onChange={() => setKind('mid-pack')} /> I am partway through a pack</label>
        </fieldset>

        {kind === 'first-pack' ? (
          <p>
            <label>Date of tablet 1 <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required /></label>
          </p>
        ) : (
          <>
            <p>
              <label>Which tablet is scheduled today? (1 to 28) <input type="number" min={1} max={28} value={position} onChange={e => setPosition(e.target.value)} required /></label>
            </p>
            <p>
              <label>On this date <input type="date" value={anchorDate} onChange={e => setAnchorDate(e.target.value)} required /></label>
            </p>
          </>
        )}

        <p>
          <label>Usual time to take your tablet <input type="time" value={usualTime} onChange={e => setUsualTime(e.target.value)} required /></label>
        </p>
        <p>
          <label>Time zone <input type="text" value={timeZone} onChange={e => setTimeZone(e.target.value)} required /></label>
        </p>
        {error && <p role="alert">{error}</p>}
        <button type="submit">Review schedule</button>
      </form>
    </section>
  );
}
