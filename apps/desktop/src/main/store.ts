import type { IntakeEvent, Pack, PillProfile, ScheduledDose, Settings } from '@petal/domain';
import type { PetalState } from '../shared/ipc';

export interface SavedSetup {
  profile: PillProfile;
  settings: Settings;
  pack: Pack;
  doses: ScheduledDose[];
}

/** Storage port for the desktop app. The real implementation is the SQLite adapter from #6 (`packages/storage`, PR #28),
    which also appends audit entries for each change. Until that is merged the app uses `MemoryStore`, so nothing
    survives a restart and no audit trail exists: the UI says so and no persistence claim may be made (F04, F13). */
export interface PetalStore {
  load(): Promise<PetalState>;
  saveSetup(setup: SavedSetup): Promise<PetalState>;
  putIntakeEvent(event: IntakeEvent): Promise<PetalState>;
  removeIntakeEvent(doseId: string): Promise<PetalState>;
}

export function emptyState(persistence: PetalState['persistence']): PetalState {
  return { profile: null, settings: null, pack: null, doses: [], events: [], persistence };
}

/** Temporary, non-persistent store. Returns defensive copies so callers cannot mutate stored records. */
export class MemoryStore implements PetalStore {
  private state: PetalState = emptyState('memory');

  async load(): Promise<PetalState> {
    return structuredClone(this.state);
  }

  async saveSetup(setup: SavedSetup): Promise<PetalState> {
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
}
