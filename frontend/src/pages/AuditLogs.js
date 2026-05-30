import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Download, Search, Filter, Loader2, FileText } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';

const ACTION_COLORS = {
  CREATE: 'text-emerald-600 bg-emerald-50',
  UPDATE: 'text-blue-600 bg-blue-50',
  DELETE: 'text-red-600 bg-red-50',
  ASSIGN_BIN: 'text-violet-600 bg-violet-50',
  COMPLETE: 'text-emerald-600 bg-emerald-50',
  APPROVE: 'text-emerald-600 bg-emerald-50',
  REJECT: 'text-red-600 bg-red-50',
  QC: 'text-cyan-600 bg-cyan-50',
  CANCEL: 'text-red-600 bg-red-50',
  SPLIT: 'text-amber-600 bg-amber-50',
  UPDATE_STATUS: 'text-blue-600 bg-blue-50',
  CHANGE_PASSWORD: 'text-slate-600 bg-slate-100',
};

const AuditLogs = () => {
  const { user } = useAuth();
  const isPlatform = user?.role === 'PLATFORM_ADMIN';
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [exporting, setExporting] = useState(false);
  const limit = 50;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit, entityType, action };
      const res = await API.get('/audit-logs', { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch { setLogs([]); } finally { setLoading(false); }
  }, [page, entityType, action]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = { entityType, action };
      const res = await API.get('/audit-logs/export', { params, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Audit log exported');
    } catch { toast.error('Export failed'); } finally { setExporting(false); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
          <p className="text-sm text-slate-500">Complete record of all system activity</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1); }} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none">
            <option value="">All Entity Types</option>
            <option value="Order">Order</option>
            <option value="GRN">GRN</option>
            <option value="PutawayTask">Putaway</option>
            <option value="User">User</option>
            <option value="Inventory">Inventory</option>
            <option value="Gatepass">Gatepass</option>
            <option value="Picklist">Picklist</option>
            <option value="Warehouse">Warehouse</option>
          </select>
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={action} onChange={e => { setAction(e.target.value); setPage(1); }} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none">
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="UPDATE_STATUS">UPDATE_STATUS</option>
            <option value="APPROVE">APPROVE</option>
            <option value="REJECT">REJECT</option>
            <option value="CANCEL">CANCEL</option>
            <option value="SPLIT">SPLIT</option>
            <option value="COMPLETE">COMPLETE</option>
            <option value="ASSIGN_BIN">ASSIGN_BIN</option>
            <option value="QC">QC</option>
            <option value="CHANGE_PASSWORD">CHANGE_PASSWORD</option>
          </select>
        </div>
        <div className="text-xs text-slate-400 self-center">{total} record{total !== 1 && 's'}</div>
      </div>

      {loading ? <TableSkeleton rows={8} /> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="text-left px-4 py-3 font-medium">Timestamp</th>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium">Entity</th>
                  <th className="text-left px-4 py-3 font-medium">Entity ID</th>
                  <th className="text-left px-4 py-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">No audit logs found</td></tr>
                ) : logs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs">{l.user?.email || l.user?.fullName || l.userId?.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${ACTION_COLORS[l.action] || 'text-slate-600 bg-slate-100'}`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-medium">{l.entityType}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono max-w-[120px] truncate">{l.entityId || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{JSON.stringify(l.newValue || l.oldValue || {})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-xs border rounded-lg hover:bg-slate-50 disabled:opacity-30">Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-xs border rounded-lg hover:bg-slate-50 disabled:opacity-30">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
