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

/** One tablet in the pack calendar: the date, which tablet it is, and its status as an icon plus a word. */
export function PackCell({ day, month, position, ...p }: Shared & { day: string; month?: string; position: number }) {
  const play = useIconPlay();
  return (
    <button
      type="button"
      className="app-cell"
      data-status={p.icon}
      aria-pressed={p.pressed}
      aria-current={p.isToday ? 'date' : undefined}
      aria-label={p.ariaLabel}
      onClick={() => { play.icon.current?.startAnimation(); p.onPress(); }}
      {...play.handlers}
    >
      <span className="app-cell-day">{day}{month && <span className="app-cell-month">{month}</span>}</span>
      <span className="app-cell-tablet">#{position}{p.isToday && <strong className="app-cell-today"> Today</strong>}</span>
      <span className="app-cell-status"><Icon ref={play.icon} name={p.icon} size="small" /><span>{p.word}</span></span>
    </button>
  );
}
