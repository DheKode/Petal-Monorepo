import { createClient } from '@libsql/client';
import { SnapshotStore } from './store.js';
import { databaseConfig } from './config.js';
const db = createClient(databaseConfig());
try { await new SnapshotStore(db).migrate(); console.log('Encrypted sync schema ready'); } finally { db.close(); }
