/**
 * Avatar - image or initials fallback.
 */
import { fileUrl, initials } from '../../utils/formatters';

export function Avatar({ name, src, size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-lg',
    xl: 'h-24 w-24 text-2xl',
  };

  const url = fileUrl(src);

  if (url) {
    return (
      <img
        src={url}
        alt={name ? `${name}'s avatar` : 'Avatar'}
        className={`${sizes[size] || sizes.md} shrink-0 rounded-full object-cover ring-2 ring-white ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizes[size] || sizes.md} flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-800 ring-2 ring-white ${className}`}
    >
      {initials(name)}
    </span>
  );
}

export default Avatar;
