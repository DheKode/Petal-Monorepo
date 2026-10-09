import { forwardRef } from 'react';
import type { ButtonProps } from './props.js';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { label, onPress, variant = 'primary', disabled = false, busy = false, busyLabel = 'Working…', accessibilityLabel, testID }, ref,
) {
  return <button ref={ref} type="button" className="petal-button" data-variant={variant}
    disabled={disabled || busy} aria-busy={busy || undefined} aria-label={accessibilityLabel}
    data-testid={testID} onClick={onPress}>{busy ? busyLabel : label}</button>;
});
