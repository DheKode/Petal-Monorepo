import {
  IdSchema, LocalDateSchema, TimeZoneSchema, SettingsSchema, PillProfileSchema, ScheduledDoseSchema, IntakeEventSchema,
  type PillProfile, type Pack, type ScheduledDose, type IntakeEvent, type IntakeState,
} from './schemas.js';
import { DomainValidationError } from './backup.js';
import { getIntakeState } from './guidance.js';

/* Non-clinical schedule derivation and intake helpers (TASKS.md D02-D04, DEC7, DEC8). Pure functions: no storage, UI,
   network or clock access; callers pass `now`. No late/missed thresholds or clinical actions live here. */

type TimePrecision = IntakeEvent['timePrecision'];
type RecordOrigin = IntakeEvent['origin'];

export const SCHEDULE_VERSION = 'schedule-v1';
export const PACK_LENGTH = 28;

function invalid(path: string, message: string): never {
  throw new DomainValidationError([{ path, message }]);
}

// --- Time zone arithmetic (IANA zones, DST-aware, no external dependency) ---

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

function zoneFields(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const n = (type: string) => Number(parts.find(p => p.type === type)?.value);
  return { year: n('year'), month: n('month'), day: n('day'), hour: n('hour') % 24, minute: n('minute'), second: n('second') };
}

/** UTC offset of `timeZone` at the instant `date`, in minutes (east of UTC positive). */
export function utcOffsetMinutes(date: Date, timeZone: string): number {
  const f = zoneFields(date, timeZone);
  const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / MS_PER_MINUTE);
}

const two = (value: number) => String(value).padStart(2, '0');

/** ISO 8601 timestamp with an explicit offset, expressed in `timeZone` (seconds precision). */
export function toZonedIso(date: Date, timeZone: string): string {
  const f = zoneFields(date, timeZone);
  const offset = utcOffsetMinutes(date, timeZone);
  const sign = offset < 0 ? '-' : '+';
  const abs = Math.abs(offset);
  return `${f.year}-${two(f.month)}-${two(f.day)}T${two(f.hour)}:${two(f.minute)}:${two(f.second)}${sign}${two(Math.floor(abs / 60))}:${two(abs % 60)}`;
}

/** Local calendar date (YYYY-MM-DD) of an instant in `timeZone`. */
export function localDateIn(date: Date, timeZone: string): string {
  const f = zoneFields(date, timeZone);
  return `${f.year}-${two(f.month)}-${two(f.day)}`;
}

