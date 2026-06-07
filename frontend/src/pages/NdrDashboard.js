import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, CheckCircle, Calendar, Plus, X, Truck, Loader2 } from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';

const STATUS_BADGE = {
  OPEN: 'bg-red-100 text-red-700',
  REATTEMPT_SCHEDULED: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

const safeDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
};

const NdrDashboard = ({ detailId, setDetailId }) => {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [courierFilter, setCourierFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showReattempt, setShowReattempt] = useState(null);
  const [reattemptDate, setReattemptDate] = useState('');
  const [reasonInput, setReasonInput] = useState('');
  const [shippedOrders, setShippedOrders] = useState([]);
  const [fetchingShipped, setFetchingShipped] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [resolving, setResolving] = useState(null);
  const [creatingId, setCreatingId] = useState(null);

  useEffect(() => {
    if (detailId && showReattempt !== detailId) {
      setShowReattempt(detailId);
      setReattemptDate('');
    }
  }, [detailId]);

  const confirm = useConfirm();
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (courierFilter) params.courier = courierFilter;
      const [casesRes, statsRes] = await Promise.all([
        API.get('/ndr', { params }),
        API.get('/ndr/stats'),
      ]);
      setCases(casesRes.data);
      setStats(statsRes.data);
    } catch (e) {
      toast.error('Failed to load NDR data');
    }
    setLoading(false);
  }, [statusFilter, courierFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (courierFilter) params.courier = courierFilter;
      const [casesRes, statsRes] = await Promise.all([
        API.get('/ndr', { params }),
        API.get('/ndr/stats'),
      ]);
      setCases(casesRes.data);
      setStats(statsRes.data);
    } catch {
      toast.error('Failed to refresh NDR data');
    }
    setRefreshing(false);
  };

  const openCreate = async () => {
    setFetchingShipped(true);
    setShowCreate(true);
    try {
      const { data } = await API.get('/delivery/shipped');
      setShippedOrders(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load shipped orders');
      setShippedOrders([]);
    }
    setFetchingShipped(false);
    setReasonInput('');
  };

  const createNdr = async (orderId) => {
    setCreatingId(orderId);
    try {
      await API.post('/ndr', { orderId, failureReason: reasonInput || 'Delivery failed' });
      toast.success('NDR case created');
      setShowCreate(false);
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create NDR');
    }
    setCreatingId(null);
  };

  const scheduleReattempt = async () => {
    if (!reattemptDate) { toast.error('Select a reattempt date'); return; }
    setScheduling(true);
    try {
      await API.patch(`/ndr/${showReattempt}/reattempt`, { reattemptDate });
      toast.success('Reattempt scheduled');
      setShowReattempt(null);
      setReattemptDate('');
      if (setDetailId) setDetailId('');
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to schedule');
    }
    setScheduling(false);
  };

  const resolveCase = async (id) => {
    if (!await confirm({
      title: 'Resolve this NDR case?',
      message: 'This will mark the NDR as resolved and trigger the configured resolution action (re-attempt / return).',
      confirmText: 'Resolve NDR',
      variant: 'info',
    })) return;
    setResolving(id);
    try {
      await API.patch(`/ndr/${id}/resolve`, {});
      toast.success('NDR case resolved');
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to resolve');
    }
    setResolving(null);
  };

  const couriers = [...new Set(cases.map(c => c.courierName).filter(Boolean))];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">NDR Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Manage non-delivery reports and schedule reattempts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRefresh} disabled={refreshing || loading} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
            {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
          </button>
          <button onClick={openCreate} disabled={fetchingShipped} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
            {fetchingShipped ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} New NDR
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="card p-4"><p className="text-xs text-slate-500 font-semibold uppercase">Total</p><p className="text-2xl font-bold mt-1">{stats?.total ?? '—'}</p></div>
        <div className="card p-4 border-red-200"><p className="text-xs text-red-600 font-semibold uppercase">Open</p><p className="text-2xl font-bold mt-1 text-red-600">{stats?.open ?? '—'}</p></div>
        <div className="card p-4 border-amber-200"><p className="text-xs text-amber-600 font-semibold uppercase">Reattempt Scheduled</p><p className="text-2xl font-bold mt-1 text-amber-600">{stats?.reattemptScheduled ?? '—'}</p></div>
        <div className="card p-4 border-emerald-200"><p className="text-xs text-emerald-600 font-semibold uppercase">Resolved</p><p className="text-2xl font-bold mt-1 text-emerald-600">{stats?.resolved ?? '—'}</p></div>
      </div>

      <div className="card p-3 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-slate-400" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field text-sm">
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="REATTEMPT_SCHEDULED">Reattempt Scheduled</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Truck size={16} className="text-slate-400" />
          <select value={courierFilter} onChange={e => setCourierFilter(e.target.value)} className="input-field text-sm">
            <option value="">All Couriers</option>
            {couriers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} cols={6} /> : cases.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No NDR cases</p>
          <p className="text-sm mt-1">Create an NDR case when a delivery fails</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Order</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Courier / AWB</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Reason</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Reattempt</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {cases.map(c => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium">{c.order?.orderNumber || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.order?.customerName || '—'}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-xs text-slate-500">{c.courierName || '—'}</div>
                      <div className="text-xs font-mono text-slate-400">{c.awbNumber || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">{c.failureReason || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[c.status] || 'bg-slate-100 text-slate-600'}`}>{(c.status || 'UNKNOWN').replace(/_/g, ' ')}</span>
                      {safeDate(c.reattemptDate) && <div className="text-[10px] text-slate-400 mt-0.5">{safeDate(c.reattemptDate).toLocaleDateString()}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {safeDate(c.reattemptDate) ? safeDate(c.reattemptDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(c.status === 'OPEN' || c.status === 'REATTEMPT_SCHEDULED') && (
                          <>
                            <button onClick={() => { if (setDetailId) setDetailId(c.id); setShowReattempt(c.id); setReattemptDate(''); }} className="p-2 hover:bg-amber-50 rounded-lg text-amber-600 disabled:opacity-50" disabled={!!resolving} title="Schedule Reattempt">
                              <Calendar size={15} />
                            </button>
                            <button onClick={() => resolveCase(c.id)} disabled={resolving === c.id} className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 disabled:opacity-50" title="Resolve">
                              {resolving === c.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Create NDR Case</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Failure Reason</label>
              <input type="text" value={reasonInput} onChange={e => setReasonInput(e.target.value)} placeholder="e.g. Customer not available, Address not found" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Shipped Orders</label>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                {fetchingShipped ? (
                  <div className="text-center py-6 text-slate-400 text-sm">Loading orders...</div>
                ) : shippedOrders.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No shipped orders found</p>
                ) : shippedOrders.map(o => (
                  <div key={o.id} className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{o.orderNumber}</div>
                      <div className="text-xs text-slate-400">{o.customerName} &middot; {o.tracking?.awbNumber || '-'}</div>
                    </div>
                    <button onClick={() => createNdr(o.id)} disabled={creatingId === o.id} className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50 flex-shrink-0 ml-2 flex items-center gap-1">
                      {creatingId === o.id ? <Loader2 size={12} className="animate-spin" /> : null}
                      Create NDR
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showReattempt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowReattempt(null); if (setDetailId) setDetailId(''); }}>
          <div className="bg-white rounded-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Schedule Reattempt</h2>
              <button onClick={() => { setShowReattempt(null); if (setDetailId) setDetailId(''); }} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Reattempt Date</label>
              <input type="date" value={reattemptDate} onChange={e => setReattemptDate(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <button onClick={scheduleReattempt} disabled={!reattemptDate || scheduling} className="w-full bg-amber-600 text-white py-2.5 rounded-lg hover:bg-amber-700 disabled:opacity-50 font-medium text-sm flex items-center justify-center gap-2">
              {scheduling ? <Loader2 size={16} className="animate-spin" /> : null}
              {scheduling ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NdrDashboard;
