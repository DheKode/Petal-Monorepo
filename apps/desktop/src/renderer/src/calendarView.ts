import type { BleedingEntry } from '@petal/domain';

/** UTC arithmetic avoids device-zone/DST shifts in date-only calendar cells. */
export function monthCells(month: string): (string | null)[] {
  const [year, number] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year!, number! - 1, 1));
  const count = new Date(Date.UTC(year!, number!, 0)).getUTCDate();
  const cells: (string | null)[] = Array(first.getUTCDay()).fill(null);
  for (let day = 1; day <= count; day++) cells.push(`${month}-${String(day).padStart(2, '0')}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function shiftMonth(month: string, offset: number): string {
  const [year, number] = month.split('-').map(Number);
  return new Date(Date.UTC(year!, number! - 1 + offset, 1)).toISOString().slice(0, 7);
}

/** An unknown end never invents additional bleeding days. */
export function bleedingOn(entries: readonly BleedingEntry[], date: string): BleedingEntry[] {
  return entries.filter(entry => entry.startDate <= date && (entry.endDate ?? entry.startDate) >= date);
}
