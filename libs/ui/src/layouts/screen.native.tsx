import { ScrollView, Text, View } from 'react-native';
import { petalNativeTheme as theme } from '../themes/generated/native-theme.mjs';
import { useResponsiveLayout } from '../hooks/use-responsive-layout.native.js';
import type { ScreenProps } from './props.js';

export function Screen({ children, title, description, footer, width = 'reading',
  insets = { top: 0, right: 0, bottom: 0, left: 0 }, testID }: ScreenProps) {
  const layout = useResponsiveLayout();
  return <ScrollView testID={testID} keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: theme.semantic.color.background }}
    contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + theme.semantic.space.section,
      paddingBottom: insets.bottom + theme.semantic.space.section, paddingLeft: insets.left, paddingRight: insets.right }}>
    <View style={{ width: '100%', maxWidth: width === 'reading' ? layout.readingMax : layout.contentMax,
      alignSelf: 'center', paddingHorizontal: layout.gutter, gap: theme.semantic.space.section }}>
      {(title || description) && <View style={{ gap: theme.semantic.space.related }}>
        {title && <Text accessibilityRole="header" style={[theme.semantic.type.heading, { color: theme.semantic.color.text.primary }]}>{title}</Text>}
        {description && <Text style={[theme.semantic.type.body, { color: theme.semantic.color.text.secondary }]}>{description}</Text>}
      </View>}
      {children}{footer}
    </View>
  </ScrollView>;
}
