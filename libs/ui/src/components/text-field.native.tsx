import { forwardRef, useId, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { petalNativeTheme as theme } from '../themes/generated/native-theme.mjs';
import type { TextFieldProps } from './props.js';

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, value, onValueChange, placeholder, helperText, errorText, disabled, required, multiline, id, testID }, ref,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  const [focused, setFocused] = useState(false);
  const field = theme.component.field;
  return <View style={{ gap: field.gap }}>
    <Text nativeID={fieldId + '-label'} style={[field.labelType, { color: theme.semantic.color.text.primary }]}>
      {label}{required ? ' (required)' : ''}
    </Text>
    <TextInput ref={ref} nativeID={fieldId} testID={testID} value={value} onChangeText={onValueChange}
      placeholder={placeholder} placeholderTextColor={field.placeholder} editable={!disabled} multiline={multiline}
      accessibilityLabel={label + (required ? ', required' : '')}
      accessibilityHint={[helperText, errorText].filter(Boolean).join('. ') || undefined}
      accessibilityState={{ disabled: !!disabled }}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={[field.type, {
        minHeight: field.minHeight, borderRadius: field.radius,
        paddingHorizontal: field.paddingInline, paddingVertical: field.paddingBlock,
        borderWidth: focused ? theme.semantic.focus.width : field.borderWidth,
        borderColor: errorText ? field.errorBorder : focused ? field.focusBorder : field.border,
        backgroundColor: disabled ? field.disabledBackground : field.background,
        color: disabled ? field.disabledForeground : field.foreground,
        textAlignVertical: multiline ? 'top' : 'center',
      }]} />
    {helperText && <Text style={[field.helperType, { color: theme.semantic.color.text.secondary }]}>{helperText}</Text>}
    {errorText && <Text accessibilityLiveRegion="polite" style={[field.helperType, { color: theme.semantic.color.feedback.error.text }]}>{errorText}</Text>}
  </View>;
});
