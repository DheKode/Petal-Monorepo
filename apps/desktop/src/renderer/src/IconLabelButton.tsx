import { Icon, type IconName } from '@petal/ui/icons';

/** A shared-theme button with a leading icon and a visible text label. The icon is decorative because the label names the action. */
export function IconLabelButton({ icon, label, onPress, variant, disabled, expanded, submit }: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  variant?: 'secondary' | 'tertiary';
  disabled?: boolean;
  expanded?: boolean;
  submit?: boolean;
}) {
  return (
    <button
      type={submit ? 'submit' : 'button'}
      className="petal-button"
      data-variant={variant}
      disabled={disabled}
      aria-expanded={expanded}
      onClick={onPress}
    >
      <Icon name={icon} size="small" />
      {label}
    </button>
  );
}
