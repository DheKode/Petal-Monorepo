import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
function subscribe(update: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const media = window.matchMedia(query);
  media.addEventListener('change', update);
  return () => media.removeEventListener('change', update);
}
function snapshot() {
  return typeof window === 'undefined' || !window.matchMedia ? true : window.matchMedia(query).matches;
}
export function useReducedMotion() {
  return useSyncExternalStore(subscribe, snapshot, () => true);
}
