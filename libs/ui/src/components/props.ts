import type { ReactNode } from 'react';
import type { ButtonVariant } from '../utils/button-appearance.js';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  busy?: boolean;
  busyLabel?: string;
  accessibilityLabel?: string;
  testID?: string;
}

export interface TextFieldProps {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  errorText?: string;
  disabled?: boolean;
  required?: boolean;
  multiline?: boolean;
  id?: string;
  testID?: string;
}

export interface CardProps {
  title?: string;
  children: ReactNode;
  variant?: 'default' | 'proposal';
  testID?: string;
}

export interface StatusBadgeProps { label: string; testID?: string }
export interface FeedbackProps {
  kind: 'success' | 'warning' | 'error';
  message: string;
  testID?: string;
}
export interface SelectionButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  busyLabel?: string;
  errorText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}
