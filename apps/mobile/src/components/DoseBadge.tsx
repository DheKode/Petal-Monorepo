import React from 'react';
import { petalNativeTheme as theme } from '@petal/ui/theme/native';
import { Icon } from '@petal/ui/icons';
import type { IntakeState } from '@petal/domain';

interface DoseBadgeProps {
  status: IntakeState;
  showIcon?: boolean;
}

export function DoseBadge({ status, showIcon = true }: DoseBadgeProps) {
  let label = 'No entry';
  let iconName: 'taken' | 'missed' | 'unsure' | 'no-entry' = 'no-entry';
  let bg: string = theme.primitive.color.softWhite;
  let fg: string = theme.primitive.color.mutedPlum;
  let border: string = theme.primitive.color.borderSubtle;

  if (status === 'taken') {
    label = 'Taken';
    iconName = 'taken';
    bg = theme.primitive.color.successSurface;
    fg = theme.primitive.color.success;
    border = theme.primitive.color.success;
  } else if (status === 'confirmed-missed') {
    label = 'Confirmed missed';
    iconName = 'missed';
    bg = theme.primitive.color.errorSurface;
    fg = theme.primitive.color.error;
    border = theme.primitive.color.error;
  } else if (status === 'unsure') {
    label = 'Unsure';
    iconName = 'unsure';
    bg = theme.primitive.color.warningSurface;
    fg = theme.primitive.color.warning;
    border = theme.primitive.color.warning;
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: theme.primitive.radius.round,
        backgroundColor: bg,
        color: fg,
        border: `1px solid ${border}`,
        fontSize: 11.5,
        fontFamily: theme.primitive.font.family,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        lineHeight: '16px',
      }}
    >
      {showIcon && <Icon name={iconName} size="small" color={fg} decorative />}
      <span style={{ whiteSpace: 'nowrap' }}>{label}</span>
    </span>
  );
}
