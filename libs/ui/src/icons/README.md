# Shared icons

Petal uses 24 Lucide symbols through AnimateIcons on web/Electron and Lucide React Native on Android. The wrappers apply Petal’s tokens and interaction rules; the glyph artwork comes from upstream, with [license notices](THIRD_PARTY_NOTICES.md). The framework-free [catalog](catalog.ts) holds names and neutral labels.

```tsx
import { Icon, IconButton } from '@petal/ui/icons';
import '@petal/ui/styles.css';

<Icon name="calendar" />; // Decorative beside a visible label.
<Icon name="calendar" decorative={false} label="Schedule" size="large" />;
<IconButton name="edit" label="Edit entry" onPress={openEditor} />;
```

Web applications supply React and `@animateicons/react@0.12.0`. Native applications use `@petal/ui/icons/native` (or the `react-native` export condition) and supply React Native, `lucide-react-native@1.52.0`, and `react-native-svg@15.15.5`. Add these dependencies to the consuming application so native SVG can autolink, then rebuild its binary. Package development dependencies alone do not integrate an Android application. No application manifest is changed here.

## Appearance and meaning

`size` accepts `small`, `default`, or `large` for the shared 20/24/32-unit slots. Web non-scaling strokes and native `absoluteStrokeWidth` preserve the 1.75-unit physical outline. Web color inherits; native color defaults to primary text. IconButton derives its colors, 48-unit minimum target, radius, focus treatment, and disabled appearance from shared tokens.

Decorative is the default and hides the icon from accessibility. `decorative={false}` requires a meaningful `label`. IconButton always requires an action label; busy/disabled buttons block interaction. Pair `taken`, `missed`, `unsure`, and `no-entry` with explicit wording. Icons never indicate contraceptive protection or substitute for clinical guidance.

## Motion

Icons stay still at rest. IconButton plays finite feedback on focus, hover (web), or press. A standalone Icon exposes `startAnimation()` and `stopAnimation()` through `IconHandle` for deliberate application events. `animate={false}`, `reduceMotion={true}`, or the system’s reduced-motion preference suppresses playback; preference changes stop active playback. Server rendering and unknown native preference start conservatively without motion.

Web uses upstream path animations with the normal-duration token as a speed multiplier; exact clip lengths vary. Native uses a finite token-timed 0.98 scale pulse with the same glyph family, rather than identical path choreography. No automatic looping is introduced.

## Review and integration

Run `pnpm --filter @petal/ui preview:components` to review all actual web icons, sizes, action states, and the app-level reduced-motion toggle at http://127.0.0.1:4179/. The generated standalone token HTML remains a token inventory, not a bundled React icon gallery.

Tests render actual vectors on both platforms, check labels/targets/stroke scaling, and verify platform-separated imports. Native hosts and SVG rendering are explicitly mocked. Metro bundling, Android rendering, TalkBack, and device motion require app-owner verification. Include `@petal/ui/icons/notices` with distributed artwork; per-icon imports avoid importing the whole upstream catalog.
