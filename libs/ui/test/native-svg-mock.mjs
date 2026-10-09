// Renders real Lucide geometry into host SVG tags; never a native-device test.
import { createElement, forwardRef } from 'react';
const host = tag => forwardRef(function SvgHost({ children, accessible, testID, ...props }, ref) {
  return createElement(tag, { ...props, ref, 'data-accessible': accessible, 'data-testid': testID }, children);
});
export const Svg = host('svg');
export const Path = host('path');
export const Circle = host('circle');
export const Line = host('line');
export const Rect = host('rect');
export const Ellipse = host('ellipse');
export const Polygon = host('polygon');
export const Polyline = host('polyline');
export const G = host('g');
