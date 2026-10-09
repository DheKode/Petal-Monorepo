import { petalTheme, petalNativeTheme, type PetalTheme } from '@petal/ui';
import { getPetalTheme } from '@petal/ui/theme';
import { getPetalNativeTheme } from '@petal/ui/theme/native';

const theme: PetalTheme = petalTheme;
const nativeBody: {
  fontFamily: string;
  fontSize: number;
  fontWeight: '400' | '500' | '600';
  lineHeight: number;
  letterSpacing: number;
} = petalNativeTheme.semantic.type.body;
const reducedDuration: number = getPetalNativeTheme({ reduceMotion: true }).component.button.transition;
const webDuration: number = getPetalTheme({ reduceMotion: true }).component.button.transition;
// @ts-expect-error Public theme values are readonly.
theme.semantic.color.background = '#FFFFFF';
// @ts-expect-error Native typography weights are strings, not numeric web weights.
const invalidWeight: number = nativeBody.fontWeight;
void [theme, nativeBody, reducedDuration, webDuration, invalidWeight];
