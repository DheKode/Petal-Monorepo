import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Conservative until the native preference is known; failures keep motion off. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true, receivedEvent = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      receivedEvent = true;
      if (active) setReduced(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active && !receivedEvent) setReduced(value);
    }).catch(() => {});
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}
