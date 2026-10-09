import { forwardRef, useId, type Ref } from 'react';
import type { TextFieldProps } from './props.js';

export const TextField = forwardRef<HTMLInputElement | HTMLTextAreaElement, TextFieldProps>(function TextField(
  { label, value, onValueChange, placeholder, helperText, errorText, disabled, required, multiline, id, testID }, ref,
) {
  const generated = useId();
  const fieldId = id ?? generated;
  const helpId = fieldId + '-help', errorId = fieldId + '-error';
  const props = {
    id: fieldId, className: 'petal-input', value, placeholder, disabled, required,
    'data-testid': testID, 'aria-invalid': errorText ? true : undefined,
    'aria-describedby': [helperText ? helpId : '', errorText ? errorId : ''].filter(Boolean).join(' ') || undefined,
    onChange: (event: { currentTarget: { value: string } }) => onValueChange(event.currentTarget.value),
  };
  return <div className="petal-field"><label htmlFor={fieldId}>{label}{required ? ' (required)' : ''}</label>
    {multiline ? <textarea {...props} rows={3} ref={ref as Ref<HTMLTextAreaElement>} />
      : <input {...props} type="text" ref={ref as Ref<HTMLInputElement>} />}
    {helperText && <span id={helpId} className="petal-help">{helperText}</span>}
    {errorText && <span id={errorId} className="petal-help petal-error" role="alert">{errorText}</span>}
  </div>;
});
