import { LocalStore } from '@petal/storage';
import { BACKUP_VERSION, serializeBackup, type Backup, type IntakeEvent } from '@petal/domain';
import type { ImportPreview, PetalState, RecordCounts } from '../shared/ipc';
import { SetupExistsError, type PetalStore, type SavedSetup } from './store';

function toState(backup: Backup): PetalState {
  return {
    profile: backup.profiles[0] ?? null,
    settings: backup.settings,
    pack: backup.packs[0] ?? null,
    doses: backup.scheduledDoses,
    events: backup.intakeEvents,
    persistence: 'disk',
  };
}

function countsOf(backup: Backup): RecordCounts {
  return {
    profiles: backup.profiles.length, packs: backup.packs.length, scheduledDoses: backup.scheduledDoses.length,
    intakeEvents: backup.intakeEvents.length, auditEntries: backup.auditEntries.length,
    bleedingEntries: backup.bleedingEntries.length, evidence: backup.evidence.length,
  };
}

/** Durable store backed by `@petal/storage` (local SQLite file, plaintext, not encrypted at rest). Must only be used in the
    main process: the renderer reaches it through the narrow IPC operations in `service.ts`, never directly.
    The adapter appends the audit entry for every intake change and keeps a recovery copy when setup replaces the data. */
export class SqliteStore implements PetalStore {
  private constructor(private readonly db: LocalStore, private readonly appVersion: string) {}

  /** `path` must be an absolute local file path, normally inside the app's private user-data folder. */
  static async open(path: string, appVersion: string): Promise<SqliteStore> {
    return new SqliteStore(await LocalStore.open(path), appVersion);
  }

  close(): void {
    this.db.close();
  }

  async load(): Promise<PetalState> {
    return toState((await this.db.read()).backup);
  }

  async exportJson(): Promise<{ json: string; sensitivityNotice: string }> {
    const { json, sensitivityNotice } = await this.db.exportJson();
    return { json, sensitivityNotice };
  }

  /** Counts only leave this class: the file's records stay in the main process until the user confirms. */
  async previewImport(json: string): Promise<ImportPreview> {
    const { backup: current } = await this.db.read();
    const preview = await this.db.previewImport(json);
    return { token: preview.token, incoming: preview.counts, current: countsOf(current), sensitivityNotice: preview.sensitivityNotice };
  }

  async confirmImport(token: string): Promise<{ state: PetalState; recoveryKept: boolean }> {
    const { recoveryId } = await this.db.confirm(token);
    return { state: await this.load(), recoveryKept: recoveryId !== null };
  }

  cancelImport(token: string): void {
    this.db.cancel(token);
  }

  /** Setup has no dedicated adapter call, so it goes through the adapter's validated replace-all import. That would erase
      anything already stored, so it refuses unless the database is empty. */
  async saveSetup(setup: SavedSetup): Promise<PetalState> {
    const current = (await this.db.read()).backup;
    if (current.packs.length || current.intakeEvents.length || current.auditEntries.length || current.bleedingEntries.length) {
      throw new SetupExistsError();
    }
    const backup: Backup = {
      schemaVersion: BACKUP_VERSION,
      appVersion: this.appVersion,
      exportedAt: new Date().toISOString(),
      encryption: 'none',
      profiles: [setup.profile],
      settings: setup.settings,
      packs: [setup.pack],
      scheduledDoses: setup.doses,
      intakeEvents: [],
      auditEntries: [],
      bleedingEntries: [],
      evidence: [],
    };
    const preview = await this.db.previewImport(serializeBackup(backup));
    await this.db.confirm(preview.token);
    return this.load();
  }

  /** The user's own logging action is the confirmation, so preview and confirm run back to back. */
  async putIntakeEvent(event: IntakeEvent): Promise<PetalState> {
    const preview = await this.db.previewIntakeCorrection(event, 'manual');
    await this.db.confirm(preview.token);
    return this.load();
  }

  /** Undo of a mistaken new entry. The adapter keeps the removed values in the audit trail. */
  async removeIntakeEvent(doseId: string): Promise<PetalState> {
    const preview = await this.db.previewIntakeRemoval(doseId, 'manual');
    await this.db.confirm(preview.token);
    return this.load();
  }
}
