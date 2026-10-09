# Shared components

Import from `@petal/ui/components` for web/Electron or `@petal/ui/components/native` for React Native. Both implementations share [props.ts](props.ts), consume the generated theme, and leave records, navigation, and persistence to applications. Web controls require `@petal/ui/styles.css` within a `data-petal-ui` scope.

| Control | Behavior |
| --- | --- |
| Button | Primary, secondary, tertiary, danger; explicit label; disabled and busy states prevent presses; web defaults to `type="button"` |
| TextField | Controlled text or multiline value, visible label, helper/error text, required/disabled states |
| Card | Titled container; optional proposal appearance without an implicit action |
| StatusBadge | Neutral explicit label; no health interpretation or protection signal |
| Feedback | Success/warning/error interface messages with appropriate live announcements |
| SelectionButton | Controlled pressed/selected state with explicit label and disabled state |
| ConfirmDialog | Controlled visibility, proposed content, separate confirm/cancel callbacks, busy and error states |

ConfirmDialog never writes or dismisses itself after confirmation. The app previews the proposed write, performs it only in `onConfirm`, handles errors, and closes after success. Cancellation must leave records unchanged. Web uses the native HTML dialog with initial cancel focus, Escape cancellation, and trigger focus restoration. Native uses Modal, initial accessibility focus, and an Android back callback; the app must verify TalkBack and return focus on the actual screen. Cancellation is blocked while a caller-marked operation is busy; show busy text and finish/reset that state rather than leaving a user trapped indefinitely.

Native text scaling remains enabled and controls have token-based minimum targets rather than fixed heights. TextField is intentionally a plain text primitive: app-specific time/date, input keyboard, medication validation, and selection widgets require their own adapters. Native children must use native primitives, including Text around text content. Native font registration, keyboard avoidance, safe-area measurements, and device accessibility review are application responsibilities.
