import { forwardRef, useRef, useState } from 'react';
import { Pressable, type View } from 'react-native';
import { petalNativeTheme as theme } from '../themes/generated/native-theme.mjs';
import { buttonAppearance } from '../utils/button-appearance.js';
import { Icon } from './icon.native.js';
import type { IconButtonProps, IconHandle } from './props.js';

export const IconButton = forwardRef<View, IconButtonProps>(function IconButton(
  { name, size, label, accessibilityLabel, onPress, variant = 'secondary', disabled = false, busy = false,
    busyLabel = 'Working…', animate = true, reduceMotion = false, testID }, ref,
) {
  const icon = useRef<IconHandle>(null);
  const [focused, setFocused] = useState(false);
  const blocked = disabled || busy;
  return <Pressable ref={ref} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? (busy ? busyLabel : label)}
    accessibilityState={{ disabled: blocked, busy }} disabled={blocked} testID={testID}
    onFocus={() => { setFocused(true); if (!blocked) icon.current?.startAnimation(); }}
    onBlur={() => { setFocused(false); icon.current?.stopAnimation(); }}
    onPressIn={() => { if (!blocked) icon.current?.startAnimation(); }} onPressOut={() => icon.current?.stopAnimation()}
    onPress={() => { if (!blocked) { icon.current?.startAnimation(); onPress?.(); } }}
    style={({ pressed }) => {
      const appearance = buttonAppearance(variant, blocked, pressed);
      return { minHeight: theme.semantic.size.touchTarget, minWidth: theme.semantic.size.touchTarget,
        borderRadius: theme.component.button.radius, alignItems: 'center', justifyContent: 'center',
        borderWidth: focused ? theme.semantic.focus.width : theme.component.button.borderWidth,
        borderColor: focused ? theme.semantic.color.focus : appearance.border, backgroundColor: appearance.background };
    }}>
    {({ pressed }) => <Icon ref={icon} name={name} size={size}
      color={buttonAppearance(variant, blocked, pressed).foreground} animate={animate && !blocked} reduceMotion={reduceMotion} />}
  </Pressable>;
});
