import { useId } from 'react';
import type { CardProps } from './props.js';

export function Card({ title, children, variant = 'default', testID }: CardProps) {
  const titleId = useId();
  return <section className={variant === 'proposal' ? 'petal-proposal' : 'petal-card'}
    data-testid={testID} aria-labelledby={title ? titleId : undefined}>
    {title && <h2 id={titleId} className="petal-card-title">{title}</h2>}
    <div className="petal-card-content">{children}</div>
  </section>;
}
