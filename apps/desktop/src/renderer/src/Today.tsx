import { useEffect, useMemo, useState } from 'react';
import { localDateIn, selectTakenNowTarget, type ScheduledDose } from '@petal/domain';
import type { PetalState, RecordIntakeInput } from '../../shared/ipc';
import { doseLabel, doseTime, statusLabel, tabletTypeLabel } from './format';

interface Notice {
  text: string;
  /** Dose whose last change can be undone. */
  undoDoseId?: string;
}

export function Today({ state, onState }: { state: PetalState; onState: (state: PetalState) => void }) {
  const [now, setNow] = useState(() => new Date());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [earlier, setEarlier] = useState(false);
  const [earlierAt, setEarlierAt] = useState('');
  const [precision, setPrecision] = useState<'exact' | 'approximate'>('exact');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const target = useMemo(() => selectTakenNowTarget(state.doses, state.events, now), [state.doses, state.events, now]);
  const dose = state.doses.find(d => d.id === selectedId) ?? target.dose;
  const eventOf = (d: ScheduledDose) => state.events.find(e => e.doseId === d.id);
  const why = selectedId ? 'selected' : target.reason === 'todays-dose' ? "today's tablet" : 'an earlier tablet that still has no entry';

  async function record(input: RecordIntakeInput, text: string) {
    setError(null);
    const result = await window.petal.recordIntake(input);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onState(result.value.state);
    setNotice(result.value.change === 'unchanged'
      ? { text: 'No change: that entry was already recorded.' }
      : { text, undoDoseId: result.value.undoable ? input.doseId : undefined });
    setSelectedId(null);
    setEarlier(false);
    setEarlierAt('');
  }

  async function undo(doseId: string) {
    setError(null);
    const result = await window.petal.undoIntake(doseId);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onState(result.value);
    setNotice({ text: 'Undone.' });
  }

  function submitEarlier(event: React.FormEvent) {
    event.preventDefault();
    if (!dose) return;
    const when = new Date(earlierAt);
    if (Number.isNaN(when.getTime())) {
      setError('Enter the date and time you took it.');
      return;
    }
    void record({ doseId: dose.id, status: 'taken', actualAt: when.toISOString(), timePrecision: precision }, `Recorded ${doseLabel(dose)} as taken.`);
  }

  return (
    <>
      <section aria-labelledby="today-heading">
        <h2 id="today-heading">Today</h2>
        {notice && (
          <p role="status">
            {notice.text}{' '}
            {notice.undoDoseId && <button type="button" onClick={() => undo(notice.undoDoseId!)}>Undo</button>}
          </p>
        )}
        {error && <p role="alert">{error}</p>}

        {dose ? (
          <>
            <p>
              Recording for <strong>{doseLabel(dose)}</strong> ({why}). Status: {statusLabel(dose, eventOf(dose))}.
            </p>
            <p>
              <button type="button" onClick={() => record({ doseId: dose.id, status: 'taken', actualAt: new Date().toISOString() }, `Recorded ${doseLabel(dose)} as taken now.`)}>Taken now</button>{' '}
              <button type="button" onClick={() => setEarlier(open => !open)} aria-expanded={earlier}>Taken earlier</button>{' '}
              <button type="button" onClick={() => record({ doseId: dose.id, status: 'taken' }, `Recorded ${doseLabel(dose)} as taken, time unknown.`)}>Taken, time unknown</button>{' '}
              <button type="button" onClick={() => record({ doseId: dose.id, status: 'confirmed-missed' }, `Recorded ${doseLabel(dose)} as confirmed missed.`)}>Confirmed missed</button>{' '}
              <button type="button" onClick={() => record({ doseId: dose.id, status: 'unsure' }, `Recorded ${doseLabel(dose)} as unsure.`)}>Unsure</button>
            </p>
            {earlier && (
              <form onSubmit={submitEarlier}>
                <p>
                  <label>When did you take it? <input type="datetime-local" value={earlierAt} onChange={e => setEarlierAt(e.target.value)} required /></label>
                </p>
                <p>
                  <label>
                    How sure are you of the time?{' '}
                    <select value={precision} onChange={e => setPrecision(e.target.value as 'exact' | 'approximate')}>
                      <option value="exact">Exact</option>
                      <option value="approximate">Approximate</option>
                    </select>
                  </label>
                </p>
                <button type="submit">Save time</button>
              </form>
            )}
            {selectedId && <p><button type="button" onClick={() => setSelectedId(null)}>Back to suggested tablet</button></p>}
          </>
        ) : (
          <p>No tablet is waiting for an entry right now. Choose a tablet from the pack below to add or correct an entry.</p>
        )}

        {!selectedId && target.alternatives.length > 0 && (
          <p>
            Another recent tablet also has no entry:{' '}
            {target.alternatives.map(d => (
              <button key={d.id} type="button" onClick={() => setSelectedId(d.id)}>{doseLabel(d)}</button>
            ))}
          </p>
        )}
        {target.nextUpcoming && <p>Next tablet: {doseLabel(target.nextUpcoming)}.</p>}
        {target.olderUnresolved.length > 0 && (
          <p>
            {target.olderUnresolved.length} earlier tablet{target.olderUnresolved.length === 1 ? ' has' : 's have'} no entry. That history is unknown, not missed. You can add what you remember from the pack below.
          </p>
        )}
      </section>

      <section aria-labelledby="pack-heading">
        <h2 id="pack-heading">Pack</h2>
        <table>
          <caption>Your 28-tablet schedule</caption>
          <thead>
            <tr>
              <th scope="col">Tablet</th>
              <th scope="col">Date</th>
              <th scope="col">Time</th>
              <th scope="col">Type</th>
              <th scope="col">Status</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {state.doses.map(d => {
              const isToday = d.localDate === localDateIn(now, d.timeZone);
              return (
                <tr key={d.id} aria-current={isToday ? 'date' : undefined}>
                  <th scope="row">{d.position}{isToday ? ' (today)' : ''}</th>
                  <td>{d.localDate}</td>
                  <td>{doseTime(d)}</td>
                  <td>{tabletTypeLabel(d.tabletKind)}</td>
                  <td>{statusLabel(d, eventOf(d))}</td>
                  <td>
                    <button type="button" onClick={() => { setSelectedId(d.id); window.scrollTo({ top: 0 }); }}>
                      Record or correct tablet {d.position}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
