/**
 * Input / Textarea / Select - form controls with label, help and error slots.
 */
import { forwardRef } from 'react';

export const Input = forwardRef(function Input({
  label,
  error,
  help,
  id,
  className = '',
  required = false,
  ...rest
}, ref) {
  const inputId = id || rest.name;
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={`input ${error ? 'input-error' : ''}`}
        {...rest}
      />
      {help && !error && <p className="helper-text">{help}</p>}
      {error && <p className="error-text" id={`${inputId}-error`}>{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({
  label,
  error,
  help,
  id,
  className = '',
  rows = 3,
  required = false,
  ...rest
}, ref) {
  const inputId = id || rest.name;
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={`input ${error ? 'input-error' : ''}`}
        {...rest}
      />
      {help && !error && <p className="helper-text">{help}</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
});

export const Select = forwardRef(function Select({
  label,
  error,
  help,
  id,
  className = '',
  children,
  required = false,
  placeholder,
  ...rest
}, ref) {
  const inputId = id || rest.name;
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={inputId}>
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      <select
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        className={`input ${error ? 'input-error' : ''}`}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {children}
      </select>
      {help && !error && <p className="helper-text">{help}</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
});

export default Input;
