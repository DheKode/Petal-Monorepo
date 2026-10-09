# UI utilities

Import from `@petal/ui/utils` or the framework-free package root.

- `classNames(...values)` joins nonempty class strings, ignoring false/null/undefined.
- `resolveLayout(width, fontScale?)` returns the token-based compact/wide layout. Nonfinite/negative widths normalize to zero; an invalid font scale normalizes to one.
- `buttonAppearance(variant, disabled?, pressed?)` resolves native-ready button colors from generated tokens. Disabled colors take precedence over pressed styling.

These helpers do not import React or React Native, duplicate raw token values, or implement domain/clinical rules. Shared domain logic belongs in `packages/`.
