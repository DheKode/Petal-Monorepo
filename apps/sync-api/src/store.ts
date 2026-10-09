import type { Client } from '@libsql/client';
import type { Envelope, RemoteSnapshot } from '@petal/encrypted-sync';
export const SCHEMA = `CREATE TABLE IF NOT EXISTS petal_sync_vaults (
  owner_id TEXT PRIMARY KEY NOT NULL,
  revision INTEGER NOT NULL CHECK(revision > 0),
  deleted INTEGER NOT NULL CHECK(deleted IN (0,1)),
  envelope TEXT,
  updated_at TEXT NOT NULL,
  CHECK ((deleted = 1 AND envelope IS NULL) OR (deleted = 0 AND envelope IS NOT NULL))
)`;
export class SnapshotStore {
  constructor(private readonly db: Client) {}
  async migrate() { await this.db.execute(SCHEMA); }
  async read(owner: string): Promise<RemoteSnapshot> {
    const result = await this.db.execute({sql:'SELECT revision, deleted, envelope FROM petal_sync_vaults WHERE owner_id = ?',args:[owner]});
    const row = result.rows[0];
    return row ? {revision:Number(row.revision),deleted:row.deleted === 1,envelope:row.envelope ? JSON.parse(String(row.envelope)) as Envelope : null} : {revision:0,deleted:false,envelope:null};
  }
  async write(owner: string, expected: number, envelope: Envelope | null): Promise<RemoteSnapshot | null> {
    // One atomic statement: both new rows and existing rows must match the caller's base revision.
    const result = await this.db.execute({sql:`INSERT INTO petal_sync_vaults(owner_id,revision,deleted,envelope,updated_at)
      SELECT ?, ?, ?, ?, ? WHERE ? = 0 OR EXISTS(SELECT 1 FROM petal_sync_vaults WHERE owner_id = ? AND revision = ?)
      ON CONFLICT(owner_id) DO UPDATE SET revision=excluded.revision, deleted=excluded.deleted, envelope=excluded.envelope, updated_at=excluded.updated_at
      WHERE petal_sync_vaults.revision = ? RETURNING revision`, args:[owner,expected+1,envelope ? 0:1,envelope ? JSON.stringify(envelope):null,new Date().toISOString(),expected,owner,expected,expected]});
    return result.rows.length ? {revision:expected+1,deleted:!envelope,envelope:null} : null;
  }
}
