import { forwardRef, useState } from 'react';
import { Pressable, Text, type View } from 'react-native';
import { petalNativeTheme as theme } from '../themes/generated/native-theme.mjs';
import { buttonAppearance } from '../utils/button-appearance.js';
import { useReducedMotion } from '../hooks/use-reduced-motion.native.js';
import type { ButtonProps } from './props.js';

export const Button = forwardRef<View, ButtonProps>(function Button(
  { label, onPress, variant = 'primary', disabled = false, busy = false, busyLabel = 'Working…', accessibilityLabel, testID }, ref,
) {
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();
  const blocked = disabled || busy;
  const button = theme.component.button;
  return <Pressable ref={ref} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? (busy ? busyLabel : label)}
    accessibilityState={{ disabled: blocked, busy }} disabled={blocked} onPress={onPress} testID={testID}
    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    style={({ pressed }) => {
      const appearance = buttonAppearance(variant, blocked, pressed);
      return {
        minHeight: button.minHeight, minWidth: theme.semantic.size.touchTarget, maxWidth: '100%', borderRadius: button.radius,
        paddingHorizontal: button.paddingInline, paddingVertical: button.paddingBlock,
        borderWidth: focused ? button.focusWidth : button.borderWidth,
        borderColor: focused ? theme.semantic.color.focus : appearance.border,
        backgroundColor: appearance.background, alignItems: 'center', justifyContent: 'center',
        transform: [{ scale: !blocked && pressed && !reduced ? button.pressScale : 1 }],
      };
    }}>
    {({ pressed }) => <Text style={[button.type, { color: buttonAppearance(variant, blocked, pressed).foreground, textAlign: 'center' }]}>
      {busy ? busyLabel : label}
    </Text>}
  </Pressable>;
});
