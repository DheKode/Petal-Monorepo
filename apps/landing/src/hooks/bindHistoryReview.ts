import {reviewSteps} from '../data/historyReview';

// DOM lifecycle binding; returns cleanup for Vite hot reloads.
export function bindHistoryReview(): () => void {
  const cleanups: (() => void)[] = [];
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-review-step]')) {
    const onClick = () => {
      const step = reviewSteps[Number(button.dataset.reviewStep)];
      if (!step) return;
      for (const other of document.querySelectorAll('[data-review-step]')) {
        other.setAttribute('aria-pressed', String(other === button));
      }
      for (const [selector, value] of [
        ['[data-review-label]', step.label], ['[data-review-title]', step.title],
        ['[data-review-copy]', step.copy], ['[data-review-status]', step.status],
      ]) {
        const node = document.querySelector(selector);
        if (node) node.textContent = value;
      }
    };
    button.addEventListener('click', onClick);
    cleanups.push(() => button.removeEventListener('click', onClick));
  }
  return () => cleanups.forEach((cleanup) => cleanup());
}
