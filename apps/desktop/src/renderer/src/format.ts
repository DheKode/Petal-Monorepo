import type { IconName } from '@petal/ui/icons';
import { DomainValidationError, toZonedIso, type IntakeEvent, type ScheduledDose } from '@petal/domain';

export const doseTime = (dose: ScheduledDose): string => dose.scheduledAt.slice(11, 16);

export const doseLabel = (dose: ScheduledDose): string => `Tablet ${dose.position}, ${dose.localDate} at ${doseTime(dose)}`;

export function tabletTypeLabel(kind: ScheduledDose['tabletKind']): string {
  if (kind === 'active') return 'Active';
  if (kind === 'non-hormonal') return 'Non-hormonal';
  return 'Not verified';
}

/** Plain-language status. "No entry" is deliberately not "missed": unknown history is never counted as a miss. */
export function statusLabel(dose: ScheduledDose, event: IntakeEvent | undefined): string {
  if (!event) return 'No entry';
  if (event.status === 'confirmed-missed') return 'Confirmed missed';
  if (event.status === 'unsure') return 'Unsure';
  if (event.actualAt === null) return 'Taken (time unknown)';
  const local = toZonedIso(new Date(event.actualAt), dose.timeZone).slice(0, 16).replace('T', ' ');
  return `Taken at ${local}${event.timePrecision === 'approximate' ? ' (approximate)' : ''}`;
}

export function errorText(error: unknown): string {
  if (error instanceof DomainValidationError) return error.issues.map(issue => issue.message).join('; ') || 'Invalid entry.';
  return 'Something went wrong.';
}

/** Short status word for compact views (week strip, pack cells). Always shown as text, never by color alone. */
export function shortStatus(event: IntakeEvent | undefined): { word: string; icon: IconName } {
  if (!event) return { word: 'No entry', icon: 'no-entry' };
  if (event.status === 'confirmed-missed') return { word: 'Missed', icon: 'missed' };
  if (event.status === 'unsure') return { word: 'Unsure', icon: 'unsure' };
  return { word: 'Taken', icon: 'taken' };
}

/** Short weekday and day of month for a local date like 2026-10-09. It is already a local date, so no zone shift applies. */
export function dayParts(localDate: string): { weekday: string; day: string; month: string } {
  const date = new Date(`${localDate}T12:00:00Z`);
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
    day: String(Number(localDate.slice(8, 10))),
    month: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
  };
}
