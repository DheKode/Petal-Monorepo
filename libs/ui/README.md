# Shared UI — @petal/ui

This workspace package contains UI code reused across Petal applications. The root `index.ts` is its public TypeScript entry point; `package.json` defines its build and public exports.

| Folder | Responsibility |
| --- | --- |
| `src/styles/` | Opt-in shared web styling driven by the theme tokens |
| `src/themes/` | Shared appearance values and their platform exports; [Petal theme](src/themes/README.md) |
| `src/components/` | Future reusable visual controls, with platform-specific implementations where necessary |
| `src/hooks/` | Future reusable UI behavior hooks |
| `src/layouts/` | Future reusable screen and page arrangements |
| `src/utils/` | Future helpers that specifically support the UI |

The component, hook, layout, and utility folders remain placeholders. The style folder contains original web specimens, not React/native components. Shared domain contracts and other versioned workspace packages stay in `packages/`. Static assets live in `libs/assets/`.

Open [preview.html](preview.html) directly in a browser to inspect every token offline. Its font, logo, CSS, and scripts are embedded. Search names/aliases, inspect platform values, compare button corners, replay motion, and try confirmation states. Fictional examples save nothing. Regenerate it through the package build instead of editing the HTML.

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
| `@petal/ui/styles.css` | Theme variables plus opt-in web base and specimen classes |
| `@petal/ui/tokens.json` | Canonical DTCG-format source |

Native apps import `petalNativeTheme` from `@petal/ui/theme/native`. See the theme guide for font registration and platform units. The package provides ESM with declarations and no runtime dependencies; CSS is marked as a side effect so bundlers preserve it. App owners must verify their Vite/Metro setup and bundle Geist Mono locally for offline use.

For optional web specimens, import `@petal/ui/styles.css`, wrap the UI with `data-petal-ui`, and use classes such as `petal-button`, `petal-input`, and `petal-card`. This export already imports the theme. Register Geist Mono from [the local font asset](../assets/fonts/geist-mono/README.md). Behavior, accessible relationships, application layouts, and native adapters remain the consuming application’s responsibility.

## Verify

```sh
pnpm --filter @petal/ui build
pnpm --filter @petal/ui typecheck
pnpm --filter @petal/ui test
pnpm --filter @petal/ui theme:check
```

These commands also participate in the repository's recursive checks. `dist/` is generated and ignored; do not commit it. Edit the canonical token source and regenerate its checked-in theme exports together.
