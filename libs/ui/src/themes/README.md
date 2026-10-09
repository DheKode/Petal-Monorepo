# Petal theme

Shared visual foundations for mobile, desktop, and landing applications, under U01 / issue #11 and PRD §4. The human selected `libs/ui/src/themes/` as the theme's home. It is exposed by the `@petal/ui` workspace package; no application dependency is added here.

The canonical source is `petal.tokens.json`, using the published DTCG 2025.10 format. Primitive values feed semantic roles, which feed component defaults. Consumers use semantic and component tokens instead of duplicating raw brand values.

The approved palette and Geist Mono family are retained. New type sizes, spacing, shapes, control states, and motion are an initial implementation baseline for review, with actual-device checks still required. Only the light appearance is defined. Application integration and the remaining U01/L01 acceptance checks are separate work.

## Structure and naming

```text
libs/ui/src/themes/
  petal.tokens.json           # Canonical DTCG-format source
  generated/
    theme.css                # Web/Electron CSS variables
    theme.mjs                # petalTheme / getPetalTheme
    theme.d.mts              # Type declarations for the ESM export
    native-theme.mjs         # petalNativeTheme / getPetalNativeTheme
    native-theme.d.mts       # Native export type declarations
  scripts/
    compile.mjs              # Dependency-free compiler for our documented subset
    build.mjs                # Generate or check exports
    preview.mjs              # Offline HTML specimen/inventory generator
    preview.test.mjs          # Coverage, resource, and variable checks
    tokens.test.mjs          # Reference, conversion, contrast, and drift checks
```

There are three layers. `primitive` holds raw values, `semantic` assigns intent, and `component` gives defaults to common controls. Use semantic or component values in UI code. For example, `semantic.color.text.primary` feeds CSS `--petal-color-text-primary`; `component.button.primary.background` feeds `--petal-component-button-primary-background`. A new app uses this Petal theme, rather than creating app-specific copies. Other appearance modes can be added later; only the light appearance exists now.

