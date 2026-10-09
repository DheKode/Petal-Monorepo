import { useEffect, useMemo, useRef, useState } from 'react';
import { localDateIn, type BleedingEntry } from '@petal/domain';
import { bleedingOn } from './calendarView';
import { JournalCalendar } from './JournalCalendar';
import type { PetalState } from '../../shared/ipc';
import { CATEGORY_LABEL, INTENSITY_LABEL, dateRangeLabel, entrySummary, intensityLabel, sortJournal } from './journalView';

interface Draft {
  /** Present when editing an existing entry. */
  id?: string;
  startDate: string;
  endDate: string;
  category: BleedingEntry['category'];
  intensity: '' | NonNullable<BleedingEntry['intensity']>;
  note: string;
}

const blank = (): Draft => ({ startDate: '', endDate: '', category: 'bleeding', intensity: '', note: '' });
const draftOf = (entry: BleedingEntry): Draft => ({
  id: entry.id, startDate: entry.startDate, endDate: entry.endDate ?? '', category: entry.category, intensity: entry.intensity ?? '', note: entry.note ?? '',
});

// Functional markup only; visual design belongs to the designer (#11).
export function Journal({ state, onState }: { state: PetalState; onState: (state: PetalState) => void }) {
  const [selectedDate, setSelectedDate] = useState(() => localDateIn(new Date(), state.settings?.timeZone ?? 'UTC'));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<BleedingEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formHeading = useRef<HTMLHeadingElement>(null);
  const entries = useMemo(() => sortJournal(state.bleeding), [state.bleeding]);
  const selectedEntries = bleedingOn(entries, selectedDate);
  const today = localDateIn(new Date(), state.settings?.timeZone ?? 'UTC');

  useEffect(() => {
    if (draft) formHeading.current?.focus();
  }, [draft?.id, draft === null]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    setError(null);
    const result = await window.petal.saveBleeding({
      id: draft.id,
      startDate: draft.startDate,
      endDate: draft.endDate || null,
      category: draft.category,
      intensity: draft.intensity || null,
      note: draft.note,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onState(result.value);
    setMessage(draft.id ? 'Entry changed.' : 'Entry added.');
    setDraft(null);
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError(null);
    const result = await window.petal.deleteBleeding(deleting.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onState(result.value);
    setMessage('Entry deleted.');
    setDeleting(null);
  }

  return (
    <section aria-labelledby="journal-heading">
      <h2 id="journal-heading">Calendar</h2>
      <p>
        Keep your own record of bleeding and spotting. Petal does not diagnose, predict or interpret these entries, and they are not linked to your tablets.
      </p>
      <JournalCalendar state={state} selectedDate={selectedDate} onSelect={setSelectedDate} />
      {message && <p role="status">{message}</p>}
      {error && !draft && <p role="alert">{error}</p>}

      {draft ? (
        <form onSubmit={save}>
          <h3 ref={formHeading} tabIndex={-1}>{draft.id ? 'Change this entry' : 'Add an entry'}</h3>
          <p>
            <label>First day <input type="date" value={draft.startDate} max={today} onChange={e => setDraft({ ...draft, startDate: e.target.value })} required /></label>
          </p>
          <p>
            <label>Last day (leave empty if you are not sure or it is still going) <input type="date" value={draft.endDate} min={draft.startDate || undefined} max={today} onChange={e => setDraft({ ...draft, endDate: e.target.value })} /></label>
          </p>
          <fieldset>
            <legend>Type</legend>
            {(Object.keys(CATEGORY_LABEL) as BleedingEntry['category'][]).map(category => (
              <label key={category}>
                <input type="radio" name="bleeding-category" checked={draft.category === category} onChange={() => setDraft({ ...draft, category })} /> {CATEGORY_LABEL[category]}{' '}
              </label>
            ))}
          </fieldset>
          <p>
            <label>
              How heavy (optional){' '}
              <select value={draft.intensity} onChange={e => setDraft({ ...draft, intensity: e.target.value as Draft['intensity'] })}>
                <option value="">Not recorded</option>
                {(Object.keys(INTENSITY_LABEL) as NonNullable<BleedingEntry['intensity']>[]).map(level => <option key={level} value={level}>{INTENSITY_LABEL[level]}</option>)}
              </select>
            </label>
          </p>
          <p>
            <label>Note (optional) <textarea value={draft.note} maxLength={4000} rows={3} onChange={e => setDraft({ ...draft, note: e.target.value })} /></label>
          </p>
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save entry'}</button>{' '}
          <button type="button" onClick={() => { setDraft(null); setError(null); }} disabled={busy}>Cancel</button>
        </form>
      ) : (
        <p><button type="button" disabled={selectedDate > today} onClick={() => { setDraft({ ...blank(), startDate: selectedDate }); setMessage(null); setError(null); }}>Log bleeding or spotting</button></p>
      )}

      {deleting && (
        <div role="alertdialog" aria-labelledby="journal-delete-heading">
          <h3 id="journal-delete-heading">Delete this entry?</h3>
          <p>{entrySummary(deleting)}. It will be removed from your journal. The deleted values stay in your local change history.</p>
          <button type="button" onClick={remove} disabled={busy}>Delete entry</button>{' '}
          <button type="button" onClick={() => setDeleting(null)} disabled={busy}>Keep it</button>
        </div>
      )}

      <h3>Bleeding and spotting on {selectedDate}</h3>
      {selectedEntries.length === 0 ? (
        <p>No bleeding or spotting recorded for this date.</p>
      ) : (
        <table>
          <caption>Recorded entries for the selected date</caption>
          <thead>
            <tr>
              <th scope="col">Dates</th>
              <th scope="col">Type</th>
              <th scope="col">How heavy</th>
              <th scope="col">Note</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {selectedEntries.map(entry => (
              <tr key={entry.id}>
                <th scope="row">{dateRangeLabel(entry)}</th>
                <td>{CATEGORY_LABEL[entry.category]}</td>
                <td>{intensityLabel(entry)}</td>
                <td>{entry.note ?? ''}</td>
                <td>
                  <button type="button" onClick={() => { setDraft(draftOf(entry)); setMessage(null); setError(null); }} aria-label={`Change entry: ${entrySummary(entry)}`}>Change</button>{' '}
                  <button type="button" onClick={() => { setDeleting(entry); setMessage(null); setError(null); }} aria-label={`Delete entry: ${entrySummary(entry)}`}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
