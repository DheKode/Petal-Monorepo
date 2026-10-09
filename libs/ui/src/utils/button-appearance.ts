import { petalNativeTheme } from '../themes/generated/native-theme.mjs';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger';

export function buttonAppearance(variant: ButtonVariant, disabled = false, pressed = false) {
  const button = petalNativeTheme.component.button;
  if (disabled) return { ...button.disabled, border: 'transparent' };
  if (variant === 'secondary') return {
    background: pressed ? button.secondary.pressed : button.secondary.background,
    foreground: button.secondary.foreground, border: button.secondary.border,
  };
  if (variant === 'tertiary') return {
    background: pressed ? button.tertiary.hover : button.tertiary.background,
    foreground: button.tertiary.foreground, border: 'transparent',
  };
  if (variant === 'danger') return { ...button.danger, border: 'transparent' };
  return {
    background: pressed ? button.primary.pressed : button.primary.background,
    foreground: button.primary.foreground, border: 'transparent',
  };
}