The JSON uses DTCG 2025.10 color objects, dimensions, numeric weights, typography composites, and full-token curly-brace references. The compiler implements the subset present in this theme; it does not claim full DTCG tooling conformance. JSON Pointer references, `$extends`, other token types, and non-sRGB color spaces are not supported. See the published [format](https://www.designtokens.org/tr/2025.10/format/) and [color](https://www.designtokens.org/tr/2025.10/color/) reports.

## Baseline values

| Foundation | Initial baseline |
| --- | --- |
| Spacing | 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96 logical units |
| Radii | 0 flat; 8 small; 10 tighter comparison; 12 controls; 16 containers; 24 sheets; 9999 fully rounded |
| Control target | At least 48 × 48 logical units, including icon-only controls |
| Control border | 1 logical unit with `color.border.control` |
| Focus | Rose ring, 2 px width and 2 px offset on web; native integration provides an equivalent visible treatment |
| Layout | Compact gutter 20; wide gutter 32; reading max 720; content max 1200; wide breakpoint 768 |
| Elevation | Flat, level 0; use whitespace and borders rather than decorative shadows |
| Motion | 120 / 180 / 240 ms; easing `(0.2, 0, 0, 1)`; reduced-motion durations 0 |
| Icon measurements | 20 / 24 / 32; outline candidate 1.75 px; final icon family unselected |
| Motion distances | Press scale 0.98; entry offset 8; suppress transforms with reduced motion |

Layout values guide composition; they do not detect a device or force a navigation layout. Token minimum heights are floors, not fixed heights: allow wrapping, multiline content, and large text to increase control size. Keep readable text independent of viewport width. The 48-unit target is Petal's chosen baseline; WCAG 2.2's [minimum target-size criterion](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) has its own thresholds and exceptions.

| Typography role | Size / line height | Weight | Use |
| --- | --- | --- | --- |
| Caption | 12 / 18 | 400 | Optional metadata |
| Label | 14 / 20 | 500 | Labels and short controls |
| Body | 16 / 24 | 400 | Essential instructions and reading |
| Body large | 18 / 28 | 400 | Brief introductory text |
| Title | 20 / 28 | 600 | Section/card titles |
| Heading | 24 / 32 | 600 | Screen headings |
| Display | 32 / 40 | 600 | Brief prominent text |

All roles use Geist Mono, zero added letter spacing, and sentence case. Caption is not for essential instructions. The original variable WOFF2, SIL license, and provenance live in `libs/assets/fonts/geist-mono/`. The preview embeds the font offline. Runtime exports do not register fonts; each app must bundle/register a supported format. Web includes a monospace fallback. Native exports use the family name `Geist Mono`; the app's font adapter must map that to the actual registered family and weights on each target. Keep native font scaling enabled and verify it on actual devices.

The six brand colors are approved and unchanged. The source additionally defines rose hover/pressed shades, decorative/control borders, and error, warning, and save-success feedback colors as initial functional baseline values. Success means a save/export acknowledgement, never health, protection, or adherence. Taken, confirmed-missed, unsure, and no-entry states need explicit wording and distinct icons; the shared status container is neutral. `color.border.subtle` is decorative separation, not an essential input boundary.

The tests check declared normal-text pairs at 4.5:1, and control/focus pairs at 3:1. These calculations do not establish screen accessibility; placement, text scaling, accessible names, target size, and focus behavior still require device checks. See [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

## Web and Electron

After adding `"@petal/ui": "workspace:*"` to the app dependencies and building the shared package, import the CSS:

```ts
import '@petal/ui/theme.css';
```

```css
.primary-action {
  background: var(--petal-component-button-primary-background);
  color: var(--petal-component-button-primary-foreground);
  min-height: var(--petal-component-button-min-height);
  border-radius: var(--petal-component-button-radius);
  padding: var(--petal-component-button-padding-block) var(--petal-component-button-padding-inline);
  font-family: var(--petal-component-button-type-font-family);
  font-size: var(--petal-component-button-type-font-size);
  font-weight: var(--petal-component-button-type-font-weight);
  line-height: var(--petal-component-button-type-line-height);
}
.primary-action:focus-visible {
  outline: var(--petal-focus-width) solid var(--petal-color-focus);
  outline-offset: var(--petal-focus-offset);
}
```

CSS dimensions use `rem` at a 16 px reference size; border/focus/stroke thickness and letter spacing use px. Do not force the user's root font size. `theme.css` defines variables only. The separate `styles.css` export adds original opt-in web specimens from `src/styles/`, without application behavior or external font requests. Its reduced-motion media query zeros all duration tokens, including component aliases. CSS custom properties cannot be used as media-query conditions; use the numeric layout export when building responsive behavior.

```ts
import { petalTheme, getPetalTheme } from '@petal/ui/theme';
const background = petalTheme.semantic.color.background;
const animationTheme = getPetalTheme({ reduceMotion: userPrefersReducedMotion });
```

JavaScript dimensions are logical pixel numbers, durations are milliseconds, and typography `lineHeight` is a multiplier in the web export.

## React Native

```ts
import { petalNativeTheme as theme, getPetalNativeTheme } from '@petal/ui/theme/native';
const bodyStyle = {
  ...theme.semantic.type.body,
  color: theme.semantic.color.text.primary,
};
const buttonStyle = {
  minHeight: theme.component.button.minHeight,
  minWidth: theme.semantic.size.touchTarget,
  borderRadius: theme.component.button.radius,
  paddingHorizontal: theme.component.button.paddingInline,
  paddingVertical: theme.component.button.paddingBlock,
  backgroundColor: theme.component.button.primary.background,
};
const animationTheme = getPetalNativeTheme({ reduceMotion: accessibilityReduceMotion });
```

Native dimensions are density-independent numbers; typography line heights are absolute numbers (Body 24), and font weights are React Native-compatible strings. Components consume individual fields because component defaults also contain colors/states that are not direct native style properties. Motion preference comes from the application's accessibility adapter, not from this platform-independent library. Exports are deeply frozen; reduced-motion helpers return a new frozen theme without mutating defaults. Type declarations keep durations numeric so both normal and zero-duration themes are represented correctly.

## Generate and verify

Run from the repository root with the existing Node.js 22+ runtime; commands work in PowerShell, Git Bash, and zsh:

```sh
pnpm --filter @petal/ui build
pnpm --filter @petal/ui theme:check
pnpm --filter @petal/ui typecheck
pnpm --filter @petal/ui test
```

Edit `petal.tokens.json`, regenerate, and commit source, exports, and `libs/ui/preview.html` together. Specimen layout lives in `scripts/preview.mjs`; shared web styling lives in `src/styles/`. `--check` fails on missing/stale exports or HTML. Preview checks cover every canonical token, embedded rendering resources, and referenced CSS variables. The tests reject missing/cyclic references, mismatched types, malformed values, unsafe keys, and exported-name collisions; check contrast and unit conversions; and prove reduced motion and source/export parity.

Built runtime exports have no package dependencies. The workspace package uses the pinned repository TypeScript toolchain to emit its entry point and declarations, then copies the generated theme exports into `dist/`. Root recursive build, typecheck, and test commands include it. Package checks verify typed imports and runtime resolution from a separate application. Actual Vite/Metro application integration remains with the application owners.
