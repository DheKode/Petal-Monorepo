import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { petalNativeTheme as theme } from '../themes/generated/native-theme.mjs';
import { useReducedMotion } from '../hooks/use-reduced-motion.native.js';
import { nativeGlyphs } from './native-glyphs.js';
import type { IconHandle, IconProps } from './props.js';

export const Icon = forwardRef<IconHandle, IconProps>(function Icon(
  { name, size = 'default', color = theme.semantic.color.text.primary, decorative = true, label,
    animate = true, reduceMotion = false, testID }, ref,
) {
  const systemReduced = useReducedMotion();
  const canAnimate = animate && !reduceMotion && !systemReduced;
  const scale = useRef(new Animated.Value(1));
  const playback = useRef<Animated.CompositeAnimation | null>(null);
  const stop = () => { playback.current?.stop(); scale.current.setValue(1); };
  useImperativeHandle(ref, () => ({
    startAnimation() {
      stop();
      if (!canAnimate) return;
      const config = { duration: theme.primitive.duration.normal / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true };
      playback.current = Animated.sequence([
        Animated.timing(scale.current, { ...config, toValue: theme.semantic.motion.pressScale }),
        Animated.timing(scale.current, { ...config, toValue: 1 }),
      ]);
      playback.current.start();
    },
    stopAnimation: stop,
  }), [canAnimate]);
  useEffect(() => { if (!canAnimate) stop(); return stop; }, [canAnimate]);
  const dimension = theme.semantic.icon.size[size];
  const Glyph = nativeGlyphs[name];
  return <Animated.View testID={testID} accessible={!decorative} pointerEvents="none"
    accessibilityRole={decorative ? undefined : 'image'} accessibilityLabel={decorative ? undefined : label}
    accessibilityElementsHidden={decorative} importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
    style={{ width: dimension, height: dimension, transform: [{ scale: scale.current }] }}>
    <Glyph size={dimension} color={color} strokeWidth={theme.semantic.icon.strokeWidth} absoluteStrokeWidth accessible={false} />
  </Animated.View>;
});
