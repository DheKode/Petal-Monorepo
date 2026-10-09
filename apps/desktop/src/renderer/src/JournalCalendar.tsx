import { useState } from 'react';
import { localDateIn } from '@petal/domain';
import type { PetalState } from '../../shared/ipc';
import { bleedingOn, monthCells, shiftMonth } from './calendarView';
import { doseLabel, statusLabel } from './format';
import './journalCalendar.css';

const symbols = { taken: '✓', 'confirmed-missed': '×', unsure: '?' };

export function JournalCalendar({ state, selectedDate, onSelect }: {
  state: PetalState; selectedDate: string; onSelect: (date: string) => void;
}) {
  const [month, setMonth] = useState(selectedDate.slice(0, 7));
  const today = localDateIn(new Date(), state.settings?.timeZone ?? 'UTC');
  const events = new Map(state.events.map(event => [event.doseId, event]));
  const heading = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${month}-01T12:00:00Z`));
  const selectedDoses = state.doses.filter(dose => dose.localDate === selectedDate);

  return <div className="journal-calendar">
    <div className="calendar-toolbar">
      <button type="button" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
      <h3 aria-live="polite">{heading}</h3>
      <button type="button" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
      <button type="button" onClick={() => { setMonth(today.slice(0, 7)); onSelect(today); }}>Today</button>
    </div>
    <p className="calendar-legend">Pill: ✓ Taken · × Confirmed missed · ? Unsure · ○ No entry · ◷ Scheduled. B Bleeding · S Spotting.</p>
    <p><small>Pill markers follow the scheduled tablet date. Unknown bleeding end dates mark only the first recorded day.</small></p>
    <div className="calendar-weekdays" aria-hidden="true">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <span key={day}>{day}</span>)}</div>
    <div className="calendar-days" aria-label={heading}>
      {monthCells(month).map((date, index) => {
        if (!date) return <span key={`blank-${index}`} />;
        const doses = state.doses.filter(dose => dose.localDate === date);
        const bleeding = bleedingOn(state.bleeding, date);
        const markers = doses.map(dose => {
          const event = events.get(dose.id);
          return { symbol: event ? symbols[event.status] : date > today ? '◷' : '○', label: event ? statusLabel(dose, event) : date > today ? 'Scheduled' : 'No entry' };
        });
        const categories = [...new Set(bleeding.map(entry => entry.category))];
        return <button type="button" key={date} aria-pressed={selectedDate === date} aria-current={date === today ? 'date' : undefined}
          aria-label={`${date}${date === today ? ', today' : ''}, ${markers.map(marker => marker.label).join(', ') || 'No scheduled tablet'}${categories.length ? ', ' + categories.join(', ') : ''}`}
          onClick={() => onSelect(date)}>
          <span className="calendar-number">{Number(date.slice(8))}</span>
          <span className="calendar-markers" aria-hidden="true">{markers.map((marker, i) => <span key={i}>{marker.symbol}</span>)}{categories.map(category => <span className="calendar-bleeding" key={category}>{category === 'bleeding' ? 'B' : 'S'}</span>)}</span>
        </button>;
      })}
    </div>
    <h3>Pill intake on {selectedDate}</h3>
    {selectedDoses.length ? <ul>{selectedDoses.map(dose => <li key={dose.id}><strong>{doseLabel(dose)}</strong><br />{statusLabel(dose, events.get(dose.id))}</li>)}</ul> : <p>No scheduled tablet for this date.</p>}
    <p><small>Record or correct pill intake in Today’s pack view.</small></p>
  </div>;
}
