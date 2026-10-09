import type { SelectionButtonProps } from './props.js';

export function SelectionButton({ label, selected, onPress, disabled, testID }: SelectionButtonProps) {
  return <button type="button" className="petal-selection" aria-pressed={selected}
    disabled={disabled} onClick={onPress} data-testid={testID}>{label}</button>;
}
