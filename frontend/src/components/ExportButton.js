import React from 'react';
import { Download } from 'lucide-react';
import { exportToCSV } from '../utils/csvExport';

const ExportButton = ({ filename, data, columns, label = 'Export CSV', size = 'sm' }) => {
  if (!data || data.length === 0) return null;
  const sizeCls = size === 'sm'
    ? 'px-3 py-1.5 text-xs'
    : 'px-4 py-2 text-sm';
  return (
    <button
      onClick={() => exportToCSV(filename, data, columns)}
      className={`flex items-center gap-1.5 ${sizeCls} bg-white text-slate-700 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition-colors`}
      aria-label={label}
    >
      <Download size={size === 'sm' ? 13 : 15} />
      {label}
    </button>
  );
};

export default ExportButton;
