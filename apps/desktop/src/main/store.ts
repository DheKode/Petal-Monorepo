import type { IntakeEvent, Pack, PillProfile, ScheduledDose, Settings } from '@petal/domain';
import type { PetalState } from '../shared/ipc';

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
    a restart. There is deliberately no removal operation, because the adapter cannot remove an intake event (#37). */
export interface PetalStore {
  load(): Promise<PetalState>;
  saveSetup(setup: SavedSetup): Promise<PetalState>;
  putIntakeEvent(event: IntakeEvent): Promise<PetalState>;
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
}
