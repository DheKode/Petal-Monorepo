import {
  applyIntake, DomainValidationError, IdSchema, IntakeStatusSchema, TimePrecisionSchema, TimestampSchema, toZonedIso,
  type IntakeEvent,
} from '@petal/domain';
import { deriveFromSetupInput } from '../shared/setup';
import type { IntakeOutcome, PetalState, RecordIntakeInput, Result, SetupInput } from '../shared/ipc';
import { SetupExistsError, type PetalStore } from './store';

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });
const ok = <T>(value: T): Result<T> => ({ ok: true, value });

/** Domain validation messages are fixed strings without record contents; anything else is reported generically. */
function messageOf(error: unknown): string {
  if (error instanceof SetupExistsError) return 'Setup already exists. Changing it needs a confirmation step that is not built yet.';
  if (error instanceof DomainValidationError) return error.issues.map(issue => issue.message).join('; ') || error.message;
  return 'Something went wrong. Your records were not changed.';
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

  recordIntake(input: RecordIntakeInput): Promise<Result<IntakeOutcome>> {
    return this.exclusive(async () => {
      try {
        const status = IntakeStatusSchema.safeParse(input?.status);
        const doseId = IdSchema.safeParse(input?.doseId);
        const actualAt = TimestampSchema.nullable().optional().safeParse(input?.actualAt);
        const precision = TimePrecisionSchema.optional().safeParse(input?.timePrecision);
        if (!status.success || !doseId.success || !actualAt.success || !precision.success) return fail('Invalid intake entry.');
        const state = await this.store.load();
        const dose = state.doses.find(d => d.id === doseId.data);
        if (!dose) return fail('That tablet is not part of the current pack.');
        const existing = state.events.find(e => e.doseId === dose.id);
        const { event, change } = applyIntake(dose, existing, { status: status.data, actualAt: actualAt.data, timePrecision: precision.data }, this.now());
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
}
