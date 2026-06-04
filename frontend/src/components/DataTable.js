import React, { useState, useEffect, useRef } from 'react';
import { Search, MoreVertical, ChevronLeft, ChevronRight, Loader2, CheckSquare, Square, ChevronUp, ChevronDown } from 'lucide-react';
import { TableSkeleton } from './Skeleton';
import EmptyState from './EmptyState';

const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  searchable = false,
  searchValue = '',
  onSearch,
  searchPlaceholder = 'Search...',
  selectable = false,
  selected = new Set(),
  onSelectionChange,
  idKey = 'id',
  sortKey,
  sortDir,
  onSort,
  page,
  totalPages,
  total,
  onPageChange,
  actions,
  bulkActions = [],
  emptyState,
  onRowClick,
  className = '',
}) => {
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allSelected = data.length > 0 && data.every(row => selected.has(row[idKey]));
  const someSelected = data.some(row => selected.has(row[idKey]));

  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange(next);
  };

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      const next = new Set(selected);
      data.forEach(row => next.add(row[idKey]));
      onSelectionChange(next);
    }
  };

  const handleSort = (colKey) => {
    if (!onSort) return;
    if (sortKey === colKey) {
      onSort(colKey, sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(colKey, 'asc');
    }
  };

  if (loading) return <TableSkeleton rows={8} cols={columns.length || 4} />;

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={emptyState?.icon || 'search'}
        title={emptyState?.title || 'No data found'}
        description={emptyState?.description || 'There are no items to display.'}
      />
    );
  }

  return (
    <div className={`card overflow-hidden ${className}`}>
      {searchable && (
        <div className="p-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {selectable && selected.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2 bg-indigo-50 border-b border-indigo-100">
          <span className="text-sm font-medium text-indigo-700">{selected.size} selected</span>
          <div className="flex gap-2">
            {bulkActions.map((action, i) => (
              <button
                key={i}
                onClick={() => action.onClick(selected)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  action.variant === 'danger'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : action.variant === 'success'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                {action.icon && <action.icon size={13} />}
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <button onClick={toggleAll} className="p-0.5 hover:bg-slate-200 rounded">
                    {allSelected ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} className="text-slate-400" />}
                  </button>
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${col.align === 'right' ? 'text-right' : ''} ${col.sortable ? 'cursor-pointer select-none hover:text-slate-700' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable ? handleSort(col.key) : undefined}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp size={12} className="text-indigo-500" /> : <ChevronDown size={12} className="text-indigo-500" />
                    )}
                  </span>
                </th>
              ))}
              {(actions) && <th className="px-4 py-3 text-right w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const rowId = row[idKey];
              return (
                <tr
                  key={rowId}
                  className={`border-b border-slate-100 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                  onClick={() => onRowClick ? onRowClick(row) : undefined}
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <button onClick={(e) => { e.stopPropagation(); toggleSelect(rowId); }} className="p-0.5 hover:bg-slate-200 rounded">
                        {selected.has(rowId) ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} className="text-slate-400" />}
                      </button>
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-sm text-slate-600 ${col.align === 'right' ? 'text-right' : ''}`}>
                      {col.render ? col.render(row) : row[col.key] ?? '-'}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === rowId ? null : rowId)}
                        className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors"
                      >
                        <MoreVertical size={16} className="text-slate-400" />
                      </button>
                      {openMenuId === rowId && (
                        <div
                          ref={menuRef}
                          className="absolute right-2 top-10 z-40 w-44 bg-white rounded-xl shadow-xl border border-indigo-100/60 py-1 animate-fade-in"
                        >
                          {(typeof actions === 'function' ? actions(row) : actions).filter(a => !a.hidden).map((action, i) => (
                            <button
                              key={i}
                              onClick={() => { action.onClick(row); setOpenMenuId(null); }}
                              disabled={action.disabled}
                              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                                action.variant === 'danger' ? 'text-red-600 hover:bg-red-50'
                                : action.variant === 'success' ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-slate-700 hover:bg-indigo-50'
                              }`}
                            >
                              {action.icon && <action.icon size={15} />}
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            {total !== undefined ? `${total} total · ` : ''}Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
