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

## Desktop app tooling — October 9, 2026

Issue #20 (sub-issue of #2), approved by @Kiko915.

- `apps/desktop` uses **electron-vite 5** for dev/build and **electron-builder 26** for installers (NSIS on Windows, arm64 DMG on macOS).
- Desktop pins **Vite 7.3.6** and **@vitejs/plugin-react 5.2.0** because electron-vite 5 (stable) does not support Vite 8. `apps/sync-demo` stays on Vite 8; pnpm keeps both. Upgrade when a stable electron-vite supports Vite 8.
- Electron 44.4.5. Windows use `contextIsolation`, `sandbox`, no Node integration, deny new windows and navigation, and a strict CSP; the renderer reaches the main process only through the typed preload bridge.
- `packages/domain` (`@petal/domain`) exists as a placeholder; shared contracts are still owed by #2.
- `pnpm-workspace.yaml` allows the Electron install script (downloads its binary) and denies `electron-winstaller` (Squirrel, unused).
