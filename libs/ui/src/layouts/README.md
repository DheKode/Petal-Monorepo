# Shared layouts

Use `@petal/ui/layouts` for web or `@petal/ui/layouts/native` for React Native.

`Stack` arranges children with semantic `space` (`inline`, `related`, `group`, `section`, `page`), a row/column direction, and optional wrapping. Use wrapping rows for actions and short selections so larger text can reflow.

`Screen` provides a title, description, children, footer, reading/content width, and token-based responsive gutters. Web renders a main landmark and supplies the styling scope. Native renders a ScrollView with a centered content container; it accounts for font scale through the shared layout hook and accepts measured `{top, right, bottom, left}` safe-area `insets` from the consuming app. Insets are native-only; web safe-area/navigation behavior belongs to its app shell.

Layouts are composition primitives, not navigation shells. Provide native Text children, register Geist Sans as `Geist`, and verify safe areas, keyboard avoidance, screen-reader order, and enlarged text on a device. Do not nest Screen within another screen-sized scroll container without reviewing the resulting behavior.
