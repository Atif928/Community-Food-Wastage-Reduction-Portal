/**
 * Button - one component covering all the styles in index.css.
 */
import Spinner from './Spinner';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
};

export function Button({
  children,
  variant = 'primary',
  size,
  type = 'button',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  icon = null,
  ...rest
}) {
  const classes = [
    VARIANTS[variant] || VARIANTS.primary,
    size === 'sm' ? 'btn-sm' : '',
    fullWidth ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {loading ? <Spinner size="sm" /> : icon}
      {children}
    </button>
  );
}

export default Button;
