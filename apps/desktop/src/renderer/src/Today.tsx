import { useEffect, useMemo, useState } from 'react';
import { listUnresolvedDoses, localDateIn, selectTakenNowTarget, type ScheduledDose } from '@petal/domain';
import type { PetalState, RecordIntakeInput } from '../../shared/ipc';
import { dayParts, friendlyDate, doseLabel, doseTime, shortStatus, statusLabel, tabletTypeLabel } from './format';
import { Guidance } from './Guidance';
import { Repair } from './Repair';
import { Button, Card, Feedback, StatusBadge } from '@petal/ui/components';
import { Stack } from '@petal/ui/layouts';
import { Icon } from '@petal/ui/icons';
import { IconLabelButton } from './IconLabelButton';
import { DayChip, PackCell } from './StatusButtons';
import { art } from './art';

interface Notice {
  text: string;
  /** Dose whose last change can be undone. */
  undoDoseId?: string;
}

export function Today({ state, onState, view }: { state: PetalState; onState: (state: PetalState) => void; view: 'today' | 'pack' }) {
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
  const why = selectedId ? 'Selected tablet' : target.reason === 'todays-dose' ? "Today's tablet" : 'Earliest tablet without an entry';

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
    // On Today the record card is above the strip's fold; on Pack it sits beside the grid and stays in view.
    if (view === 'today') window.scrollTo({ top: 0 });
  }

  const messages = (
    <>
      {notice && (
        <Stack direction="row" wrap space="related">
          <Feedback kind="success" message={notice.text} />
          {notice.undoDoseId && <Button label="Undo" variant="tertiary" onPress={() => undo(notice.undoDoseId!)} />}
        </Stack>
      )}
      {error && <Feedback kind="error" message={error} />}
    </>
  );

  const hero = (
    <section className="app-hero" data-compact={view === 'pack' || undefined} aria-labelledby="record-heading">
      <div className="app-hero-body">
      {dose ? (
        <>
          <p className="app-eyebrow">{why}</p>
          <h2 id="record-heading" className="app-hero-title">Tablet {dose.position}</h2>
          <p className="app-hero-meta">
            <span><Icon name="calendar" size="small" /> {friendlyDate(dose.localDate)}</span>
            <span><Icon name="clock" size="small" /> {doseTime(dose)}</span>
            {dose.tabletKind !== 'unverified' && <span>{tabletTypeLabel(dose.tabletKind)} tablet</span>}
          </p>
          <div><StatusBadge label={`Status: ${statusLabel(dose, eventOf(dose))}`} /></div>
          <div className="app-hero-actions">
            <IconLabelButton icon="taken" label="Taken now" onPress={() => record({ doseId: dose.id, status: 'taken', actualAt: new Date().toISOString() }, `Recorded ${doseLabel(dose)} as taken now.`)} />
          </div>
          <div className="app-hero-more">
            <IconLabelButton icon="clock" label="Taken earlier" variant="secondary" onPress={() => setEarlier(open => !open)} expanded={earlier} />
            <IconLabelButton icon="taken" label="Taken, time unknown" variant="secondary" onPress={() => record({ doseId: dose.id, status: 'taken' }, `Recorded ${doseLabel(dose)} as taken, time unknown.`)} />
            <IconLabelButton icon="missed" label="Confirmed missed" variant="secondary" onPress={() => record({ doseId: dose.id, status: 'confirmed-missed' }, `Recorded ${doseLabel(dose)} as confirmed missed.`)} />
            <IconLabelButton icon="unsure" label="Unsure" variant="secondary" onPress={() => record({ doseId: dose.id, status: 'unsure' }, `Recorded ${doseLabel(dose)} as unsure.`)} />
          </div>
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
              <div><IconLabelButton icon="check" label="Save time" submit /></div>
            </form>
          )}
          {target.nextUpcoming && !selectedId && (
            <p className="app-hero-next">Next: Tablet {target.nextUpcoming.position}, {friendlyDate(target.nextUpcoming.localDate)} at {doseTime(target.nextUpcoming)}</p>
          )}
          {selectedId && <div><IconLabelButton icon="back" label="Back to suggested tablet" variant="tertiary" onPress={() => setSelectedId(null)} /></div>}
        </>
      ) : (
        <>
          <h2 id="record-heading" className="app-hero-title">All caught up</h2>
          <p>No tablet is waiting for an entry right now. Choose a tablet in the pack to add or correct an entry.</p>
        </>
      )}
      </div>
      {view === 'today' && <img className="app-hero-art" src={art.hello} alt="" />}
    </section>
  );

  const reviewCard = unresolvedCount > 0 && (
    <Card title="Not sure about a day?" variant="proposal">
      <div className="app-review">
        <Stack>
          <p className="app-card-text">Let's review it. {unresolvedCount} tablet{unresolvedCount === 1 ? ' has' : 's have'} no confirmed entry. That history is unknown, not missed.</p>
          <div><IconLabelButton icon="edit" label="Fix my history" variant="secondary" onPress={() => setRepairing(true)} /></div>
        </Stack>
        <img className="app-review-art" src={art.reflecting} alt="" />
      </div>
    </Card>
  );

  const pack = (
    <Card title="Pack calendar">
      <Stack>
        <div className="app-calendar">
          <div className="app-calendar-head" aria-hidden="true">
            {state.doses.slice(0, 7).map(d => <span key={d.id}>{dayParts(d.localDate).weekday}</span>)}
          </div>
          <ol className="app-pack" aria-label="Your 28-tablet schedule">
            {state.doses.map((d, index) => {
              const { word, icon } = shortStatus(eventOf(d));
              const isToday = d.localDate === localDateIn(now, d.timeZone);
              const { weekday, day, month } = dayParts(d.localDate);
              const kind = tabletTypeLabel(d.tabletKind);
              return (
                <li key={d.id}>
                  <PackCell
                    day={day}
                    month={index === 0 || day === '1' ? month : undefined}
                    position={d.position}
                    icon={icon}
                    word={word}
                    pressed={d.id === dose?.id}
                    isToday={isToday}
                    ariaLabel={`Tablet ${d.position}, ${weekday} ${d.localDate} at ${doseTime(d)}, ${kind}, ${statusLabel(d, eventOf(d))}${isToday ? ', today' : ''}. Record or correct.`}
                    onPress={() => chooseDose(d)}
                  />
                </li>
              );
            })}
          </ol>
        </div>
        <ul className="app-legend" aria-label="Status key">
          <li><Icon name="taken" size="small" /> Taken</li>
          <li><Icon name="missed" size="small" /> Confirmed missed</li>
          <li><Icon name="unsure" size="small" /> Unsure</li>
          <li><Icon name="no-entry" size="small" /> No entry (unknown, not missed)</li>
        </ul>
      </Stack>
    </Card>
  );

  return (
    <>
      {repairing && <Repair state={state} onState={onState} onClose={closeRepair} />}
      {view === 'today' ? (
        <div hidden={repairing} className="app-home">
          <nav className="app-strip" aria-label="Days around today">
            {strip.map(d => {
              const { weekday, day } = dayParts(d.localDate);
              const { word, icon } = shortStatus(eventOf(d));
              const isToday = d.localDate === localDateIn(now, d.timeZone);
              return (
                <DayChip
                  key={d.id}
                  weekday={weekday}
                  day={day}
                  icon={icon}
                  word={word}
                  pressed={d.id === dose?.id}
                  isToday={isToday}
                  ariaLabel={`Tablet ${d.position}, ${weekday} ${d.localDate}${isToday ? ', today' : ''}: ${word}`}
                  onPress={() => chooseDose(d)}
                />
              );
            })}
          </nav>
          {messages}
          <div className="app-grid">
            {hero}
            <div className="app-side">
              {reviewCard}
              {!selectedId && target.alternatives.length > 0 && (
                <Card title="Another tablet also has no entry">
                  <Stack direction="row" wrap space="related">
                    {target.alternatives.map(d => (
                      <Button key={d.id} label={`Tablet ${d.position}, ${d.localDate}`} variant="secondary" onPress={() => setSelectedId(d.id)} />
                    ))}
                  </Stack>
                </Card>
              )}
            </div>
          </div>
          <Guidance state={state} />
        </div>
      ) : (
        <div hidden={repairing} className="app-home">
          {messages}
          <div className="app-split">
            <div className="app-split-main">{pack}</div>
            <div className="app-split-side">
              {hero}
              {reviewCard}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
