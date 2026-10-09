import type { BleedingEntry } from '@petal/domain';

/* Display helpers for the bleeding and spotting journal (F10). The journal is the user's own record: nothing here
   predicts, estimates or interprets, and entries are never linked to tablets or adherence. */

export const CATEGORY_LABEL: Record<BleedingEntry['category'], string> = { bleeding: 'Bleeding', spotting: 'Spotting' };

export const INTENSITY_LABEL: Record<NonNullable<BleedingEntry['intensity']>, string> = { light: 'Light', moderate: 'Moderate', heavy: 'Heavy' };

/** Newest first, so the most recent entry is at the top. Ties keep a stable order by id. */
export function sortJournal(entries: readonly BleedingEntry[]): BleedingEntry[] {
  return [...entries].sort((a, b) => b.startDate.localeCompare(a.startDate) || (b.endDate ?? b.startDate).localeCompare(a.endDate ?? a.startDate) || a.id.localeCompare(b.id));
}

/** "2026-10-05", "2026-10-05 to 2026-10-07", or "2026-10-05, no end date recorded". */
export function dateRangeLabel(entry: BleedingEntry): string {
  if (entry.endDate === null) return `${entry.startDate}, no end date recorded`;
  return entry.endDate === entry.startDate ? entry.startDate : `${entry.startDate} to ${entry.endDate}`;
}

export const intensityLabel = (entry: BleedingEntry): string => (entry.intensity ? INTENSITY_LABEL[entry.intensity] : 'Not recorded');

/** Short description used in confirmations, for example "Spotting, 2026-10-05". */
export const entrySummary = (entry: BleedingEntry): string => `${CATEGORY_LABEL[entry.category]}, ${dateRangeLabel(entry)}`;
