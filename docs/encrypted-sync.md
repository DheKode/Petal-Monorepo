# Optional Clerk login and encrypted Turso sync

## Setup

1. Install Node.js 22+ and pnpm 11.25.0; run `pnpm install --frozen-lockfile`.
2. The intended Clerk app is `app_3KShT9eJ18y1MFYfzMOaCvF2T4B`. The CLI account must have access. Use `clerk link --app app_3KShT9eJ18y1MFYfzMOaCvF2T4B`, then `clerk env pull --app app_3KShT9eJ18y1MFYfzMOaCvF2T4B --file apps/sync-api/.env.local` to pull dev keys. Follow current CLI help if upgrading.
3. Add the supplied Turso URL and auth token to that server-only file, plus `ALLOWED_ORIGINS=http://localhost:5173` and `PORT=3001`. Never put Turso or Clerk secret keys in `VITE_*` variables.
4. Set only the Clerk **publishable** key as `VITE_CLERK_PUBLISHABLE_KEY` in `apps/sync-demo/.env.local`, plus `VITE_SYNC_API_URL=http://localhost:3001`.
5. Run `pnpm db:migrate`, then `pnpm dev:sync` and `pnpm dev:sync-demo` in separate terminals. Keep the Clerk app's development origin aligned with the configured allowlist.
6. Create/sign in to a test account in the UI. Sign-in does not opt in to sync. Enable cloud storage, generate and privately save a recovery key, then read the cloud copy before uploading a fictional note. A second browser/device needs the same account and recovery key.

The demonstration uses fictional notes only. No actual user health records are needed for validation. A local recovery-key download is unencrypted; store it privately and exclude it from Git and cloud sharing. Keys are memory-only in this tool and disappear on reload/sign-out. Clerk account recovery cannot recover an encryption key.

## Trust boundaries

- Client: generates a random 32-byte recovery key and uses Web Crypto AES-256-GCM with a fresh 12-byte IV on every upload. Algorithm version, account ID and target revision bind the authenticated payload. Wrong account/key/revision or altered ciphertext fails decryption.
- Clerk: knows account identity and auth metadata; not the recovery key or decrypted records.
- API/Turso: sees owner ID, revision, update time, ciphertext length, key fingerprint, and deletion state. Neither should receive the encryption key or plaintext health records. All queries are parameterized and owner-scoped.
- Transport: bearer session tokens verified by Clerk; authorized-party and origin allowlists; TLS for remote sync/database traffic. No API authorization via cookies, user ID headers, or request bodies.
- The public health route reports process availability, not database readiness. Rate limits are per process/IP; multi-instance deployments need a shared limiter and trusted proxy configuration.

This implements client-encrypted storage and explicit authorization, not a blanket “zero trust” certification. A compromised client can steal keys/plaintext. A malicious server can deny service, omit records, or replay old data to a fresh device. Persisted revision high-water marks reject previously observed rollback on the same device; fresh-device rollback and key recovery need additional trust mechanisms. Ciphertext/key fingerprints leak correlation metadata.

## Sync contract

`GET /v1/snapshot` returns `{ revision, deleted, envelope }`; an empty account starts at revision 0.

`PUT /v1/snapshot` accepts only a validated encrypted envelope and `If-Match: "<baseRevision>"`. Encrypt for baseRevision + 1. One atomic conditional SQL write succeeds; competing/stale writes return 409 with current revision. Clients must read/decrypt/review both copies and explicitly select a resolution before replacing data. Do not blindly retry against a new revision.

`DELETE /v1/snapshot` also requires If-Match. It removes current ciphertext and increments a tombstone revision. It does not delete the Clerk account, local records, or guarantee erasure from provider backups. Turning sync off/signing out retains local and existing cloud data; deletion is a separate confirmed action.

Opaque snapshots are capped at 2 MB ciphertext. Their encrypted inner schema is validated by the platform adapter before any local mutation. The API cannot inspect encrypted clinical content. Do not serialize tokens, encryption keys, auth settings, or generated clinical output into snapshots.

## Native integration requirements

Use the shared `SyncClient` with explicit opt-in and a Clerk SDK session-token callback. Persist the account-bound revision high-water mark. Bind each client instance and its consent/key state to the current verified account, and cancel in-flight operations on account switch/sign-out.

- Android: provide a verified Web Crypto-compatible adapter or native AES-GCM implementation with matching format and cryptographically secure randomness. Store secrets using Android Keystore-backed storage; do not put them in AsyncStorage.
- Electron: restrict renderer privileges, use a hardened preload/IPC boundary, and use OS-backed secure storage. Do not embed Turso/Clerk server secrets in binaries.
- Local SQLite remains primary. Do not require sign-in, network, or a recovery key to log or read local data.
- Export complete versioned durable records/audit/settings; validate decrypted backups, preview replacement, create a recovery backup, and apply transactionally after explicit confirmation. Recompute derived guidance afterward.
- Cross-device linking here is manual recovery-key transfer under user control. Secure automated device pairing, key rotation, account-deletion propagation and native integration are not implemented.

## Verification

`pnpm typecheck`, `pnpm test`, `pnpm build`. Tests verify authenticated encryption, tampering/wrong-key/account/revision rejection, explicit opt-out, rollback detection, authenticated HTTP boundaries, real SQLite persistence, optimistic concurrency and deletion tombstones. Production Clerk adapter tests use test-generated RSA keys and synthetic session tokens; they are distinct from live sign-in verification.

Deployment requires TLS, secure environment provisioning, origin configuration, operational monitoring without sensitive payload logs, and review. No remote service deployment or native device validation is claimed by this setup.
