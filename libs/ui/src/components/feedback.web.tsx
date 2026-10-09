import type { FeedbackProps } from './props.js';

export function Feedback({ kind, message, testID }: FeedbackProps) {
  return <div className="petal-feedback" data-kind={kind} data-testid={testID}
    role={kind === 'error' ? 'alert' : 'status'}>{message}</div>;
}
