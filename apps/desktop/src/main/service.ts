import {
  applyIntake, DomainValidationError, IdSchema, IntakeStatusSchema, TimePrecisionSchema, TimestampSchema, toZonedIso,
  type IntakeEvent,
} from '@petal/domain';
import { deriveFromSetupInput } from '../shared/setup';
import {
  MAX_BATCH, type BatchOutcome, type ImportOutcome, type ImportPreview, type IntakeOutcome, type PetalState,
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

interface UndoEntry {
  /** The record as it was before the correction. */
  previous: IntakeEvent;
  /** `updatedAt` of the correction that replaced it. A restore must not be dated earlier than this. */
  correctedAt: string;
}

/** Applies the shared domain rules to renderer requests. The renderer is never trusted: setup is re-derived and intake
    input is re-validated here, and every change goes through `applyIntake`. Operations run one at a time, so a double
    click or overlapping requests cannot race each other into a stale-revision failure. */
export class PetalService {
  /** Each dose's record before its most recent correction in this session, for undo. New entries are not stored here. */
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
        // Undo bookkeeping changes only after the write succeeded. Only corrections can be undone: the storage adapter
        // cannot remove a newly created event (#37).
        if (existing) this.undo.set(dose.id, { previous: existing, correctedAt: event.updatedAt });
        else this.undo.delete(dose.id);
        return ok({ state: saved, change, undoable: existing !== undefined });
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
        // Restoring is itself a correction: the earlier values with a new update time, so the audit trail keeps both
        // changes. The time is never earlier than the correction being undone, even if the system clock moved back.
        const at = new Date(Math.max(this.now().getTime(), Date.parse(entry.correctedAt)));
        const state = await this.store.putIntakeEvent({ ...entry.previous, updatedAt: toZonedIso(at, entry.previous.timeZone) });
        this.undo.delete(doseId);
        return ok(state);
      } catch (error) {
        return fail(messageOf(error));
      }
    });
  }

  /** The file text for a full backup. The main process writes it where the user chose; the renderer never sees a path. */
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
