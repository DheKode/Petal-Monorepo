import { compareZones } from '@petal/domain';

/** TASKS.md DEC8: the schedule stays in the time zone chosen at setup and never moves by itself. When this computer is in a
    different zone, tell the user once, plainly. Zones that currently have the same offset (for example Asia/Manila and
    Asia/Singapore) are not worth a notice. Returns `null` when there is nothing to say. */
export function zoneNoticeText(scheduleZone: string | null | undefined, deviceZone: string, now: Date): string | null {
  if (!scheduleZone) return null;
  if (compareZones(scheduleZone, deviceZone, now) !== 'different') return null;
  return `Your schedule uses ${scheduleZone}, but this computer is set to ${deviceZone}. Petal keeps your tablet times in ${scheduleZone} and does not move them. Times on these screens are shown in ${scheduleZone}.`;
}
