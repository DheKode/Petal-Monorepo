import { useEffect, useMemo, useState } from 'react';
import { listUnresolvedDoses, localDateIn, selectTakenNowTarget, type ScheduledDose } from '@petal/domain';
import type { PetalState, RecordIntakeInput } from '../../shared/ipc';
import { dayParts, doseLabel, doseTime, shortStatus, statusLabel, tabletTypeLabel } from './format';
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
  const todayIndex = state.doses.findIndex(d => d.localDate === localDateIn(now, d.timeZone));
  const anchorIndex = todayIndex >= 0 ? todayIndex : Math.max(0, state.doses.findIndex(d => d.id === dose?.id));
  const stripStart = Math.min(Math.max(0, anchorIndex - 3), Math.max(0, state.doses.length - 7));
  const strip = state.doses.slice(stripStart, stripStart + 7);
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

  function chooseDose(d: ScheduledDose) {
    setSelectedId(d.id === target.dose?.id ? null : d.id);
    setEarlier(false);
    window.scrollTo({ top: 0 });
  }

  return (
    <>
      {repairing && <Repair state={state} onState={onState} onClose={closeRepair} />}
      <div hidden={repairing} className="app-home">
        <nav className="app-strip" aria-label="Days in your pack">
          {strip.map(d => {
            const { weekday, day } = dayParts(d.localDate);
            const { word, mark } = shortStatus(eventOf(d));
            const isToday = d.localDate === localDateIn(now, d.timeZone);
            return (
              <button
                key={d.id}
                type="button"
                className="app-day"
                aria-pressed={d.id === dose?.id}
                aria-current={isToday ? 'date' : undefined}
                aria-label={`Tablet ${d.position}, ${weekday} ${d.localDate}${isToday ? ', today' : ''}: ${word}`}
                onClick={() => chooseDose(d)}
              >
                <span className="app-day-weekday">{isToday ? 'Today' : weekday}</span>
                <span className="app-day-number">{day}</span>
                <span className="app-day-status"><span aria-hidden="true">{mark}</span> {word}</span>
              </button>
            );
          })}
        </nav>

        {notice && (
          <Stack direction="row" wrap space="related">
            <Feedback kind="success" message={notice.text} />
            {notice.undoDoseId && <Button label="Undo" variant="tertiary" onPress={() => undo(notice.undoDoseId!)} />}
          </Stack>
        )}
        {error && <Feedback kind="error" message={error} />}

        <div className="app-grid">
          <section className="app-hero" aria-labelledby="today-heading">
            {dose ? (
              <>
                <p className="app-eyebrow">Recording for {why}</p>
                <h2 id="today-heading" className="app-hero-title">Tablet {dose.position}</h2>
                <p className="app-hero-meta">{dose.localDate} at {doseTime(dose)} · {tabletTypeLabel(dose.tabletKind)}</p>
                <div><StatusBadge label={`Status: ${statusLabel(dose, eventOf(dose))}`} /></div>
                <div className="app-hero-actions">
                  <Button label="Taken now" onPress={() => record({ doseId: dose.id, status: 'taken', actualAt: new Date().toISOString() }, `Recorded ${doseLabel(dose)} as taken now.`)} />
                </div>
                <Stack direction="row" wrap space="related">
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
              <>
                <h2 id="today-heading" className="app-hero-title">All caught up</h2>
                <p>No tablet is waiting for an entry right now. Choose a tablet from the pack below to add or correct an entry.</p>
              </>
            )}
          </section>

          <div className="app-side">
            {unresolvedCount > 0 && (
              <Card title="Not sure about a day?" variant="proposal">
                <Stack>
                  <p className="app-card-text">Let's review it. {unresolvedCount} tablet{unresolvedCount === 1 ? ' has' : 's have'} no confirmed entry. That history is unknown, not missed.</p>
                  <div><Button label="Fix my history" variant="secondary" onPress={() => setRepairing(true)} /></div>
                </Stack>
              </Card>
            )}
            {!selectedId && target.alternatives.length > 0 && (
              <Card title="Another tablet also has no entry">
                <Stack direction="row" wrap space="related">
                  {target.alternatives.map(d => (
                    <Button key={d.id} label={`Tablet ${d.position}, ${d.localDate}`} variant="secondary" onPress={() => setSelectedId(d.id)} />
                  ))}
                </Stack>
              </Card>
            )}
            {target.nextUpcoming && (
              <Card title="Next tablet">
                <p className="app-card-text">{doseLabel(target.nextUpcoming)}</p>
              </Card>
            )}
          </div>
        </div>

        <Guidance state={state} />

        <Card title="Pack">
          <Stack>
            <p className="petal-muted app-card-text">Your 28-tablet schedule. Choose a tablet to add or correct its entry.</p>
            <ol className="app-pack" aria-label="Your 28-tablet schedule">
              {state.doses.map(d => {
                const { word, mark } = shortStatus(eventOf(d));
                const isToday = d.localDate === localDateIn(now, d.timeZone);
                const { weekday, day } = dayParts(d.localDate);
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      className="app-cell"
                      aria-pressed={d.id === dose?.id}
                      aria-current={isToday ? 'date' : undefined}
                      aria-label={`Tablet ${d.position}, ${d.localDate} at ${doseTime(d)}, ${tabletTypeLabel(d.tabletKind)}, ${statusLabel(d, eventOf(d))}${isToday ? ', today' : ''}. Record or correct.`}
                      onClick={() => chooseDose(d)}
                    >
                      <span className="app-cell-number">{d.position}</span>
                      <span className="app-cell-date">{weekday} {day}</span>
                      <span className="app-cell-status"><span aria-hidden="true">{mark}</span> {word}</span>
                      {isToday && <span className="app-cell-today">Today</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
          </Stack>
        </Card>
      </div>
    </>
  );
}
