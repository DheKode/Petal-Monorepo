# Shared UI

This is the human-approved home for UI code reused across Petal applications.

| Folder | Responsibility |
| --- | --- |
| `themes/` | Shared appearance values and their platform exports; [Petal theme](themes/README.md) |
| `components/` | Future reusable visual controls, with platform-specific implementations where necessary |
| `hooks/` | Future reusable UI behavior hooks |
| `layouts/` | Future reusable screen and page arrangements |
| `utils/` | Future helpers that specifically support the UI |

The non-theme folders are reserved placeholders. This token task introduces no component, hook, or layout implementation. Shared domain contracts and other versioned workspace packages stay in `packages/`. Static assets live in `libs/assets/`.

`libs/ui` is source layout, not a registered pnpm workspace package. Consumers can use relative imports now. App owners should coordinate package exports, Metro/Vite resolution, native font registration, and dependency boundaries before adding a workspace package or aliases. Existing root manifests and lockfiles are unchanged.
