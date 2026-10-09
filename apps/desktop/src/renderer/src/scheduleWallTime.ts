import { toZonedIso, utcOffsetMinutes } from '@petal/domain';

export type WallTimeResult =
  | { ok: true; iso: string }
  | { ok: false; reason: 'invalid' | 'skipped' | 'ambiguous' };

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/** Converts a `datetime-local` value (YYYY-MM-DDTHH:mm, seconds ignored) to an ISO timestamp in the schedule's zone, never the
    device's (DEC8). Unlike scheduling, a remembered time is never guessed across a clock change: a time that the zone skipped,
    or that occurred twice, is refused so the user can pick another time or leave it unknown. */
export function scheduleWallTime(value: string, timeZone: string): WallTimeResult {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/.exec(value);
  if (!match) return { ok: false, reason: 'invalid' };
  const [y, mo, d, h, mi] = match.slice(1).map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  if (Number.isNaN(guess) || new Date(guess).getUTCDate() !== d || h > 23 || mi > 59) return { ok: false, reason: 'invalid' };
  const wanted = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}`;
  // Offsets in force a day either side cover any single transition; keep every candidate that reads back as the wall time.
  const offsets = new Set([utcOffsetMinutes(new Date(guess - MS_PER_DAY), timeZone), utcOffsetMinutes(new Date(guess + MS_PER_DAY), timeZone)]);
  const valid = [...new Set([...offsets].map(offset => guess - offset * MS_PER_MINUTE))]
    .filter(instant => toZonedIso(new Date(instant), timeZone).slice(0, 16) === wanted);
  if (valid.length === 0) return { ok: false, reason: 'skipped' };
  if (valid.length > 1) return { ok: false, reason: 'ambiguous' };
  return { ok: true, iso: toZonedIso(new Date(valid[0]), timeZone) };
}
