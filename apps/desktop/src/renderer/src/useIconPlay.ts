import { useRef } from 'react';
import type { IconHandle } from '@petal/ui/icons';

/** Plays the icon's finite micro-animation on hover, keyboard focus and press, and stops it on leave and blur. The shared Icon
    already skips playback when the OS asks for reduced motion, so this never overrides that preference. */
export function useIconPlay(disabled = false) {
  const icon = useRef<IconHandle>(null);
  const start = () => { if (!disabled) icon.current?.startAnimation(); };
  const stop = () => icon.current?.stopAnimation();
  return { icon, handlers: { onMouseEnter: start, onMouseLeave: stop, onFocus: start, onBlur: stop } };
}
