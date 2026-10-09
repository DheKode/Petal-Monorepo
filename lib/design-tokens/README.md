# Petal design tokens

Shared visual foundations for the mobile, desktop, and landing applications, under U01 / issue #11 and PRD §4. The requesting human assigned this scoped work to Codex. The library lives in `lib/design-tokens/` as requested; it does not introduce an app or workspace dependency.

The canonical source is `petal.tokens.json`, using the published DTCG 2025.10 format. Primitive values feed semantic roles, which feed component defaults. Consumers use semantic and component tokens instead of duplicating raw brand values.

The approved palette and Geist Mono family are retained. New type sizes, spacing, shapes, control states, and motion are an initial implementation baseline for review, with actual-device checks still required. Only the light appearance is defined. Application integration and the remaining U01/L01 acceptance checks are separate work.

Planned exports: CSS custom properties for web/Electron, typed JavaScript values, and React Native style values with numeric dimensions and absolute line heights. Export generation and verification will use Node's standard library without adding dependencies or changing the root manifests/lockfile.
