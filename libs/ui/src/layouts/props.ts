import type { ReactNode } from 'react';
import type { Insets, Space } from '../utils/layout.js';

export interface StackProps {
  children: ReactNode;
  space?: Space;
  direction?: 'row' | 'column';
  wrap?: boolean;
  testID?: string;
}
export interface ScreenProps {
  children: ReactNode;
  title?: string;
  description?: string;
  footer?: ReactNode;
  width?: 'reading' | 'content';
  /** Supply measured native safe-area insets from the app's platform adapter. */
  insets?: Insets;
  testID?: string;
}
