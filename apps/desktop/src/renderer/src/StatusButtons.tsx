import { Icon, type IconName } from '@petal/ui/icons';
import { useIconPlay } from './useIconPlay';

interface Shared {
  icon: IconName;
  word: string;
  pressed: boolean;
  isToday: boolean;
  ariaLabel: string;
  onPress: () => void;
}

/** One day in the week strip. The status icon animates on hover and focus; the status is always also written as a word. */
export function DayChip({ weekday, day, ...p }: Shared & { weekday: string; day: string }) {
  const play = useIconPlay();
  return (
    <button
      type="button"
      className="app-day"
      aria-pressed={p.pressed}
      aria-current={p.isToday ? 'date' : undefined}
      aria-label={p.ariaLabel}
      onClick={() => { play.icon.current?.startAnimation(); p.onPress(); }}
      {...play.handlers}
    >
      <span className="app-day-weekday">{p.isToday ? 'Today' : weekday}</span>
      <span className="app-day-number">{day}</span>
      <span className="app-day-status"><Icon ref={play.icon} name={p.icon} size="small" /> {p.word}</span>
    </button>
  );
}

/** One tablet in the pack grid. */
export function PackCell({ position, dateText, ...p }: Shared & { position: number; dateText: string }) {
  const play = useIconPlay();
  return (
    <button
      type="button"
      className="app-cell"
      aria-pressed={p.pressed}
      aria-current={p.isToday ? 'date' : undefined}
      aria-label={p.ariaLabel}
      onClick={() => { play.icon.current?.startAnimation(); p.onPress(); }}
      {...play.handlers}
    >
      <span className="app-cell-number">{position}</span>
      <span className="app-cell-date">{dateText}</span>
      <span className="app-cell-status"><Icon ref={play.icon} name={p.icon} size="small" /> {p.word}</span>
      {p.isToday && <span className="app-cell-today">Today</span>}
    </button>
  );
}
