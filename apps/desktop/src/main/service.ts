import { randomUUID } from 'node:crypto';
import {
  applyIntake, BleedingEntrySchema, deriveSchedule, DomainValidationError, IdSchema, IntakeStatusSchema, localDateIn, SettingsSchema, TimePrecisionSchema, TimestampSchema, toZonedIso,
  type BleedingEntry, type IntakeEvent,
} from '@petal/domain';
import { deriveFromSetupInput } from '../shared/setup';
import {
  MAX_BATCH, type BatchOutcome, type BleedingInput, type ImportOutcome, type ImportPreview, type IntakeOutcome, type PetalState,
  type RecordIntakeInput, type Result, type SetupInput,
} from '../shared/ipc';
import { SetupExistsError, type PetalStore } from './store';

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });
const ok = <T>(value: T): Result<T> => ({ ok: true, value });

/** Domain validation messages are fixed strings without record contents; anything else is reported generically. */
function messageOf(error: unknown): string {
  if (error instanceof SetupExistsError) return 'Setup already exists. Changing it needs a confirmation step that is not built yet.';
  if (error instanceof DomainValidationError) return error.issues.map(issue => issue.message).join('; ') || error.message;
  return 'Something went wrong. Your records were not changed.';
}

/** Import failures say what went wrong in general terms only: never the file's contents or paths inside it. */
function importMessageOf(error: unknown): string {
  if (error instanceof DomainValidationError) {
    return error.issues.some(i => i.message === 'Backup exceeds size limit')
      ? 'That file is too large to be a Petal backup. Your records were not changed.'
      : 'That file is not a valid Petal backup, or it comes from an incompatible version. Your records were not changed.';
  }
  if (error instanceof SyntaxError) return 'That file is not a valid Petal backup. Your records were not changed.';
  const code = (error as { code?: unknown } | null)?.code;
  if (code === 'stale-preview') return 'Your records changed after this preview was made. Pick the file again. Nothing was replaced.';
  if (code === 'invalid-preview') return 'This preview has expired. Pick the file again. Nothing was replaced.';
  return 'The import did not finish. Your records were not changed.';
}

/** Plain-language reason for a bleeding entry that failed validation. Never repeats what the user typed. */
function bleedingProblem(field: unknown): string {
  switch (field) {
    case 'startDate': return 'Enter a valid start date.';
    case 'endDate': return 'Enter a valid end date, on or after the start date.';
    case 'category': return 'Choose bleeding or spotting.';
    case 'intensity': return 'Choose light, moderate or heavy, or leave it unset.';
    case 'note': return 'The note is too long (4000 characters at most).';
    default: return 'This entry cannot be saved.';
  }
}

const sameBleeding = (a: BleedingEntry, b: BleedingEntry) =>
  a.id === b.id && a.startDate === b.startDate && a.endDate === b.endDate && a.category === b.category && a.intensity === b.intensity && a.note === b.note;

interface UndoEntry {
  /** The record as it was before the change, or `null` when the change created it (undo then removes it). */
  previous: IntakeEvent | null;
  /** `updatedAt` of the change being undone. A restore must not be dated earlier than this. */
  correctedAt: string;
}

/** Applies the shared domain rules to renderer requests. The renderer is never trusted: setup is re-derived and intake
    input is re-validated here, and every change goes through `applyIntake`. Operations run one at a time, so a double
    click or overlapping requests cannot race each other into a stale-revision failure. */
