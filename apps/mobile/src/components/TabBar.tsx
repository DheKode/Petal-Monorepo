import React from 'react';
import { petalNativeTheme as theme } from '@petal/ui/theme/native';
import { Icon } from '@petal/ui/icons';
import type { TabId } from '../types/state.js';

interface TabBarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  unresolvedCount?: number;
}

interface TabItem {
  id: TabId;
  label: string;
  iconName: 'home' | 'pill' | 'chat' | 'journal' | 'settings';
  showDot?: boolean;
}

export function TabBar({ activeTab, onSelectTab, unresolvedCount = 0 }: TabBarProps) {
  const tabs: TabItem[] = [
    { id: 'today', label: 'Today', iconName: 'home' },
    { id: 'pack', label: 'Pack', iconName: 'pill' },
    { id: 'clarify', label: 'Clarify', iconName: 'chat', showDot: unresolvedCount > 0 },
    { id: 'bleeding', label: 'Journal', iconName: 'journal' },
    { id: 'settings', label: 'Settings', iconName: 'settings' },
  ];

  return (
    <nav
      aria-label="App Navigation"
      style={{
        flexShrink: 0,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: theme.semantic.color.surface,
        borderTop: `1px solid ${theme.primitive.color.borderSubtle}`,
        padding: '6px 4px max(8px, env(safe-area-inset-bottom, 8px))',
        zIndex: 30,
        boxShadow: '0 -2px 8px rgba(51, 37, 45, 0.04)',
      }}
    >
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        const color = isActive ? theme.primitive.color.rose : theme.primitive.color.mutedPlum;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              minHeight: theme.semantic.size.touchTarget,
              padding: '4px 2px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              position: 'relative',
              borderRadius: theme.primitive.radius.control,
              transition: 'background-color 0.15s ease',
            }}
          >
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 28,
                borderRadius: theme.primitive.radius.round,
                backgroundColor: isActive ? theme.primitive.color.blush : 'transparent',
              }}
            >
              <Icon name={tab.iconName} size="small" color={color} decorative />
              {tab.showDot && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    right: 4,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: theme.primitive.color.rose,
                    boxShadow: '0 0 0 1.5px #FFFFFF',
                  }}
                />
              )}
            </div>
            <span
              style={{
                fontSize: 11,
                fontFamily: theme.primitive.font.family,
                fontWeight: isActive ? 600 : 500,
                color,
                letterSpacing: -0.2,
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
