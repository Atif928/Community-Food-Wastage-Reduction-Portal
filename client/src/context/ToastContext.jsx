/**
 * ToastContext - tiny notification system for success / error / info messages.
 *
 * Usage:  const { showToast } = useToast();  showToast('Saved!', 'success');
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

const DURATION_MS = 4500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', options = {}) => {
    idRef.current += 1;
    const id = idRef.current;
    const toast = { id, message, type, title: options.title };

    setToasts((current) => [...current, toast]);
    window.setTimeout(() => dismiss(id), options.duration || DURATION_MS);

    return id;
  }, [dismiss]);

  /** Convenience wrappers so call sites read well. */
  const value = useMemo(() => ({
    toasts,
    dismiss,
    showToast,
    success: (message, options) => showToast(message, 'success', options),
    error: (message, options) => showToast(message, 'error', options),
    info: (message, options) => showToast(message, 'info', options),
    warning: (message, options) => showToast(message, 'warning', options),
  }), [toasts, dismiss, showToast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider.');
  return context;
}

export default ToastContext;
