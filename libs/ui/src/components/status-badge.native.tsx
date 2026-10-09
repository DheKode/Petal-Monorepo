import { Text, View } from 'react-native';
import { petalNativeTheme as theme } from '../themes/generated/native-theme.mjs';
import type { StatusBadgeProps } from './props.js';

export function StatusBadge({ label, testID }: StatusBadgeProps) {
  const status = theme.component.status;
  return <View testID={testID} style={{ alignSelf: 'flex-start', borderRadius: status.radius, backgroundColor: status.background,
    paddingHorizontal: status.paddingInline, paddingVertical: status.paddingBlock, maxWidth: '100%' }}>
    <Text style={[status.type, { color: status.foreground }]}>{label}</Text>
  </View>;
}
