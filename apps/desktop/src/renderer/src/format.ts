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
