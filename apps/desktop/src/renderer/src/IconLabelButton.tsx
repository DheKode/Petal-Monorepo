import { Icon, type IconName } from '@petal/ui/icons';
import { useIconPlay } from './useIconPlay';

/** A shared-theme button with a leading icon and a visible text label. The icon is decorative because the label names the action.
    The icon plays its micro-animation on hover, focus and press (AnimateIcons through @petal/ui). */
export function IconLabelButton({ icon, label, onPress, variant, disabled, expanded, submit }: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  variant?: 'secondary' | 'tertiary';
  disabled?: boolean;
  expanded?: boolean;
  submit?: boolean;
}) {
  const play = useIconPlay(disabled);
  return (
    <button
      type={submit ? 'submit' : 'button'}
      className="petal-button"
      data-variant={variant}
      disabled={disabled}
      aria-expanded={expanded}
      onClick={() => { play.icon.current?.startAnimation(); onPress?.(); }}
      {...play.handlers}
    >
      <Icon ref={play.icon} name={icon} size="small" />
      {label}
    </button>
  );
}
