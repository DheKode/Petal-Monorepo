import { Pressable, Text } from 'react-native';
import { petalNativeTheme as theme } from '../themes/generated/native-theme.mjs';
import type { SelectionButtonProps } from './props.js';

export function SelectionButton({ label, selected, onPress, disabled, testID }: SelectionButtonProps) {
  const selection = theme.component.selection;
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ selected, disabled: !!disabled }} onPress={onPress} disabled={disabled} testID={testID}
    style={{ minHeight: selection.minTarget, minWidth: selection.minTarget, maxWidth: '100%', borderRadius: selection.radius,
      padding: theme.semantic.space.inline, justifyContent: 'center', alignItems: 'center',
      borderWidth: theme.semantic.border.width, borderColor: selection.border,
      backgroundColor: disabled ? theme.semantic.color.action.disabled : selected ? selection.selectedBackground : selection.background }}>
    <Text style={[theme.semantic.type.label, { textAlign: 'center', color: disabled ? theme.semantic.color.action.disabledText : selected ? selection.selectedForeground : selection.foreground }]}>{label}</Text>
  </Pressable>;
}
