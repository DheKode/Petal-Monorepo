import type { StackProps } from './props.js';

export function Stack({ children, space = 'group', direction = 'column', wrap = false, testID }: StackProps) {
  return <div className="petal-stack" data-space={space} data-direction={direction} data-wrap={wrap}
    data-testid={testID}>{children}</div>;
}
