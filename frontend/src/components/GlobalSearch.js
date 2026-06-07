import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, CornerDownLeft, ArrowRight, Hash, Building2, Package, ShoppingCart } from 'lucide-react';
import { searchPages } from '../utils/searchIndex';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';

const GlobalSearch = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pageResults, setPageResults] = useState([]);
  const [entityResults, setEntityResults] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const { getToken } = useAuth();
  const debounceRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === '/' && !open && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    const onOpenEvent = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('open-global-search', onOpenEvent);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('open-global-search', onOpenEvent);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setPageResults([]);
      setEntityResults([]);
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    setPageResults(searchPages(query));
    setActiveIdx(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length >= 2) {
      setLoading(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const { data } = await API.get(`/api/search?q=${encodeURIComponent(query)}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          setEntityResults(data.results || []);
        } catch {
          setEntityResults([]);
        } finally {
          setLoading(false);
        }
      }, 250);
    } else {
      setEntityResults([]);
      setLoading(false);
    }
    return () => clearTimeout(debounceRef.current);
  }, [query, getToken]);

  const allResults = [
    ...pageResults.map((p) => ({ type: 'page', ...p })),
    ...entityResults,
  ];

  const handleSelect = (result) => {
    setOpen(false);
    if (result.type === 'page') {
      onNavigate?.(result.tab);
    } else if (result.type === 'order') {
      onNavigate?.('orders', result.id);
    } else if (result.type === 'sku') {
      onNavigate?.('inventory', result.id);
    } else if (result.type === 'warehouse') {
      onNavigate?.('warehouse', result.id);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && allResults[activeIdx]) {
      e.preventDefault();
      handleSelect(allResults[activeIdx]);
    }
  };

  const iconFor = (type) => {
    if (type === 'order') return ShoppingCart;
    if (type === 'sku') return Package;
    if (type === 'warehouse') return Building2;
    return Hash;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4" role="dialog" aria-modal="true" aria-label="Search">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[70vh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
          <Search size={18} className="text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pages, orders, SKUs, warehouses…"
            className="flex-1 outline-none text-base placeholder:text-slate-400"
            aria-label="Search"
            autoComplete="off"
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-500 rounded">ESC</kbd>
        </div>
        <div className="flex-1 overflow-y-auto" role="listbox">
          {loading && (
            <div className="px-4 py-3 text-sm text-slate-400 text-center">Searching…</div>
          )}
          {!loading && query && allResults.length === 0 && (
            <div className="px-4 py-8 text-sm text-slate-500 text-center">
              No results for <span className="font-medium">"{query}"</span>
            </div>
          )}
          {!query && (
            <div className="p-4 space-y-2">
              <div className="text-xs font-semibold uppercase text-slate-400 px-2">Quick links</div>
              {pageResults.length === 0 && (
                <div className="text-sm text-slate-400 px-2">Start typing to search…</div>
              )}
            </div>
          )}
          {pageResults.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-1 text-xs font-semibold uppercase text-slate-400">Pages</div>
              {pageResults.map((p, i) => {
                const isActive = i === activeIdx;
                return (
                  <button
                    key={`p-${p.tab}`}
                    onClick={() => handleSelect({ type: 'page', tab: p.tab })}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                      isActive ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    role="option"
                    aria-selected={isActive}
                  >
                    <ArrowRight size={14} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{p.label}</div>
                      <div className="text-xs text-slate-500">{p.group}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {entityResults.length > 0 && (
            <div className="py-2 border-t border-slate-100">
              <div className="px-4 py-1 text-xs font-semibold uppercase text-slate-400">Entities</div>
              {entityResults.map((r, i) => {
                const idx = pageResults.length + i;
                const isActive = idx === activeIdx;
                const Icon = iconFor(r.type);
                return (
                  <button
                    key={`e-${r.type}-${r.id}`}
                    onClick={() => handleSelect(r)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                      isActive ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                    role="option"
                    aria-selected={isActive}
                  >
                    <Icon size={14} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.label || r.name || r.id}</div>
                      <div className="text-xs text-slate-500">{r.type} {r.subtitle ? `· ${r.subtitle}` : ''}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-3">
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-100 rounded">↑</kbd><kbd className="px-1.5 py-0.5 bg-slate-100 rounded">↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-100 rounded">↵</kbd> select</span>
          <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-100 rounded">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
