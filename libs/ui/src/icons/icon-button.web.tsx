import { forwardRef, useRef } from 'react';
import { Icon } from './icon.web.js';
import type { IconButtonProps, IconHandle } from './props.js';

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { name, size, label, accessibilityLabel, onPress, variant = 'secondary', disabled = false, busy = false,
    busyLabel = 'Working…', animate = true, reduceMotion = false, testID }, ref,
) {
  const icon = useRef<IconHandle>(null);
  const blocked = disabled || busy;
  const accessibleLabel = accessibilityLabel ?? (busy ? busyLabel : label);
  return <button ref={ref} type="button" className="petal-button petal-icon-button" data-variant={variant}
    disabled={blocked} aria-label={accessibleLabel} title={accessibleLabel} aria-busy={busy || undefined} data-testid={testID}
    onMouseEnter={() => { if (!blocked) icon.current?.startAnimation(); }} onMouseLeave={() => icon.current?.stopAnimation()}
    onFocus={() => { if (!blocked) icon.current?.startAnimation(); }} onBlur={() => icon.current?.stopAnimation()}
    onClick={() => { if (!blocked) { icon.current?.startAnimation(); onPress?.(); } }}>
    <Icon ref={icon} name={name} size={size} animate={animate && !blocked} reduceMotion={reduceMotion} />
  </button>;
});
