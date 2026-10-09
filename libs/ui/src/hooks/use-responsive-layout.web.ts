import { useSyncExternalStore } from 'react';
import { resolveLayout } from '../utils/layout.js';

function subscribe(update: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('resize', update);
  return () => window.removeEventListener('resize', update);
}
const width = () => typeof window === 'undefined' ? 0 : window.innerWidth;
export function useResponsiveLayout() {
  return resolveLayout(useSyncExternalStore(subscribe, width, () => 0));
}
