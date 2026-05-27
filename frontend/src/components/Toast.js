import React, { useState, useCallback } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

let toastId = 0;
let addToastFn = null;

export const toast = {
  success: (message) => { if (addToastFn) addToastFn({ id: ++toastId, type: 'success', message }); },
  error: (message) => { if (addToastFn) addToastFn({ id: ++toastId, type: 'error', message }); },
};

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);
  addToastFn = useCallback((t) => {
    setToasts(prev => [...prev, t]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 4000);
  }, []);

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${t.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {t.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          <span className="flex-1">{t.message}</span>
          <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}><X size={14} /></button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
