import { useEffect, useId, useRef } from 'react';
import type { ConfirmDialogProps } from './props.js';
import { Button } from './button.web.js';
import { Feedback } from './feedback.web.js';

/** Controlled: only the consuming application can perform or finish a write. */
export function ConfirmDialog({ open, title, description, children, confirmLabel, cancelLabel = 'Cancel',
  busy = false, busyLabel, errorText, onConfirm, onCancel, testID }: ConfirmDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open || !dialog.current) return;
    const element = dialog.current;
    const previous = document.activeElement;
    element.showModal();
    cancel.current?.focus();
    return () => {
      element.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, [open]);
  return <dialog ref={dialog} className="petal-dialog" data-petal-ui data-testid={testID}
    aria-labelledby={id + '-title'} aria-describedby={id + '-description'} aria-busy={busy || undefined}
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <div className="petal-stack" data-space="group"><h2 id={id + '-title'} className="petal-card-title">{title}</h2>
      <p id={id + '-description'}>{description}</p>{children}
      {errorText && <Feedback kind="error" message={errorText} />}
      <div className="petal-stack" data-direction="row" data-wrap="true" data-space="related">
        <Button ref={cancel} label={cancelLabel} variant="secondary" disabled={busy} onPress={onCancel} />
        <Button label={confirmLabel} busy={busy} busyLabel={busyLabel} onPress={onConfirm} />
      </div>
    </div>
  </dialog>;
}
