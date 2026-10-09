# Shared web styles

Original Petal specimens built from `../themes/petal.tokens.json`. Import `@petal/ui/styles.css`; it includes the generated theme, `base.css`, and `components.css` in that order. Wrap the consuming UI with `data-petal-ui` for base typography, box sizing, and visible focus. Register Geist Mono locally; this stylesheet makes no font or network request.

`petal-button` supports `data-variant="secondary|tertiary|danger"` and native `disabled`. `data-state="hover|pressed|focus"` exists for fixed review specimens. Fields use `petal-field`, `petal-input`, and `petal-help`; attach visible labels and descriptions in application markup. Other specimens include `petal-card`, `petal-proposal`, `petal-status`, `petal-selection`, `petal-tab`, `petal-feedback`, and a native HTML `petal-dialog`.

Selection/navigation examples consume `aria-pressed`; real applications must supply appropriate semantics and behavior for their actual control. Feedback kinds are `success`, `warning`, and `error`, always with readable wording. Neutral record tags do not encode contraceptive protection. Proposals require explicit product confirmation before any write.

Reduced-motion media preferences zero token durations. This file suppresses press transforms; the preview's extra `data-reduce-motion` override can reduce motion further. Native components, keyboard behavior, application persistence, and screen/device accessibility verification are not implemented by these CSS classes.

Edit shared values in the canonical token source. Keep preview-only layout in `src/themes/scripts/preview.mjs`. Do not add copied reference-library styles or app-specific raw brand values here.
