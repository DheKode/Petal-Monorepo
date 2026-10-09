import { clerkSessionAuth } from './auth.js';
import { createClient } from '@libsql/client';
import { createApp } from './app.js';
import { SnapshotStore } from './store.js';
import { required, databaseConfig } from './config.js';
required('CLERK_SECRET_KEY'); required('CLERK_PUBLISHABLE_KEY');
const allowedOrigins = required('ALLOWED_ORIGINS').split(',').map(x => x.trim());
for (const origin of allowedOrigins) { const u = new URL(origin); if (u.origin !== origin || (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['localhost','127.0.0.1'].includes(u.hostname)))) throw new Error('Invalid allowed origin'); }
const db = createClient(databaseConfig());
const store = new SnapshotStore(db);
const app = createApp({store,allowedOrigins,authenticate:clerkSessionAuth({authorizedParties:allowedOrigins})});
const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
app.listen(port,'127.0.0.1',() => console.log(`Petal sync API listening on port ${port}`));
