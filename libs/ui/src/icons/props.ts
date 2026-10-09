import type { ButtonProps } from '../components/props.js';
import type { IconName } from './catalog.js';

export type IconSize = 'small' | 'default' | 'large';
export interface IconHandle {
  startAnimation(): void;
  stopAnimation(): void;
}
export interface IconOptions {
  name: IconName;
  size?: IconSize;
  /** Enables finite, explicit playback through the ref or IconButton interaction. */
  animate?: boolean;
  /** Can further reduce motion; false never overrides the OS preference. */
  reduceMotion?: boolean;
  testID?: string;
}
export type IconProps = IconOptions & { color?: string } & (
  { decorative?: true; label?: never } | { decorative: false; label: string }
);
export interface IconButtonProps extends IconOptions, ButtonProps {}
