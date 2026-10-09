import { Text, View } from 'react-native';
import { petalNativeTheme as theme } from '../themes/generated/native-theme.mjs';
import type { FeedbackProps } from './props.js';

export function Feedback({ kind, message, testID }: FeedbackProps) {
  const color = theme.semantic.color.feedback[kind];
  const feedback = theme.component.feedback;
  return <View testID={testID} accessibilityLiveRegion={kind === 'error' ? 'assertive' : 'polite'}
    style={{ backgroundColor: color.surface, padding: feedback.padding, borderRadius: feedback.radius }}>
    <Text style={[feedback.type, { color: color.text }]}>{message}</Text>
  </View>;
}
