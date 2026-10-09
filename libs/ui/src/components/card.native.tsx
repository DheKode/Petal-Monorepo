import { Text, View } from 'react-native';
import { petalNativeTheme as theme } from '../themes/generated/native-theme.mjs';
import type { CardProps } from './props.js';

export function Card({ title, children, variant = 'default', testID }: CardProps) {
  const card = variant === 'proposal' ? theme.component.proposal : theme.component.card;
  return <View testID={testID} style={{ gap: theme.component.card.gap, padding: card.padding,
    borderRadius: card.radius, backgroundColor: card.background, borderColor: card.border,
    borderWidth: theme.semantic.border.width }}>
    {title && <Text accessibilityRole="header" style={[theme.component.card.titleType, { color: card.foreground }]}>{title}</Text>}
    {children}
  </View>;
}
