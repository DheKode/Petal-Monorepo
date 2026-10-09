# Agreed technical decisions

## Optional encrypted sync — October 9, 2026

User explicitly approved optional Clerk login and encrypted Turso sync now, overriding the earlier deferral, and selected **pnpm + Express**. This does not change the offline core or React Native/Electron direction.

- Package manager: pinned pnpm workspaces; Node.js 22+; TypeScript.
- `packages/` contains shared workspace packages and versioned interfaces. `lib/` is for standalone utilities. Root configuration is coordinated by the human owner for this bootstrap task.
- `apps/sync-api` verifies Clerk session tokens and scopes storage to the verified user ID; no client-selected owner.
- `packages/encrypted-sync` encrypts snapshots with a random 256-bit user-held recovery key before upload. Server has no decryption keys.
- One snapshot per account, versioned optimistic concurrency. Conflicts require review; no automatic merging of health records.
- Tombstones remove current ciphertext and preserve revisions so stale devices cannot recreate data at an old revision. Re-creation requires explicit action against the tombstone revision.
- `apps/sync-demo` is a development tool using fictional notes, not the landing page or native app. Local-only mode works without Clerk configuration. Native adapters remain outstanding.
- No claim of a formal security audit, full protection against a compromised client/backend, or tested native cross-device integration.

The existing TASKS.md DEC2 native/domain paths remain unchanged; optional-sync paths are additive. X01 tracks this extension on issue #17. Workspace bootstrap does not satisfy native scaffold task acceptance.
