import type { StatusBadgeProps } from './props.js';

export function StatusBadge({ label, testID }: StatusBadgeProps) {
  return <span className="petal-status" data-testid={testID}>{label}</span>;
}
