/**
 * ToastContainer - renders the toasts pushed through ToastContext.
 */
import { useToast } from '../../context/ToastContext';

const TONES = {
  success: 'border-brand-200 bg-brand-50 text-brand-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-slate-200 bg-white text-slate-800',
};

const ICONS = { success: '✅', error: '⛔', warning: '⚠️', info: 'ℹ️' };

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`pointer-events-auto flex w-full max-w-sm animate-slide-in items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${
            TONES[toast.type] || TONES.info
          }`}
        >
          <span aria-hidden="true">{ICONS[toast.type] || ICONS.info}</span>
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="text-current opacity-60 transition-opacity hover:opacity-100"
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
