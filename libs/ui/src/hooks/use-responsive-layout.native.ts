import { useWindowDimensions } from 'react-native';
import { resolveLayout } from '../utils/layout.js';

export function useResponsiveLayout() {
  const { width, fontScale } = useWindowDimensions();
  return resolveLayout(width, fontScale);
}
