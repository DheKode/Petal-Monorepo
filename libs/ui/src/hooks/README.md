# Shared UI hooks

Use `@petal/ui/hooks` for web or `@petal/ui/hooks/native` for React Native.

- `useDisclosure(initialOpen?)` returns `isOpen`, `open`, `close`, and `toggle`. It manages visibility only and does not confirm or perform writes.
- `useReducedMotion()` follows the web media preference or native AccessibilityInfo setting and cleans up subscriptions. Server rendering, unavailable preferences, and pending native preference reads conservatively reduce motion. Native initial-read results cannot overwrite a newer preference event.
- `useResponsiveLayout()` returns `isWide`, `gutter`, `readingMax`, and `contentMax` from shared tokens. Web observes viewport resize; native observes window dimensions and font scale, choosing the compact composition when scaled text needs more space.

Hooks do not persist preferences, request permissions, or read health data. Actual native preference events and screen-reader behavior require device checks. Platform imports keep DOM APIs out of native code and native APIs out of web code.
