# Agreed technical decisions

## Optional encrypted sync — October 9, 2026

User explicitly approved optional Clerk login and encrypted Turso sync now, overriding the earlier deferral, and selected **pnpm + Express**. This does not change the offline core or React Native/Electron direction.

- Package manager: pinned pnpm workspaces; Node.js 22+; TypeScript.
- `packages/` contains shared workspace packages and versioned interfaces. The later human-approved shared UI/assets layout below defines `libs/`. Root configuration is coordinated by the human owner for this bootstrap task.
- `apps/sync-api` verifies Clerk session tokens and scopes storage to the verified user ID; no client-selected owner.
- `packages/encrypted-sync` encrypts snapshots with a random 256-bit user-held recovery key before upload. Server has no decryption keys.
- One snapshot per account, versioned optimistic concurrency. Conflicts require review; no automatic merging of health records.
- Tombstones remove current ciphertext and preserve revisions so stale devices cannot recreate data at an old revision. Re-creation requires explicit action against the tombstone revision.
- `apps/sync-demo` is a development tool using fictional notes, not the landing page or native app. Local-only mode works without Clerk configuration. Native adapters remain outstanding.
- No claim of a formal security audit, full protection against a compromised client/backend, or tested native cross-device integration.

The existing TASKS.md DEC2 native/domain paths remain unchanged; optional-sync paths are additive. X01 tracks this extension on issue #17. Workspace bootstrap does not satisfy native scaffold task acceptance.

## Shared domain contracts — October 9, 2026

User assigned Codex D01/D06-D08 under #2 while Claude owns the desktop inference spike under #3. `@petal/domain` uses pinned Zod schemas for TypeScript/runtime contracts and generated JSON Schema for interchange. Runtime semantic validation remains mandatory. Compiled ESM and declarations are consumed by future native/desktop apps.

Dose identity is separate from calendar date; absence means no-entry, and the explicit missed status is confirmed-missed. One canonical current event per dose is corrected with an audit trail. Version-1 backup excludes credentials/keys/derived guidance and preserves all durable records. Evidence corpus starts empty; the guidance stub always returns unsupported pending #4/#5. See docs/domain-contracts.md.

Issue #20 owns desktop scaffold/root configuration and must consume this package rather than replace its manifest or exports. The domain task changes only root lockfile dependency entries, not root manifests, workspace configuration or desktop paths. Native scaffold acceptance under S01-S03 remains pending.

## Shared UI themes and assets

The human selected `libs/ui/themes/` for the shared Petal appearance, with sibling `components/`, `hooks/`, `layouts/`, and `utils/`. The human moved the existing artwork to `libs/assets/brands/`, reserved `libs/assets/images/`, removed the extra `petal/` folder wrappers, and removed the old `lib/` root. Preserve that layout.

`libs/ui/themes/petal.tokens.json` is the canonical DTCG-format source. Generated CSS and typed JavaScript/native exports share its values. Approved palette/font identity is preserved; new type, spacing, radius, functional-color, and motion values are an initial baseline pending screen/device review. The appearance is light only. Fonts must be bundled and registered by the application owners.

This U01/#11 work introduces no workspace package, root tooling, app dependencies, or component/hook/layout implementations. The UI sibling directories are placeholders; consumers use relative imports until app owners agree on package exports and bundler integration. Existing `packages/` domain/service contracts remain unchanged. App integration, accessibility checks on the phone, and the L01 landing page remain separate acceptance work.

## Desktop app tooling — October 9, 2026

Issue #20 (sub-issue of #2), approved by @Kiko915.

- `apps/desktop` uses **electron-vite 5** for dev/build and **electron-builder 26** for installers (NSIS on Windows, arm64 DMG on macOS).
- Desktop pins **Vite 7.3.6** and **@vitejs/plugin-react 5.2.0** because electron-vite 5 (stable) does not support Vite 8. `apps/sync-demo` stays on Vite 8; pnpm keeps both. Upgrade when a stable electron-vite supports Vite 8.
- Electron 44.4.5. Windows use `contextIsolation`, `sandbox`, no Node integration, deny new windows and navigation, and a strict CSP; the renderer reaches the main process only through the typed preload bridge.
- The desktop app consumes the compiled `@petal/domain` package (no alias to its source). Desktop `dev`, `build` and `typecheck` build `@petal/domain` first.
- `pnpm-workspace.yaml` allows the Electron install script (downloads its binary) and denies `electron-winstaller` (Squirrel, unused).
