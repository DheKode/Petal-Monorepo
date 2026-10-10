import React from 'react';
import { petalNativeTheme as theme } from '@petal/ui/theme/native';
import { PetalCircleIcon, PetalLogoHorizontal } from './PetalBrand.js';

interface PetalHeaderProps {
  onReset?: () => void;
  showPrivacyBadge?: boolean;
}

export function PetalHeader({ showPrivacyBadge = true }: PetalHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'max(12px, env(safe-area-inset-top, 12px)) 16px 12px',
        backgroundColor: theme.semantic.color.surface,
        borderBottom: `1px solid ${theme.primitive.color.borderSubtle}`,
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <PetalCircleIcon size={32} />

        <div>
          <PetalLogoHorizontal height={20} />
          <span
            style={{
              display: 'block',
              fontSize: 10,
              fontFamily: theme.primitive.font.family,
              color: theme.primitive.color.mutedPlum,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginTop: 1,
            }}
          >
            Trust 28 Companion
          </span>
        </div>
      </div>

      {showPrivacyBadge && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: theme.primitive.radius.round,
            backgroundColor: theme.primitive.color.successSurface,
            border: `1px solid ${theme.primitive.color.borderSubtle}`,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: theme.primitive.color.success,
              display: 'inline-block',
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontFamily: theme.primitive.font.family,
              fontWeight: 500,
              color: theme.primitive.color.success,
            }}
          >
            100% Offline
          </span>
        </div>
      )}
    </header>
  );
}
