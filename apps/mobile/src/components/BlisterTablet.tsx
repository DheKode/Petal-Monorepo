import React from 'react';
import { petalNativeTheme as theme } from '@petal/ui/theme/native';
import { Icon } from '@petal/ui/icons';
import type { IntakeState, ScheduledDose } from '@petal/domain';

interface BlisterTabletProps {
  dose: ScheduledDose;
  status: IntakeState;
  isToday: boolean;
  isSelected: boolean;
  onSelect: (dose: ScheduledDose) => void;
}

export function BlisterTablet({ dose, status, isToday, isSelected, onSelect }: BlisterTabletProps) {
  const isActive = dose.position <= 21;
  const isBrown = !isActive;

  // Determine pill appearance based on active vs brown and intake status
  let pillBg: string = '#FFFFFF';
  let pillBorder: string = theme.primitive.color.borderControl;
  let labelColor: string = theme.primitive.color.plum;

  if (isBrown) {
    pillBg = '#EFE6DE';
    pillBorder = '#9A7B66';
  }

  if (status === 'taken') {
    pillBg = theme.primitive.color.rose;
    pillBorder = theme.primitive.color.rose;
    labelColor = '#FFFFFF';
  } else if (status === 'confirmed-missed') {
    pillBg = theme.primitive.color.errorSurface;
    pillBorder = theme.primitive.color.error;
    labelColor = theme.primitive.color.error;
  } else if (status === 'unsure') {
    pillBg = theme.primitive.color.warningSurface;
    pillBorder = theme.primitive.color.warning;
    labelColor = theme.primitive.color.warning;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(dose)}
      aria-label={`Tablet ${dose.position}, ${isActive ? 'Active' : 'Brown non-hormonal'}, status: ${status}${isToday ? ', due today' : ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3px 2px',
        margin: '1px 0',
        background: isSelected ? theme.primitive.color.blush : 'transparent',
        borderRadius: 8,
        border: isSelected ? `2px solid ${theme.primitive.color.rose}` : '2px solid transparent',
        cursor: 'pointer',
        position: 'relative',
        width: '100%',
        minWidth: 0,
        maxWidth: 42,
        boxSizing: 'border-box',
        outline: 'none',
      }}
    >
      {/* Pill shape representation */}
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          backgroundColor: pillBg,
          border: `2px solid ${pillBorder}`,
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(51, 37, 45, 0.08)',
          position: 'relative',
        }}
      >
        {status === 'taken' ? (
          <Icon name="taken" size="small" color="#FFFFFF" decorative />
        ) : status === 'confirmed-missed' ? (
          <Icon name="missed" size="small" color={theme.primitive.color.error} decorative />
        ) : status === 'unsure' ? (
          <Icon name="unsure" size="small" color={theme.primitive.color.warning} decorative />
        ) : (
          <span
            style={{
              fontFamily: theme.primitive.font.family,
              fontSize: 12,
              fontWeight: 600,
              color: isBrown ? '#7C5B45' : labelColor,
              lineHeight: '1',
            }}
          >
            {dose.position}
          </span>
        )}

        {/* Indicator dot for today's dose */}
        {isToday && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: theme.primitive.color.rose,
              border: '1.5px solid #FFFFFF',
              boxShadow: '0 1px 2px rgba(51, 37, 45, 0.2)',
            }}
          />
        )}
      </div>

      {/* Week position or tablet label */}
      <span
        style={{
          marginTop: 4,
          fontSize: 9,
          fontFamily: theme.primitive.font.family,
          fontWeight: 600,
          color: isBrown ? '#8B6A56' : theme.primitive.color.mutedPlum,
          textTransform: 'uppercase',
          letterSpacing: 0.2,
        }}
      >
        {isBrown ? 'BROWN' : `D${dose.position}`}
      </span>
    </button>
  );
}
