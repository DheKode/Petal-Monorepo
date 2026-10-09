import { useRef } from 'react';
import { AccessibilityInfo, Modal, ScrollView, Text, View } from 'react-native';
import { petalNativeTheme as theme } from '../themes/generated/native-theme.mjs';
import type { ConfirmDialogProps } from './props.js';
import { Button } from './button.native.js';
import { Feedback } from './feedback.native.js';

export function ConfirmDialog({ open, title, description, children, confirmLabel, cancelLabel = 'Cancel',
  busy = false, busyLabel, errorText, onConfirm, onCancel, testID }: ConfirmDialogProps) {
  const cancel = useRef<View>(null);
  const dialog = theme.component.dialog;
  return <Modal visible={open} transparent animationType="none" onRequestClose={() => { if (!busy) onCancel(); }}
    onShow={() => { if (cancel.current) AccessibilityInfo.sendAccessibilityEvent(cancel.current, 'focus'); }}>
    <View style={{ flex: 1, justifyContent: 'center', padding: theme.semantic.layout.gutterCompact, backgroundColor: dialog.backdrop }}>
      <View testID={testID} accessibilityViewIsModal style={{ maxHeight: '100%', width: '100%', maxWidth: dialog.maxWidth,
        alignSelf: 'center', borderRadius: dialog.radius, backgroundColor: dialog.background,
        borderWidth: theme.semantic.border.width, borderColor: dialog.border, overflow: 'hidden' }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: dialog.padding, gap: dialog.gap }}>
          <Text accessibilityRole="header" style={[theme.semantic.type.title, { color: dialog.foreground }]}>{title}</Text>
          <Text style={[theme.semantic.type.body, { color: dialog.foreground }]}>{description}</Text>
          {children}{errorText && <Feedback kind="error" message={errorText} />}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.semantic.space.related }}>
            <Button ref={cancel} label={cancelLabel} variant="secondary" disabled={busy} onPress={onCancel} />
            <Button label={confirmLabel} busy={busy} busyLabel={busyLabel} onPress={onConfirm} />
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
