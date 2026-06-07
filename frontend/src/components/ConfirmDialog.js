import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx.confirm;
};

let nextId = 0;

export const ConfirmProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        id: ++nextId,
        title: options.title || 'Are you sure?',
        message: options.message || '',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'danger',
        requireText: options.requireText || null,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolverRef.current) resolverRef.current(true);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const handleCancel = useCallback(() => {
    if (resolverRef.current) resolverRef.current(false);
    resolverRef.current = null;
    setDialog(null);
  }, []);

  const handleKey = useCallback((e) => {
    if (!dialog) return;
    if (e.key === 'Escape') handleCancel();
    if (e.key === 'Enter' && !dialog.requireText) handleConfirm();
  }, [dialog, handleCancel, handleConfirm]);

  React.useEffect(() => {
    if (dialog) {
      document.addEventListener('keydown', handleKey);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKey);
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [dialog, handleKey]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {dialog && <ConfirmDialogContent dialog={dialog} onConfirm={handleConfirm} onCancel={handleCancel} />}
    </ConfirmContext.Provider>
  );
};

const ConfirmDialogContent = ({ dialog, onConfirm, onCancel }) => {
  const [text, setText] = useState('');
  const canConfirm = !dialog.requireText || text === dialog.requireText;

  const variantStyles = {
    danger: { icon: 'bg-red-100 text-red-600', btn: 'bg-red-600 hover:bg-red-700 text-white' },
    warning: { icon: 'bg-amber-100 text-amber-600', btn: 'bg-amber-600 hover:bg-amber-700 text-white' },
    info: { icon: 'bg-blue-100 text-blue-600', btn: 'bg-blue-600 hover:bg-blue-700 text-white' },
  };
  const v = variantStyles[dialog.variant] || variantStyles.danger;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:max-w-md max-h-[90vh] overflow-auto">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
          aria-label="Close"
        >
          <X size={18} />
        </button>
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className={`flex-shrink-0 p-2.5 rounded-full ${v.icon}`}>
              <AlertTriangle size={22} />
            </div>
            <div className="flex-1 pt-1">
              <h2 id="confirm-title" className="text-lg font-bold text-slate-900">{dialog.title}</h2>
            </div>
          </div>
          <p id="confirm-message" className="text-sm text-slate-600 mb-4 ml-1">
            {dialog.message}
          </p>
          {dialog.requireText && (
            <div className="mb-4">
              <label className="block text-xs text-slate-600 mb-1">
                Type <span className="font-mono font-bold text-slate-900">{dialog.requireText}</span> to confirm:
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                autoFocus
                autoComplete="off"
              />
            </div>
          )}
          <div className="flex gap-2 justify-end mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              {dialog.cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={!canConfirm}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition disabled:opacity-50 ${v.btn}`}
            >
              {dialog.confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmProvider;
