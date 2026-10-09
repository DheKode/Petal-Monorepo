# Shared UI — @petal/ui

This workspace package contains UI code reused across Petal applications. The root `index.ts` is its public TypeScript entry point; `package.json` defines its build and public exports.

| Folder | Responsibility |
| --- | --- |
| `src/styles/` | Opt-in shared web styling driven by the theme tokens |
| `src/themes/` | Shared appearance values and their platform exports; [Petal theme](src/themes/README.md) |
| `src/components/` | Seven shared controls with React web/Electron and React Native implementations |
| `src/hooks/` | Disclosure, reduced-motion preference, and responsive layout behavior |
| `src/layouts/` | Screen and Stack arrangements on both platforms |
| `src/utils/` | Pure class-name, layout, and button-appearance helpers |

These are original Petal foundations for U01 / issue #40, derived from the existing tokens. They do not implement logging, guidance, persistence, or application navigation. Shared domain contracts and other versioned workspace packages stay in `packages/`. Static assets live in `libs/assets/`.

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
| `@petal/ui` | Framework-free web/native themes, theme helpers, metadata, and UI utilities |
| `@petal/ui/theme` | Web theme and types |
| `@petal/ui/theme/native` | Native theme and types |
| `@petal/ui/theme.css` | CSS custom properties, including reduced-motion overrides |
| `@petal/ui/styles.css` | Theme variables plus opt-in web base and specimen classes |
| `@petal/ui/tokens.json` | Canonical DTCG-format source |
| `@petal/ui/components` | Web controls by default; native controls under the `react-native` resolution condition |
| `@petal/ui/hooks` | Web hooks by default; native hooks under the `react-native` condition |
| `@petal/ui/layouts` | Web layouts by default; native layouts under the `react-native` condition |
| `@petal/ui/components/native`, `hooks/native`, `layouts/native` | Explicit native entry points for platform-safe imports |
| `@petal/ui/utils` | Pure helpers without React or React Native imports |

The package provides ESM with declarations. React `>=19.2.3 <20` and React Native `0.86.3` are optional peers: applications using controls provide their platform runtime, while theme-only consumers require neither. Web consumers need React; native consumers need both. CSS is marked as a side effect so bundlers preserve it. App owners must verify their Vite/Metro setup and register Geist Mono locally for offline use. Native font format/registration remains an app-adapter task; the bundled WOFF2 is verified only in the web preview.

For web controls, import `@petal/ui/styles.css` and wrap the UI with `data-petal-ui` (Screen already supplies it). This export includes the theme. Register Geist Mono from [the local font asset](../assets/fonts/geist-mono/README.md).

```tsx
import { Button, Card, TextField } from '@petal/ui/components';
import { Screen, Stack } from '@petal/ui/layouts';
import '@petal/ui/styles.css';

// Controlled values and writes belong to the application.
<Screen title="Review entry">
  <Card title="Details"><Stack>
    <TextField label="Entry label" value={label} onValueChange={setLabel} />
    <Button label="Preview change" onPress={openPreview} />
  </Stack></Card>
</Screen>;
```

Native apps can use the explicit `/native` paths to avoid depending on bundler condition configuration. Shared props are identical; children use platform-appropriate elements (wrap native text in React Native Text). Supply measured safe-area insets to native Screen. See [components](src/components/README.md), [hooks](src/hooks/README.md), and [layouts](src/layouts/README.md) for behavior and integration responsibilities.

## Live component preview

```sh
pnpm --filter @petal/ui build
pnpm --filter @petal/ui preview:components
```

Open http://127.0.0.1:4179/ to exercise the actual web components: controlled fields, selections, busy actions, and confirmation/cancellation. Unlike the self-contained token HTML, this development preview needs the local server. It reuses the repository's existing desktop Vite tool, adds no preview dependency, and saves no records. Its font is local; the server binds to loopback.

## Verify

```sh
pnpm --filter @petal/ui build
pnpm --filter @petal/ui typecheck
pnpm --filter @petal/ui test
pnpm --filter @petal/ui theme:check
```

These commands also participate in the repository's recursive checks. `dist/` is generated and ignored; do not commit it. Edit the canonical token source and regenerate its checked-in theme exports together.

Native verification uses the actual React Native type definitions, conditional import checks, and explicitly mocked host-contract tests. Those tests do not establish Android rendering, TalkBack focus, keyboard avoidance, safe-area correctness, or native font registration. Device review and app integration remain required before U01 can be completed.
