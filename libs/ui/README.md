# Shared UI — @petal/ui

This workspace package contains UI code reused across Petal applications. The root `index.ts` is its public TypeScript entry point; `package.json` defines its build and public exports.

| Folder | Responsibility |
| --- | --- |
| `src/themes/` | Shared appearance values and their platform exports; [Petal theme](src/themes/README.md) |
| `src/components/` | Future reusable visual controls, with platform-specific implementations where necessary |
| `src/hooks/` | Future reusable UI behavior hooks |
| `src/layouts/` | Future reusable screen and page arrangements |
| `src/utils/` | Future helpers that specifically support the UI |

The non-theme folders are reserved placeholders. This token task introduces no component, hook, or layout implementation. Shared domain contracts and other versioned workspace packages stay in `packages/`. Static assets live in `libs/assets/`.

## Consume from an application

Add `"@petal/ui": "workspace:*"` to the application's dependencies, run `pnpm install`, and build this package before starting the app:

```sh
pnpm --filter @petal/ui build
```

```ts
import { petalTheme, getPetalTheme } from '@petal/ui';
import '@petal/ui/theme.css';
```

| Export | Contents |
| --- | --- |
| `@petal/ui` | Web/native themes, reduced-motion helpers, metadata, and theme types |
| `@petal/ui/theme` | Web theme and types |
| `@petal/ui/theme/native` | Native theme and types |
| `@petal/ui/theme.css` | CSS custom properties, including reduced-motion overrides |
| `@petal/ui/tokens.json` | Canonical DTCG-format source |

Native apps import `petalNativeTheme` from `@petal/ui/theme/native`. See the theme guide for font registration and platform units. The package provides ESM with declarations and no runtime dependencies; CSS is marked as a side effect so bundlers preserve it. App owners must verify their Vite/Metro setup and bundle Geist Mono locally for offline use.

## Verify

```sh
pnpm --filter @petal/ui build
pnpm --filter @petal/ui typecheck
pnpm --filter @petal/ui test
pnpm --filter @petal/ui theme:check
```

These commands also participate in the repository's recursive checks. `dist/` is generated and ignored; do not commit it. Edit the canonical token source and regenerate its checked-in theme exports together.
