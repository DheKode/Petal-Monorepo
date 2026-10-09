import { LocalStore } from '@petal/storage';
import { BACKUP_VERSION, serializeBackup, type Backup, type IntakeEvent } from '@petal/domain';
import type { PetalState } from '../shared/ipc';
import type { PetalStore, SavedSetup } from './store';

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
    const { backup } = await this.db.read();
    return {
      profile: backup.profiles[0] ?? null,
      settings: backup.settings,
      pack: backup.packs[0] ?? null,
      doses: backup.scheduledDoses,
      events: backup.intakeEvents,
      persistence: 'disk',
    };
  }

  /** Setup has no dedicated adapter call, so it goes through the adapter's validated replace-all import. The service
      refuses to run setup when a pack already exists, so this never replaces user records. */
  async saveSetup(setup: SavedSetup): Promise<PetalState> {
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
}