/** Add whole calendar days to a local date; independent of any time zone. */
export function addDays(localDate: string, days: number): string {
  const [y, m, d] = localDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Instant at which the wall clock in `timeZone` reads `localDate` `hhmm`. Candidates come from the UTC offsets in force a
    day before and after; those that reproduce the requested wall time are valid. An ambiguous time (clocks go back) resolves
    to its first occurrence; a skipped time (clocks go forward) resolves to the first moment after the gap. */
function zonedWallTime(localDate: string, hhmm: string, timeZone: string): Date {
  const [y, m, d] = localDate.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const offsets = new Set([utcOffsetMinutes(new Date(guess - MS_PER_DAY), timeZone), utcOffsetMinutes(new Date(guess + MS_PER_DAY), timeZone)]);
  const candidates = [...offsets].map(offset => guess - offset * MS_PER_MINUTE).sort((p, q) => p - q);
  const valid = candidates.filter(instant => {
    const f = zoneFields(new Date(instant), timeZone);
    return f.year === y && f.month === m && f.day === d && f.hour === h && f.minute === mi;
  });
  return new Date(valid.length ? valid[0] : candidates[candidates.length - 1]);
}

// --- D02: schedule derivation ---

export interface ScheduleSetup {
  packId: string;
  profile: PillProfile;
  /** Usual intake time, 24-hour HH:mm in `timeZone`. */
  usualTime: string;
  /** IANA zone the schedule is anchored to (DEC8: it does not move when the device zone changes). */
  timeZone: string;
  /** Local date on which tablet 1 is (or was) scheduled. For mid-pack setup use `startDateFromPosition`. */
  startDate: string;
}

export interface DerivedSchedule {
  pack: Pack;
  doses: ScheduledDose[];
}

/** Mid-pack setup: the user says "tablet `position` is scheduled on `date`"; returns the date of tablet 1. */
export function startDateFromPosition(input: { position: number; date: string }): string {
  if (!Number.isInteger(input.position) || input.position < 1 || input.position > PACK_LENGTH) invalid('position', 'Tablet position must be 1-28');
  if (!LocalDateSchema.safeParse(input.date).success) invalid('date', 'Invalid calendar date');
  return addDays(input.date, -(input.position - 1));
}

/** Start date of the pack that follows one starting on `startDate` (no delayed-start handling: that is a clinical flag). */
export function nextPackStartDate(startDate: string): string {
  if (!LocalDateSchema.safeParse(startDate).success) invalid('startDate', 'Invalid calendar date');
  return addDays(startDate, PACK_LENGTH);
}

/** Derive the pack and its 28 scheduled doses. Dose IDs are deterministic (`<packId>:<position>`) so re-deriving the
    same setup yields the same identities. Doses before a mid-pack position stay history-unknown: no events are created. */
export function deriveSchedule(setup: ScheduleSetup): DerivedSchedule {
  if (!IdSchema.safeParse(setup.packId).success) invalid('packId', 'Invalid pack ID');
  if (!SettingsSchema.shape.usualTime.safeParse(setup.usualTime).success) invalid('usualTime', 'Usual time must be HH:mm');
  if (!TimeZoneSchema.safeParse(setup.timeZone).success) invalid('timeZone', 'Unsupported IANA time zone');
  if (!LocalDateSchema.safeParse(setup.startDate).success) invalid('startDate', 'Invalid calendar date');
  const profile = PillProfileSchema.safeParse(setup.profile);
  if (!profile.success) invalid('profile', 'Invalid pill profile');
  const tabletMap = profile.data.tabletMap;
  const pack: Pack = {
    id: setup.packId, profileId: profile.data.id, startDate: setup.startDate, scheduleVersion: SCHEDULE_VERSION, transitionState: 'current',
  };
  const doses = Array.from({ length: PACK_LENGTH }, (_, index): ScheduledDose => {
    const position = index + 1;
    const localDate = addDays(setup.startDate, index);
    const dose = {
      id: `${setup.packId}:${position}`,
      packId: setup.packId,
      position,
      tabletKind: tabletMap.find(t => t.position === position)!.kind,
      scheduledAt: toZonedIso(zonedWallTime(localDate, setup.usualTime, setup.timeZone), setup.timeZone),
      localDate,
      timeZone: setup.timeZone,
    };
    const parsed = ScheduledDoseSchema.safeParse(dose);
    if (!parsed.success) invalid(`doses.${position}`, 'Derived dose failed validation (time may fall on a skipped local date)');
    return parsed.data;
  });
  return { pack, doses };
}

// --- D03/D04: intake events ---

export interface IntakeInput {
  status: IntakeEvent['status'];
  /** Required for known times. Omit for "taken, time unknown", "confirmed missed" and "unsure". */
  actualAt?: string | null;
  /** Defaults to `exact` when `actualAt` is given for a taken dose, otherwise `unknown`. Approximate stays approximate. */
  timePrecision?: TimePrecision;
  origin?: RecordOrigin;
}

export type IntakeChange = 'created' | 'corrected' | 'unchanged';

/** Identity of the one current intake event for a dose. Deterministic, so a dose can never hold two current events. */
export function intakeEventId(doseId: string): string {
  return `intake:${doseId}`;
}

const FUTURE_TOLERANCE_MS = 5 * MS_PER_MINUTE;

/** Create or correct the single current event for `dose`. Repeating an identical entry is a no-op (`unchanged`), which
    prevents accidental duplicate confirmation. Corrections keep the event ID and creation time; the storage layer is
    responsible for appending the audit entry from the prior and new snapshots. */
export function applyIntake(dose: ScheduledDose, existing: IntakeEvent | undefined, input: IntakeInput, now: Date): { event: IntakeEvent; change: IntakeChange } {
  if (existing && existing.doseId !== dose.id) invalid('existing', 'Existing event belongs to a different dose');
  const actualAt = input.actualAt ?? null;
  const timePrecision = input.timePrecision ?? (input.status === 'taken' && actualAt !== null ? 'exact' : 'unknown');
  if (actualAt !== null && Date.parse(actualAt) > now.getTime() + FUTURE_TOLERANCE_MS) invalid('actualAt', 'Intake time cannot be in the future');
  const nowIso = toZonedIso(now, dose.timeZone);
  const candidate = {
    id: intakeEventId(dose.id),
    doseId: dose.id,
    status: input.status,
    actualAt,
    timePrecision,
    timeZone: existing?.timeZone ?? dose.timeZone,
    origin: input.origin ?? 'manual',
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
  const parsed = IntakeEventSchema.safeParse(candidate);
  if (!parsed.success) invalid('intake', parsed.error.issues[0]?.message ?? 'Invalid intake record');
  if (!existing) return { event: parsed.data, change: 'created' };
  const same = existing.status === parsed.data.status
    && existing.timePrecision === parsed.data.timePrecision
    && (existing.actualAt === null ? parsed.data.actualAt === null : parsed.data.actualAt !== null && Date.parse(existing.actualAt) === Date.parse(parsed.data.actualAt));
  return same ? { event: existing, change: 'unchanged' } : { event: parsed.data, change: 'corrected' };
}

// --- Unresolved history and DEC7 ("Taken now" target) ---

const eventsByDose = (events: readonly IntakeEvent[]) => {
  const map = new Map<string, IntakeEvent[]>();
  for (const event of events) map.set(event.doseId, [...(map.get(event.doseId) ?? []), event]);
  return map;
};

const stateOf = (dose: ScheduledDose, map: Map<string, IntakeEvent[]>): IntakeState => getIntakeState(dose.id, map.get(dose.id) ?? []);

/** Doses already due at `now` whose history is still unknown (no entry) or unsure, oldest first. Confirmed missed and
    taken doses are resolved. */
export function listUnresolvedDoses(doses: readonly ScheduledDose[], events: readonly IntakeEvent[], now: Date): ScheduledDose[] {
  const map = eventsByDose(events);
  return doses
    .filter(d => Date.parse(d.scheduledAt) <= now.getTime() && ['no-entry', 'unsure'].includes(stateOf(d, map)))
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
}

export interface TakenNowTarget {
  /** Dose the "Taken now" button applies to, or null when nothing recent is awaiting an entry. The UI must show it. */
  dose: ScheduledDose | null;
  reason: 'todays-dose' | 'earliest-recent-unresolved' | 'none-due';
  /** Other recent unresolved doses the user may pick instead. */
  alternatives: ScheduledDose[];
  /** Unresolved doses older than the lookback window: surfaced as unresolved history, never auto-picked. */
  olderUnresolved: ScheduledDose[];
  /** Next dose that is not yet due and has no entry, for an explicit "taken early" flow. */
  nextUpcoming: ScheduledDose | null;
}

/** Choose the dose "Taken now" applies to. Refines DEC7: prefer the dose scheduled for today (in its own zone) if it is
    due and unresolved; otherwise the earliest unresolved dose inside the lookback window (default 36 h). Older gaps, such
    as the unknown history before a mid-pack start, are reported separately and never chosen automatically. */
export function selectTakenNowTarget(doses: readonly ScheduledDose[], events: readonly IntakeEvent[], now: Date, options: { lookbackHours?: number } = {}): TakenNowTarget {
  const lookbackMs = (options.lookbackHours ?? 36) * 60 * MS_PER_MINUTE;
  const unresolved = listUnresolvedDoses(doses, events, now);
  const recent = unresolved.filter(d => Date.parse(d.scheduledAt) > now.getTime() - lookbackMs);
  const olderUnresolved = unresolved.filter(d => !recent.includes(d));
  const map = eventsByDose(events);
  const nextUpcoming = [...doses]
    .filter(d => Date.parse(d.scheduledAt) > now.getTime() && stateOf(d, map) === 'no-entry')
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt))[0] ?? null;
  const today = recent.find(d => d.localDate === localDateIn(now, d.timeZone));
  const dose = today ?? recent[0] ?? null;
  return {
    dose,
    reason: today ? 'todays-dose' : dose ? 'earliest-recent-unresolved' : 'none-due',
    alternatives: recent.filter(d => d !== dose),
    olderUnresolved,
    nextUpcoming,
  };
}

// --- DEC8: time zone changes ---

/** Compare the schedule's zone with the device zone. The schedule never moves automatically; the UI only informs. */
export function compareZones(scheduleZone: string, deviceZone: string, now: Date): 'same' | 'equivalent-offset' | 'different' {
  if (scheduleZone === deviceZone) return 'same';
  return utcOffsetMinutes(now, scheduleZone) === utcOffsetMinutes(now, deviceZone) ? 'equivalent-offset' : 'different';
}
