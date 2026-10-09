import { View } from 'react-native';
import { petalNativeTheme } from '../themes/generated/native-theme.mjs';
import type { StackProps } from './props.js';

export function Stack({ children, space = 'group', direction = 'column', wrap = false, testID }: StackProps) {
  return <View testID={testID} style={{ gap: petalNativeTheme.semantic.space[space],
    flexDirection: direction, flexWrap: wrap ? 'wrap' : 'nowrap', alignItems: direction === 'row' ? 'center' : 'stretch' }}>
    {children}
  </View>;
}
