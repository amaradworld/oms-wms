import React from 'react';
import { useGPrefix } from '../hooks/useKeyboardShortcuts';
import GlobalSearch from './GlobalSearch';

const KeyboardHints = () => (
  <div className="text-xs text-slate-500 space-y-1.5">
    <p className="font-semibold text-slate-700 mb-2">Navigation</p>
    <div className="flex items-center justify-between gap-3">
      <span>Open search</span>
      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-300 rounded">Ctrl K</kbd>
    </div>
    <p className="font-semibold text-slate-700 mt-3 mb-2">Quick jump (then letter)</p>
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3"><span>Dashboard</span><kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-300 rounded">G D</kbd></div>
      <div className="flex items-center justify-between gap-3"><span>Orders</span><kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-300 rounded">G O</kbd></div>
      <div className="flex items-center justify-between gap-3"><span>Inventory</span><kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-300 rounded">G I</kbd></div>
      <div className="flex items-center justify-between gap-3"><span>Scan</span><kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-300 rounded">G S</kbd></div>
      <div className="flex items-center justify-between gap-3"><span>Settings</span><kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 border border-slate-300 rounded">G ,</kbd></div>
    </div>
  </div>
);

const HelpModal = ({ onClose, onNavigate }) => {
  const handlers = {
    d: () => { onNavigate('dashboard'); onClose(); },
    o: () => { onNavigate('orders'); onClose(); },
    i: () => { onNavigate('inventory'); onClose(); },
    s: () => { onNavigate('scanning'); onClose(); },
    ',': () => { onNavigate('settings'); onClose(); },
    p: () => { onNavigate('packing'); onClose(); },
    w: () => { onNavigate('waves'); onClose(); },
    r: () => { onNavigate('returns'); onClose(); },
  };
  useGPrefix(handlers);

  return (
    <div className="fixed inset-0 z-[160] bg-slate-900/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="help-title" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 id="help-title" className="text-lg font-bold">Keyboard shortcuts</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg" aria-label="Close help">
            <kbd className="text-[10px] font-mono text-slate-400">esc</kbd>
          </button>
        </div>
        <KeyboardHints />
        <button onClick={onClose} className="w-full mt-5 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">
          Got it
        </button>
      </div>
    </div>
  );
};

const HelpButton = ({ onNavigate }) => {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const tag = e.target?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          e.preventDefault();
          setOpen(o => !o);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors hidden sm:flex"
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        <kbd className="text-[10px] font-mono font-semibold">?</kbd>
      </button>
      {open && <HelpModal onClose={() => setOpen(false)} onNavigate={onNavigate} />}
    </>
  );
};

export default HelpButton;
