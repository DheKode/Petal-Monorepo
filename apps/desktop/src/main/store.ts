import type { IntakeEvent, Pack, PillProfile, ScheduledDose, Settings } from '@petal/domain';
import type { ImportPreview, PetalState } from '../shared/ipc';

/** Thrown when setup is attempted on a database that already holds a pack, intake events or audit history. Setup is
    first-time only: the adapter implements it as a replace-all import, which would silently erase those records. */
export class SetupExistsError extends Error {
  constructor() {
    super('Setup already exists');
    this.name = 'SetupExistsError';
  }
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
  /** Full backup as JSON text (plaintext, not encrypted). */
  exportJson(): Promise<{ json: string; sensitivityNotice: string }>;
  /** Validate backup text and hold it as a pending preview. Changes nothing stored. Throws if the text is not a valid backup. */
  previewImport(json: string): Promise<ImportPreview>;
  /** Replace everything with the previewed backup in one transaction, keeping a recovery copy. Throws on a stale or unknown token. */
  confirmImport(token: string): Promise<{ state: PetalState; recoveryKept: boolean }>;
  cancelImport(token: string): void;
}

export function emptyState(persistence: PetalState['persistence']): PetalState {
  return { profile: null, settings: null, pack: null, doses: [], events: [], persistence };
}

/** Non-persistent store for tests. Returns defensive copies so callers cannot mutate stored records. */
export class MemoryStore implements PetalStore {
  private state: PetalState = emptyState('memory');

  async load(): Promise<PetalState> {
    return structuredClone(this.state);
  }

  async saveSetup(setup: SavedSetup): Promise<PetalState> {
    if (this.state.pack) throw new SetupExistsError();
    this.state = { ...structuredClone(setup), events: [], persistence: 'memory' };
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
