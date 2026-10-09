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

The human selected `libs/ui/` and then moved its source folders under `src/`, putting the theme in `libs/ui/src/themes/` for the shared Petal appearance, with sibling `components/`, `hooks/`, `layouts/`, and `utils/`. The human moved the existing artwork to `libs/assets/brands/`, reserved `libs/assets/images/`, removed the extra `petal/` folder wrappers, and removed the old `lib/` root. Preserve that layout.

`libs/ui/src/themes/petal.tokens.json` is the canonical DTCG-format source. Generated CSS and typed JavaScript/native exports share its values. Approved palette/font identity is preserved; new type, spacing, radius, functional-color, and motion values are an initial baseline pending screen/device review. The appearance is light only. Fonts must be bundled and registered by the application owners.

The human subsequently requested completion of the root `libs/ui/index.ts` and `package.json` scaffolds. `@petal/ui` is registered through `libs/*` and builds ESM plus TypeScript declarations. Public exports cover the package root, `theme`, `theme/native`, `theme.css`, and `tokens.json`; runtime imports have no dependencies. Root recursive checks include this package. The workspace/lockfile change adds only registration and its empty importer, preserving existing versions and build policies. Apps opt in with `@petal/ui: workspace:*`; no app dependencies or component/hook/layout implementations are added. Existing `packages/` domain/service contracts remain unchanged. App bundler integration, accessibility checks on the phone, and the L01 landing page remain separate acceptance work.

## Desktop app tooling — October 9, 2026

Issue #20 (sub-issue of #2), approved by @Kiko915.

- `apps/desktop` uses **electron-vite 5** for dev/build and **electron-builder 26** for installers (NSIS on Windows, arm64 DMG on macOS).
- Desktop pins **Vite 7.3.6** and **@vitejs/plugin-react 5.2.0** because electron-vite 5 (stable) does not support Vite 8. `apps/sync-demo` stays on Vite 8; pnpm keeps both. Upgrade when a stable electron-vite supports Vite 8.
- Electron 44.4.5. Windows use `contextIsolation`, `sandbox`, no Node integration, deny new windows and navigation, and a strict CSP; the renderer reaches the main process only through the typed preload bridge.
- The desktop app consumes the compiled `@petal/domain` package (no alias to its source). Desktop `dev`, `build` and `typecheck` build `@petal/domain` first.
- `pnpm-workspace.yaml` allows the Electron install script (downloads its binary) and denies `electron-winstaller` (Squirrel, unused).

## Original token specimens and offline preview

For U01 / issue #11 and PRD §4, the human requested Petal’s own tokens and an HTML preview of every token, using component/icon/motion references only for study. `libs/ui/src/styles/` holds original shared web styling; `@petal/ui/styles.css` exports it. `libs/ui/preview.html` is generated from the same canonical source as web/native themes and embeds artwork, Geist Mono, and all rendering code for offline review. Font provenance and the SIL license live in `libs/assets/fonts/geist-mono/`. No UI library dependency is added. Button radius 12, icon slots 20/24/32, outline weight 1.75, and restrained motion are candidates pending designer/device review. This does not complete application integration or U01/L01 acceptance.

## Desktop persistence — October 10, 2026

Issue #8, approved by @Kiko915.

- The desktop main process owns a `SqliteStore` that wraps `@petal/storage` (`LocalStore`) and opens `petal.db` in the app user-data folder. The renderer only reaches it through the typed IPC operations in `src/main/service.ts`, which re-validate every request and apply the shared domain rules (`applyIntake`) before the adapter is called. A failure to open the file shows an error and quits; the app never falls back to an in-memory store.
- Setup goes through the adapter's validated replace-all import (it has no dedicated call); the service refuses setup when a pack already exists. Intake changes use the adapter's preview and confirm back to back, because the user's own logging action is the confirmation.
- Undo is available only for corrections: it writes the earlier values back as a new correction with a fresh update time, because the adapter rejects going back in time and cannot remove an event (follow-up #37, item 7). New entries cannot be undone.
- All store operations run one at a time (`PetalService`), so double clicks and overlapping requests cannot fail each other with a stale revision; undo bookkeeping changes only after a write succeeds, and a restore is never dated earlier than the correction it undoes. Setup is refused by the store itself unless the database is empty. Only one Petal copy can use a data folder (single-instance lock), and quitting waits for accepted writes before closing the database.
- `@libsql/client` is a native module, so it is a real `dependency` of `@petal/desktop`, stays external in the main bundle, and is unpacked from the asar. The packaged Windows build was checked; macOS was not, and macOS packaging must run on a Mac.
- `@petal/storage` declares only an `import` export condition, so the desktop test script resolves it with `tsx --conditions=import`. Adding a `default` condition is tracked in #37.

## Shared web and React Native UI foundations

For U01 / issue #40 under #11, @emperuna explicitly requested native components alongside the first shared component set. `@petal/ui/components`, `hooks`, and `layouts` select native implementations under the `react-native` export condition, with explicit `/native` entry points for applications whose resolution configuration differs. Root, theme, and utility imports remain framework-free. React `>=19.2.3 <20` and React Native `0.86.3` match the existing desktop and Android spike runtimes; optional peer declarations let theme-only and web consumers avoid loading native code. Development types/runtimes and their lockfile changes are isolated in dependency PR #42 before the implementation PR.

Seven original controls share platform-neutral props, use approved token exports, and leave application writes and health interpretation to consumers. Confirmation exposes separate preview/confirm/cancel responsibilities; native text scaling remains enabled. Screen and Stack share semantic spacing and responsive widths; native apps supply measured safe-area insets and font registration. Native validation initially consists of real-platform typechecking, import resolution, and explicitly mocked host-contract tests. Actual Android rendering, TalkBack focus, keyboard behavior, and font registration require app-owner device evidence. The live component preview is a repository-only React web example served by the existing desktop Vite tool; the standalone generated token inventory remains available offline.
