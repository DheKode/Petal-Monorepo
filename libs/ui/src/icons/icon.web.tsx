import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { petalTheme as theme } from '../themes/generated/theme.mjs';
import { useReducedMotion } from '../hooks/use-reduced-motion.web.js';
import { webGlyphs } from './web-glyphs.js';
import type { IconHandle, IconProps } from './props.js';

export const Icon = forwardRef<IconHandle, IconProps>(function Icon(
  { name, size = 'default', color, decorative = true, label, animate = true, reduceMotion = false, testID }, ref,
) {
  const systemReduced = useReducedMotion();
  const canAnimate = animate && !reduceMotion && !systemReduced;
  const glyph = useRef<IconHandle>(null);
  useImperativeHandle(ref, () => ({
    startAnimation() { if (canAnimate) glyph.current?.startAnimation(); },
    stopAnimation() { glyph.current?.stopAnimation(); },
  }), [canAnimate]);
  useEffect(() => { if (!canAnimate) glyph.current?.stopAnimation(); }, [canAnimate]);
  const Glyph = webGlyphs[name];
  return <div className="petal-icon" data-icon={name} data-animated={canAnimate} data-testid={testID}
    role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined}
    aria-label={decorative ? undefined : label} style={{ color }}>
    <Glyph ref={glyph} size={theme.semantic.icon.size[size]} isAnimated={false} aria-hidden="true"
      duration={theme.primitive.duration.normal / 1000} />
  </div>;
});
