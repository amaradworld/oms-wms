import React, { useState, useCallback } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X, Undo2 } from 'lucide-react';

let toastId = 0;
let addToastFn = null;

export const toast = {
  success: (message, opts) => { if (addToastFn) addToastFn({ id: ++toastId, type: 'success', message, ...opts }); },
  error: (message, opts) => { if (addToastFn) addToastFn({ id: ++toastId, type: 'error', message, ...opts }); },
  info: (message, opts) => { if (addToastFn) addToastFn({ id: ++toastId, type: 'info', message, ...opts }); },
  warning: (message, opts) => { if (addToastFn) addToastFn({ id: ++toastId, type: 'warning', message, ...opts }); },
  undo: (message, { onUndo, duration = 6000 } = {}) => {
    if (addToastFn) addToastFn({ id: ++toastId, type: 'undo', message, onUndo, duration, persistent: true });
  },
};

const styles = {
  success: { bg: 'bg-green-600', icon: CheckCircle2 },
  error: { bg: 'bg-red-600', icon: XCircle },
  info: { bg: 'bg-blue-600', icon: Info },
  warning: { bg: 'bg-amber-500', icon: AlertTriangle },
  undo: { bg: 'bg-slate-800', icon: Undo2 },
};

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  addToastFn = useCallback((t) => {
    setToasts((prev) => [...prev, t]);
    const ttl = t.duration || (t.type === 'error' ? 6000 : 4000);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, ttl);
  }, []);

  const dismiss = (id) => setToasts((prev) => prev.filter((x) => x.id !== id));
  const handleUndo = (t) => {
    if (t.onUndo) t.onUndo();
    dismiss(t.id);
  };

  return (
    <div
      className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm pointer-events-none"
      role="region"
      aria-live="polite"
      aria-atomic="false"
      aria-label="Notifications"
    >
      {toasts.map((t) => {
        const s = styles[t.type] || styles.info;
        const Icon = s.icon;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right ${s.bg} text-white`}
            role={t.type === 'error' ? 'alert' : 'status'}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span className="flex-1">{t.message}</span>
            {t.type === 'undo' && t.onUndo && (
              <button
                onClick={() => handleUndo(t)}
                className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs font-semibold uppercase tracking-wide"
                aria-label="Undo"
              >
                Undo
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              className="opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
