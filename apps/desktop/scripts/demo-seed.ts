// Fictional demo data for a repeatable offline demo (TASKS.md V01).
//   pnpm --filter @petal/desktop demo:seed [--dir <folder>]     create or reset the demo records
//   pnpm --filter @petal/desktop demo                           reset the demo records and start the app on them
// Everything here is invented. The folder defaults to apps/desktop/.demo-data (ignored by Git). The script only ever
// resets a folder it created itself (it leaves a marker file), so it can never overwrite real records.
import { access, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { addDays, applyIntake, localDateIn, type IntakeEvent } from '@petal/domain';
import { PetalService } from '../src/main/service';
import { SqliteStore } from '../src/main/sqliteStore';

const MARKER = '.petal-demo';
const TODAYS_TABLET = 12;

const exists = (path: string) => access(path).then(() => true, () => false);
const weekday = (localDate: string) => new Date(`${localDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });

export interface SeedSummary {
  folder: string;
  timeZone: string;
  today: string;
  uncertain: { position: number; date: string; weekday: string };
  remembered: { position: number; date: string; weekday: string };
}

/** Create (or reset) the demo database in `folder`. `now` and `timeZone` exist so tests can be exact. */
export async function seedDemo(folder: string, options: { now?: Date; timeZone?: string } = {}): Promise<SeedSummary> {
  const now = options.now ?? new Date();
  const timeZone = options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const dir = resolve(folder);

  if (await exists(dir)) {
    const files = await readdir(dir);
    if (files.length > 0 && !files.includes(MARKER)) {
      throw new Error(`Refusing to touch ${dir}: it is not a demo folder created by this script. Pick another --dir.`);
    }
    // SQLite keeps the file locked for a moment after it is closed (Windows), and for as long as the app has it open.
    try {
      await Promise.all(files.filter(f => f.startsWith('petal.db')).map(f => rm(join(dir, f), { force: true, maxRetries: 8, retryDelay: 400 })));
    } catch {
      throw new Error('The demo records are in use. Close Petal and run the demo again.');
    }
  }
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, MARKER), 'Fictional Petal demo data. Created by scripts/demo-seed.ts; safe to delete.\n');

  const today = localDateIn(now, timeZone);
  const startDate = addDays(today, -(TODAYS_TABLET - 1)); // today is tablet 12 of the pack
  const store = await SqliteStore.open(join(dir, 'petal.db'), 'demo');
  try {
    const service = new PetalService(store, () => now);
    const setup = await service.saveSetup({ usualTime: '21:00', timeZone, anchor: { kind: 'first-pack', startDate } });
    if (!setup.ok) throw new Error(`Demo setup failed: ${setup.message}`);

    // History: taken at about the usual time, except a confirmed miss (4), an unsure tablet (6), one tablet with no entry
    // at all (10, the uncertain day) and one remembered only roughly (11, the day after).
    for (const dose of setup.value.doses.filter(d => d.position < TODAYS_TABLET)) {
      const scheduled = new Date(dose.scheduledAt).getTime();
      const minutes = (dose.position * 7) % 40;
      const base = { status: 'taken' as const, actualAt: new Date(scheduled + minutes * 60_000).toISOString() };
      const logged = (offsetMinutes: number) => new Date(Math.min(now.getTime(), scheduled + offsetMinutes * 60_000));
      let event: IntakeEvent | null = null;
      if (dose.position === 10) event = null;
      else if (dose.position === 4) event = applyIntake(dose, undefined, { status: 'confirmed-missed' }, logged(12 * 60)).event;
      else if (dose.position === 6) event = applyIntake(dose, undefined, { status: 'unsure' }, logged(12 * 60)).event;
      else if (dose.position === 11) event = applyIntake(dose, undefined, { ...base, actualAt: new Date(scheduled + 30 * 60_000).toISOString(), timePrecision: 'approximate' }, logged(40)).event;
      else event = applyIntake(dose, undefined, base, logged(minutes + 2)).event;
      if (event) await store.putIntakeEvent(event);
    }

    const journal = await service.saveBleeding({
      startDate: addDays(today, -4), endDate: addDays(today, -3), category: 'spotting', intensity: 'light', note: 'Fictional demo entry',
    });
    if (!journal.ok) throw new Error(`Demo journal entry failed: ${journal.message}`);

    const date = (position: number) => setup.value.doses[position - 1].localDate;
    return {
      folder: dir, timeZone, today,
      uncertain: { position: 10, date: date(10), weekday: weekday(date(10)) },
      remembered: { position: 11, date: date(11), weekday: weekday(date(11)) },
    };
  } finally {
    store.close();
  }
}

if (require.main === module) {
  const at = process.argv.indexOf('--dir');
  const folder = at > -1 && process.argv[at + 1] ? process.argv[at + 1] : '.demo-data';
  seedDemo(folder).then(summary => {
    console.log(`Demo records created in ${summary.folder} (fictional data, time zone ${summary.timeZone}).`);
    console.log(`The uncertain day is tablet ${summary.uncertain.position}, ${summary.uncertain.weekday} ${summary.uncertain.date}: no entry.`);
    console.log(`The remembered day is tablet ${summary.remembered.position}, ${summary.remembered.weekday} ${summary.remembered.date}: taken, about 21:30 (approximate).`);
    console.log('Also: tablet 4 confirmed missed, tablet 6 unsure, one spotting journal entry. Open "Fix my history" to repair it.');
  }).catch(error => {
    console.error(error instanceof Error ? error.message : 'Demo seed failed.');
    process.exit(1);
  });
}
