export function exportToCSV(filename, rows, columns) {
  if (!rows || !rows.length) {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('toast:show', { detail: { type: 'warning', message: 'No data to export' } }));
    }
    return;
  }
  const cols = columns && columns.length
    ? columns
    : Object.keys(rows[0]).map(k => ({ key: k, label: k }));

  const escape = (v) => {
    if (v === null || v === undefined) return '';
    let s = typeof v === 'string' ? v : String(v);
    s = s.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (/[",]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const header = cols.map(c => escape(c.label || c.key)).join(',');
  const body = rows.map(row => cols.map(c => {
    const val = typeof c.get === 'function' ? c.get(row) : row[c.key];
    return escape(val);
  }).join(',')).join('\r\n');
  const csv = `\uFEFF${header}\r\n${body}`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
