import { useId } from 'react';
import type { ScreenProps } from './props.js';
import { useResponsiveLayout } from '../hooks/use-responsive-layout.web.js';

export function Screen({ children, title, description, footer, width = 'reading', testID }: ScreenProps) {
  const titleId = useId();
  const { isWide } = useResponsiveLayout();
  return <main data-petal-ui className="petal-screen" data-layout={isWide ? 'wide' : 'compact'} data-width={width} data-testid={testID}
    aria-labelledby={title ? titleId : undefined}>
    {(title || description) && <header className="petal-screen-header">
      {title && <h1 id={titleId}>{title}</h1>}{description && <p className="petal-muted">{description}</p>}
    </header>}
    <div className="petal-stack" data-space="section">{children}</div>
    {footer && <footer className="petal-screen-footer">{footer}</footer>}
  </main>;
}
