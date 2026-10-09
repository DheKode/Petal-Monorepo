import { useEffect, useMemo, useState } from 'react';
import { listUnresolvedDoses, localDateIn, selectTakenNowTarget, type ScheduledDose } from '@petal/domain';
import type { PetalState, RecordIntakeInput } from '../../shared/ipc';
import { doseLabel, doseTime, statusLabel, tabletTypeLabel } from './format';
import { Guidance } from './Guidance';
import { Repair } from './Repair';
import { Button, Card, Feedback, StatusBadge } from '@petal/ui/components';
import { Stack } from '@petal/ui/layouts';

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
  const [repairing, setRepairing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const target = useMemo(() => selectTakenNowTarget(state.doses, state.events, now), [state.doses, state.events, now]);
  const unresolvedCount = useMemo(() => listUnresolvedDoses(state.doses, state.events, now).length, [state.doses, state.events, now]);
  const dose = state.doses.find(d => d.id === selectedId) ?? target.dose;
  const eventOf = (d: ScheduledDose) => state.events.find(e => e.doseId === d.id);
  const why = selectedId ? 'selected' : target.reason === 'todays-dose' ? "today's tablet" : 'an earlier tablet that still has no entry';

  function closeRepair(message?: string) {
    setRepairing(false);
    setError(null);
    setNotice(message ? { text: message } : null);
  }

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
      {repairing && <Repair state={state} onState={onState} onClose={closeRepair} />}
      <div hidden={repairing}>
        <Stack space="section">
          <Card title="Today">
            <Stack>
              {notice && (
                <Stack direction="row" wrap space="related">
                  <Feedback kind="success" message={notice.text} />
                  {notice.undoDoseId && <Button label="Undo" variant="tertiary" onPress={() => undo(notice.undoDoseId!)} />}
                </Stack>
              )}
              {error && <Feedback kind="error" message={error} />}

              {dose ? (
                <>
                  <div className="app-dose">
                    <p className="petal-muted app-dose-why">Recording for {why}</p>
                    <p className="app-dose-title">{doseLabel(dose)}</p>
                    <StatusBadge label={`Status: ${statusLabel(dose, eventOf(dose))}`} />
                  </div>
                  <Stack direction="row" wrap space="related">
                    <Button label="Taken now" onPress={() => record({ doseId: dose.id, status: 'taken', actualAt: new Date().toISOString() }, `Recorded ${doseLabel(dose)} as taken now.`)} />
                    <button type="button" className="petal-button" data-variant="secondary" onClick={() => setEarlier(open => !open)} aria-expanded={earlier}>Taken earlier</button>
                    <Button label="Taken, time unknown" variant="secondary" onPress={() => record({ doseId: dose.id, status: 'taken' }, `Recorded ${doseLabel(dose)} as taken, time unknown.`)} />
                    <Button label="Confirmed missed" variant="secondary" onPress={() => record({ doseId: dose.id, status: 'confirmed-missed' }, `Recorded ${doseLabel(dose)} as confirmed missed.`)} />
                    <Button label="Unsure" variant="secondary" onPress={() => record({ doseId: dose.id, status: 'unsure' }, `Recorded ${doseLabel(dose)} as unsure.`)} />
                  </Stack>
                  {earlier && (
                    <form onSubmit={submitEarlier} className="app-form">
                      <label className="app-field">
                        <span className="petal-label">When did you take it?</span>
                        <input className="petal-input" type="datetime-local" value={earlierAt} onChange={e => setEarlierAt(e.target.value)} required />
                      </label>
                      <label className="app-field">
                        <span className="petal-label">How sure are you of the time?</span>
                        <select className="petal-input" value={precision} onChange={e => setPrecision(e.target.value as 'exact' | 'approximate')}>
                          <option value="exact">Exact</option>
                          <option value="approximate">Approximate</option>
                        </select>
                      </label>
                      <div><button type="submit" className="petal-button">Save time</button></div>
                    </form>
                  )}
                  {selectedId && <div><Button label="Back to suggested tablet" variant="tertiary" onPress={() => setSelectedId(null)} /></div>}
                </>
              ) : (
                <p>No tablet is waiting for an entry right now. Choose a tablet from the pack below to add or correct an entry.</p>
              )}

              {!selectedId && target.alternatives.length > 0 && (
                <Stack direction="row" wrap space="related">
                  <span className="petal-muted">Another recent tablet also has no entry:</span>
                  {target.alternatives.map(d => (
                    <Button key={d.id} label={doseLabel(d)} variant="secondary" onPress={() => setSelectedId(d.id)} />
                  ))}
                </Stack>
              )}
              {target.nextUpcoming && <p className="petal-muted">Next tablet: {doseLabel(target.nextUpcoming)}.</p>}
              {unresolvedCount > 0 && (
                <div className="app-prompt">
                  <p>Not sure about a day? Let's review it.</p>
                  <Button
                    label={`Fix my history (${unresolvedCount} tablet${unresolvedCount === 1 ? '' : 's'} without a confirmed entry)`}
                    variant="secondary"
                    onPress={() => setRepairing(true)}
                  />
                </div>
              )}
              {target.olderUnresolved.length > 0 && (
                <p className="petal-muted">
                  {target.olderUnresolved.length} earlier tablet{target.olderUnresolved.length === 1 ? ' has' : 's have'} no entry. That history is unknown, not missed. You can add what you remember from the pack below.
                </p>
              )}
            </Stack>
          </Card>

          <Guidance state={state} />

          <Card title="Pack">
            <div className="app-table-wrap">
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
                          <Button
                            label={`Record or correct tablet ${d.position}`}
                            variant="tertiary"
                            onPress={() => { setSelectedId(d.id); window.scrollTo({ top: 0 }); }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </Stack>
      </div>
    </>
  );
}
