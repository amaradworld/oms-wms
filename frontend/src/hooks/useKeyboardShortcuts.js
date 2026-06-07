import { useEffect, useRef } from 'react';

const isInputTarget = (el) => {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
};

export const useKeyboardShortcuts = (shortcuts) => {
  const pressedKeys = useRef(new Set());
  const lastG = useRef(0);

  useEffect(() => {
    const handler = (e) => {
      if (isInputTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      const now = Date.now();

      if (key === 'g') {
        lastG.current = now;
        return;
      }

      if (key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        const shortcut = shortcuts.find(s => s.key === '?');
        if (shortcut) shortcut.action(e);
        return;
      }

      if (lastG.current && now - lastG.current < 1500) {
        const composite = `g ${key}`;
        const shortcut = shortcuts.find(s => s.key === composite);
        if (shortcut) {
          e.preventDefault();
          shortcut.action(e);
          lastG.current = 0;
          return;
        }
      }

      if (lastG.current && now - lastG.current < 1500 && key === 'escape') {
        lastG.current = 0;
      }

      const direct = shortcuts.find(s => s.key === key);
      if (direct && !lastG.current) {
        e.preventDefault();
        direct.action(e);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
};

export const useGPrefix = (handlers) => {
  const lastG = useRef(0);

  useEffect(() => {
    const handler = (e) => {
      if (isInputTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const key = e.key.toLowerCase();
      const now = Date.now();

      if (key === 'g') {
        lastG.current = now;
        return;
      }

      if (lastG.current && now - lastG.current < 1500 && handlers[key]) {
        e.preventDefault();
        handlers[key](e);
        lastG.current = 0;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handlers]);
};
