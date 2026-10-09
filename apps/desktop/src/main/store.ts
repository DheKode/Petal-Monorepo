import type { BleedingEntry, IntakeEvent, Pack, PillProfile, ScheduledDose, Settings } from '@petal/domain';
import type { ImportPreview, PetalState } from '../shared/ipc';

/** Thrown when setup is attempted on a database that already holds a pack, intake events or audit history. Setup is
    first-time only: the adapter implements it as a replace-all import, which would silently erase those records. */
export class SetupExistsError extends Error {
  constructor() {
    super('Setup already exists');
    this.name = 'SetupExistsError';
  }
}

/** The settings and the scheduled doses as they should be after a change of usual time. Nothing else is touched. */
export interface ScheduleChange {
  settings: Settings;
  doses: ScheduledDose[];
}

export interface SavedSetup {
  profile: PillProfile;
  settings: Settings;
  pack: Pack;
  doses: ScheduledDose[];
}

/** Storage port for the desktop app. The app uses `SqliteStore` (the `@petal/storage` adapter, which also writes the audit
    trail). `MemoryStore` below is only for tests and must never be wired into the running app: nothing it holds survives
    a restart. */
export interface PetalStore {
  load(): Promise<PetalState>;
  saveSetup(setup: SavedSetup): Promise<PetalState>;
  putIntakeEvent(event: IntakeEvent): Promise<PetalState>;
  /** Remove the current intake event of a dose (used to undo a mistaken new entry). The removal is audited. */
  removeIntakeEvent(doseId: string): Promise<PetalState>;
  /** Create or edit a bleeding or spotting entry (matched by id). Audited. */
  putBleedingEntry(entry: BleedingEntry): Promise<PetalState>;
  /** Delete a bleeding or spotting entry. Audited; the deleted values stay in the audit trail. */
  removeBleedingEntry(id: string): Promise<PetalState>;
  /** Replace the settings and scheduled doses, keeping every intake entry, bleeding entry and audit entry. */
  updateSchedule(change: ScheduleChange): Promise<PetalState>;
  /** Full backup as JSON text (plaintext, not encrypted). */
  exportJson(): Promise<{ json: string; sensitivityNotice: string }>;
  /** Validate backup text and hold it as a pending preview. Changes nothing stored. Throws if the text is not a valid backup. */
  previewImport(json: string): Promise<ImportPreview>;
  /** Replace everything with the previewed backup in one transaction, keeping a recovery copy. Throws on a stale or unknown token. */
  confirmImport(token: string): Promise<{ state: PetalState; recoveryKept: boolean }>;
  cancelImport(token: string): void;
}

export function emptyState(persistence: PetalState['persistence']): PetalState {
  return { profile: null, settings: null, pack: null, doses: [], events: [], bleeding: [], persistence };
}

/** Non-persistent store for tests. Returns defensive copies so callers cannot mutate stored records. */
export class MemoryStore implements PetalStore {
  private state: PetalState = emptyState('memory');

  async load(): Promise<PetalState> {
    return structuredClone(this.state);
  }

  async saveSetup(setup: SavedSetup): Promise<PetalState> {
    if (this.state.pack) throw new SetupExistsError();
    this.state = { ...structuredClone(setup), events: [], bleeding: [], persistence: 'memory' };
    return this.load();
  }

  async putIntakeEvent(event: IntakeEvent): Promise<PetalState> {
    const others = this.state.events.filter(e => e.doseId !== event.doseId);
    this.state = { ...this.state, events: [...others, structuredClone(event)] };
    return this.load();
  }

  async removeIntakeEvent(doseId: string): Promise<PetalState> {
    this.state = { ...this.state, events: this.state.events.filter(e => e.doseId !== doseId) };
    return this.load();
  }

  async putBleedingEntry(entry: BleedingEntry): Promise<PetalState> {
    const others = this.state.bleeding.filter(e => e.id !== entry.id);
    this.state = { ...this.state, bleeding: [...others, structuredClone(entry)] };
    return this.load();
  }

  async removeBleedingEntry(id: string): Promise<PetalState> {
    this.state = { ...this.state, bleeding: this.state.bleeding.filter(e => e.id !== id) };
    return this.load();
  }

  async updateSchedule(change: ScheduleChange): Promise<PetalState> {
    this.state = { ...this.state, settings: structuredClone(change.settings), doses: structuredClone(change.doses) };
    return this.load();
  }

  async exportJson(): Promise<never> {
    throw new Error('MemoryStore has no backup');
  }

  async previewImport(): Promise<never> {
    throw new Error('MemoryStore has no backup');
  }

  async confirmImport(): Promise<never> {
    throw new Error('MemoryStore has no backup');
  }

  cancelImport(): void {}
}
