import {
  applyIntake, DomainValidationError, IdSchema, IntakeStatusSchema, TimePrecisionSchema, TimestampSchema, toZonedIso,
  type IntakeEvent,
} from '@petal/domain';
import { deriveFromSetupInput } from '../shared/setup';
import type { IntakeOutcome, PetalState, RecordIntakeInput, Result, SetupInput } from '../shared/ipc';
import type { PetalStore } from './store';

const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });
const ok = <T>(value: T): Result<T> => ({ ok: true, value });

/** Domain validation messages are fixed strings without record contents; anything else is reported generically. */
function messageOf(error: unknown): string {
  if (error instanceof DomainValidationError) return error.issues.map(issue => issue.message).join('; ') || error.message;
  return 'Something went wrong. Your records were not changed.';
}

/** Applies the shared domain rules to renderer requests. The renderer is never trusted: setup is re-derived and intake
    input is re-validated here, and every change goes through `applyIntake`. */
export class PetalService {
  /** Each dose's record before its most recent correction in this session, for undo. New entries are not stored here. */
  private readonly undo = new Map<string, IntakeEvent>();

  constructor(private readonly store: PetalStore, private readonly now: () => Date = () => new Date()) {}

  getState(): Promise<PetalState> {
    return this.store.load();
  }

  async saveSetup(input: SetupInput): Promise<Result<PetalState>> {
    try {
      if ((await this.store.load()).pack) return fail('Setup already exists. Changing it needs a confirmation step that is not built yet.');
      const { profile, settings, pack, doses } = deriveFromSetupInput(input);
      this.undo.clear();
      return ok(await this.store.saveSetup({ profile, settings, pack, doses }));
    } catch (error) {
      return fail(messageOf(error));
    }
  }

  async recordIntake(input: RecordIntakeInput): Promise<Result<IntakeOutcome>> {
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
      // Only corrections can be undone: the storage adapter cannot remove a newly created event (#37).
      if (existing) this.undo.set(dose.id, existing);
      else this.undo.delete(dose.id);
      return ok({ state: await this.store.putIntakeEvent(event), change, undoable: existing !== undefined });
    } catch (error) {
      return fail(messageOf(error));
    }
  }

  async undoIntake(doseId: string): Promise<Result<PetalState>> {
    try {
      const previous = this.undo.get(doseId);
      if (!previous) return fail('There is nothing to undo for that tablet.');
      this.undo.delete(doseId);
      // Restoring is itself a correction: the earlier values with a new update time, so the audit trail keeps both changes.
      return ok(await this.store.putIntakeEvent({ ...previous, updatedAt: toZonedIso(this.now(), previous.timeZone) }));
    } catch (error) {
      return fail(messageOf(error));
    }
  }
}