export class PetalService {
  /** Each dose's record before its most recent single change in this session, for undo. Batch saves are not undoable. */
  private readonly undo = new Map<string, UndoEntry>();
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly store: PetalStore, private readonly now: () => Date = () => new Date()) {}

  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const run = this.queue.then(work, work);
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Resolves when every request accepted so far has finished. The main process waits for this before closing storage. */
  idle(): Promise<void> {
    return this.queue.then(() => undefined);
  }

  getState(): Promise<PetalState> {
    return this.exclusive(() => this.store.load());
  }

  saveSetup(input: SetupInput): Promise<Result<PetalState>> {
    return this.exclusive(async () => {
      try {
        if ((await this.store.load()).pack) throw new SetupExistsError();
        const { profile, settings, pack, doses } = deriveFromSetupInput(input);
        const state = await this.store.saveSetup({ profile, settings, pack, doses });
        this.undo.clear();
        return ok(state);
      } catch (error) {
        return fail(messageOf(error));
      }
    });
  }

  /** Validate one renderer entry. Returns `null` when any field is malformed. */
  private parseEntry(input: RecordIntakeInput) {
    const status = IntakeStatusSchema.safeParse(input?.status);
    const doseId = IdSchema.safeParse(input?.doseId);
    const actualAt = TimestampSchema.nullable().optional().safeParse(input?.actualAt);
    const precision = TimePrecisionSchema.optional().safeParse(input?.timePrecision);
    if (!status.success || !doseId.success || !actualAt.success || !precision.success) return null;
    return { doseId: doseId.data, intake: { status: status.data, actualAt: actualAt.data, timePrecision: precision.data } };
  }

  recordIntake(input: RecordIntakeInput): Promise<Result<IntakeOutcome>> {
    return this.exclusive(async () => {
      try {
        const entry = this.parseEntry(input);
        if (!entry) return fail('Invalid intake entry.');
        const state = await this.store.load();
        const dose = state.doses.find(d => d.id === entry.doseId);
        if (!dose) return fail('That tablet is not part of the current pack.');
        const existing = state.events.find(e => e.doseId === dose.id);
        const { event, change } = applyIntake(dose, existing, entry.intake, this.now());
        if (change === 'unchanged') return ok({ state, change, undoable: false });
        const saved = await this.store.putIntakeEvent(event);
        // Undo bookkeeping changes only after the write succeeded.
        this.undo.set(dose.id, { previous: existing ?? null, correctedAt: event.updatedAt });
        return ok({ state: saved, change, undoable: true });
      } catch (error) {
        return fail(messageOf(error));
      }
    });
  }

  /** Save several entries the user has already reviewed and confirmed (history repair). Every entry is validated and planned
      against the current records first, and nothing is written unless all of them are valid. A storage failure part-way
      reports how many were saved; the screen then reloads the records. Batch entries are not offered an Undo. */
  recordIntakeBatch(inputs: RecordIntakeInput[]): Promise<Result<BatchOutcome>> {
    return this.exclusive(async () => {
      try {
        if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > MAX_BATCH) return fail('Invalid set of entries.');
        const state = await this.store.load();
        const now = this.now();
        const seen = new Set<string>();
        const planned: IntakeEvent[] = [];
        let unchanged = 0;
        for (const input of inputs) {
          const entry = this.parseEntry(input);
          if (!entry) return fail('Invalid intake entry.');
          if (seen.has(entry.doseId)) return fail('A tablet appears more than once in this set of entries.');
          seen.add(entry.doseId);
          const dose = state.doses.find(d => d.id === entry.doseId);
          if (!dose) return fail('That tablet is not part of the current pack.');
          const { event, change } = applyIntake(dose, state.events.find(e => e.doseId === dose.id), entry.intake, now);
          if (change === 'unchanged') unchanged += 1;
          else planned.push(event);
        }
        let latest = state;
        let applied = 0;
        for (const event of planned) {
          try {
            latest = await this.store.putIntakeEvent(event);
          } catch {
            return fail(`Saved ${applied} of ${planned.length} changes before a problem stopped it. Open the pack to see what was saved, then try again.`);
          }
          this.undo.delete(event.doseId);
          applied += 1;
        }
        return ok({ state: latest, applied, unchanged });
      } catch (error) {
        return fail(messageOf(error));
      }
    });
  }

  undoIntake(doseId: string): Promise<Result<PetalState>> {
    return this.exclusive(async () => {
      try {
        const entry = this.undo.get(doseId);
        if (!entry) return fail('There is nothing to undo for that tablet.');
        // Undoing a new entry removes it. Undoing a correction restores the earlier values as a new correction with a new
        // update time, so the audit trail keeps both changes. The time is never earlier than the change being undone, even
        // if the system clock moved back.
        const { previous } = entry;
        const at = new Date(Math.max(this.now().getTime(), Date.parse(entry.correctedAt)));
        const state = previous === null
          ? await this.store.removeIntakeEvent(doseId)
          : await this.store.putIntakeEvent({ ...previous, updatedAt: toZonedIso(at, previous.timeZone) });
        this.undo.delete(doseId);
        return ok(state);
      } catch (error) {
        return fail(messageOf(error));
      }
    });
  }

  /** The file text for a full backup. The main process writes it where the user chose; the renderer never sees a path. */
  /** Create or edit a bleeding or spotting entry. The journal is the user's own record: nothing is inferred, predicted or
      linked to tablets, and a date cannot be in the future (in the schedule's own time zone). Saving an entry that did not
      change writes nothing. */
  saveBleeding(input: BleedingInput): Promise<Result<PetalState>> {
    return this.exclusive(async () => {
      try {
        const state = await this.store.load();
        if (!state.pack) return fail('Finish setting up your pack first.');
        const wantsEdit = input?.id !== undefined && input?.id !== null;
        const existing = wantsEdit ? state.bleeding.find(e => e.id === input.id) : undefined;
        if (wantsEdit && !existing) return fail('That entry no longer exists.');
        const note = typeof input?.note === 'string' ? input.note.trim() : '';
        const parsed = BleedingEntrySchema.safeParse({
          id: existing?.id ?? `bleeding-${randomUUID()}`,
          startDate: input?.startDate,
          endDate: input?.endDate || null,
          category: input?.category,
          intensity: input?.intensity ?? null,
          note: note === '' ? null : note,
        });
        if (!parsed.success) return fail(bleedingProblem(parsed.error.issues[0]?.path[0]));
        const entry = parsed.data;
        const today = localDateIn(this.now(), state.settings?.timeZone ?? 'UTC');
        if (entry.startDate > today) return fail('The start date cannot be in the future.');
        if (entry.endDate !== null && entry.endDate > today) return fail('The end date cannot be in the future.');
        if (existing && sameBleeding(existing, entry)) return ok(state);
        return ok(await this.store.putBleedingEntry(entry));
      } catch (error) {
        return fail(messageOf(error));
      }
    });
  }

  /** Change the usual time. It takes effect from tomorrow: only tablets on later dates (in the schedule's own zone) move to the
      new time, so today's tablet, every earlier tablet and every entry keep exactly what they have. No time is rewritten in
      the past. The schedule stays in the zone chosen at setup. */
  changeUsualTime(usualTime: string): Promise<Result<PetalState>> {
    return this.exclusive(async () => {
      try {
        if (!SettingsSchema.shape.usualTime.safeParse(usualTime).success) return fail('Enter the time as hours and minutes, for example 21:00.');
        const state = await this.store.load();
        if (!state.pack || !state.settings || !state.profile) return fail('Finish setting up your pack first.');
        if (state.settings.usualTime === usualTime) return ok(state);
        const derived = deriveSchedule({ packId: state.pack.id, profile: state.profile, usualTime, timeZone: state.settings.timeZone, startDate: state.pack.startDate });
        const today = localDateIn(this.now(), state.settings.timeZone);
        const doses = state.doses.map(dose => (dose.localDate > today ? derived.doses.find(d => d.id === dose.id) ?? dose : dose));
        return ok(await this.store.updateSchedule({ settings: { ...state.settings, usualTime }, doses }));
      } catch (error) {
        return fail(messageOf(error));
      }
    });
  }

  /** Delete a bleeding or spotting entry. The deleted values stay in the local audit trail. */
  deleteBleeding(id: string): Promise<Result<PetalState>> {
    return this.exclusive(async () => {
      try {
        if (!IdSchema.safeParse(id).success) return fail('That entry no longer exists.');
        const state = await this.store.load();
        if (!state.bleeding.some(e => e.id === id)) return fail('That entry no longer exists.');
        return ok(await this.store.removeBleedingEntry(id));
      } catch (error) {
        return fail(messageOf(error));
      }
    });
  }

  exportBackup(): Promise<Result<{ json: string; sensitivityNotice: string }>> {
    return this.exclusive(async () => {
      try {
        return ok(await this.store.exportJson());
      } catch {
        return fail('The backup could not be created. Your records were not changed.');
      }
    });
  }

  /** Validate file text and hold it as a preview. Nothing stored changes. */
  previewImport(json: string): Promise<Result<ImportPreview>> {
    return this.exclusive(async () => {
      try {
        if (typeof json !== 'string') return fail('That file is not a valid Petal backup. Your records were not changed.');
        return ok(await this.store.previewImport(json));
      } catch (error) {
        return fail(importMessageOf(error));
      }
    });
  }

  confirmImport(token: string): Promise<Result<ImportOutcome>> {
    return this.exclusive(async () => {
      try {
        if (typeof token !== 'string') return fail('This preview has expired. Pick the file again. Nothing was replaced.');
        const outcome = await this.store.confirmImport(token);
        this.undo.clear(); // Undo entries refer to records that no longer exist.
        return ok(outcome);
      } catch (error) {
        return fail(importMessageOf(error));
      }
    });
  }

  cancelImport(token: string): Promise<Result<null>> {
    return this.exclusive(async () => {
      if (typeof token === 'string') this.store.cancelImport(token);
      return ok(null);
    });
  }
}
