import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Search, Filter, Plus, X, Loader2 } from 'lucide-react';
import ImportButton from '../components/ImportButton';
import SampleCSVButton from '../components/SampleCSVButton';
import API from '../utils/api';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const STATUS_COLORS = {
  REQUESTED: 'bg-amber-100 text-amber-700',
  RECEIVED: 'bg-blue-100 text-blue-700',
  QC_PASSED: 'bg-green-100 text-green-700',
  QC_FAILED: 'bg-red-100 text-red-700',
  RESTOCKED: 'bg-emerald-100 text-emerald-700',
  DISPOSED: 'bg-slate-100 text-slate-600',
};

const Returns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ orderId: '', skuId: '', quantity: '', reason: '' });
  const [orders, setOrders] = useState([]);
  const [skus, setSkus] = useState([]);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/returns');
      setReturns(Array.isArray(data) ? data : []);
    } catch {
      setReturns([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  const fetchFormData = async () => {
    try {
      const [orderRes, skuRes] = await Promise.all([
        API.get('/orders?limit=100'),
        API.get('/skus'),
      ]);
      setOrders(Array.isArray(orderRes.data) ? orderRes.data : (orderRes.data?.data || []));
      setSkus(Array.isArray(skuRes.data) ? skuRes.data : (skuRes.data?.data || []));
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (!form.orderId || !form.skuId || !form.quantity) {
      toast.error('Order, SKU, and quantity are required');
      return;
    }
    try {
      await API.post('/returns', form);
      toast.success('Return created');
      setShowCreate(false);
      setForm({ orderId: '', skuId: '', quantity: '', reason: '' });
      fetchReturns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create return');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await API.patch(`/returns/${id}/status`, { status });
      toast.success(`Return updated to ${status}`);
      fetchReturns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this return?')) return;
    try {
      await API.delete(`/returns/${id}`);
      toast.success('Return deleted');
      fetchReturns();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const filtered = returns.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.order?.orderNumber || '').toLowerCase().includes(q)
      || (r.sku?.skuCode || '').toLowerCase().includes(q)
      || (r.reason || '').toLowerCase().includes(q)
      || (r.id || '').toLowerCase().includes(q);
  });

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Returns Management</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <SampleCSVButton type="returns" />
          <ImportButton label="Returns" endpoint="returns" />
          <button onClick={() => { setShowCreate(true); fetchFormData(); }} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> New Return
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by Order, SKU, or reason..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7"><TableSkeleton rows={3} cols={7} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7"><EmptyState icon="returns" title="No returns found" description="Customer returns will appear here." /></td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium">{r.order?.orderNumber || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{r.order?.customerName || '—'}</td>
                  <td className="px-4 py-3 text-sm font-mono">{r.sku?.skuCode || '—'}</td>
                  <td className="px-4 py-3 text-sm">{r.quantity}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[120px] md:max-w-none">{r.reason || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_COLORS[r.status] || 'bg-slate-100 text-slate-600'}`}>
                      {r.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.status === 'REQUESTED' && (
                        <button onClick={() => handleStatusUpdate(r.id, 'RECEIVED')} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Mark Received</button>
                      )}
                      {r.status === 'RECEIVED' && (
                        <>
                          <button onClick={() => handleStatusUpdate(r.id, 'QC_PASSED')} className="text-xs text-green-600 hover:text-green-800 font-medium">Pass</button>
                          <button onClick={() => handleStatusUpdate(r.id, 'QC_FAILED')} className="text-xs text-red-600 hover:text-red-800 font-medium">Fail</button>
                        </>
                      )}
                      {r.status === 'QC_PASSED' && (
                        <button onClick={() => handleStatusUpdate(r.id, 'RESTOCKED')} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">Restock</button>
                      )}
                      <button onClick={() => handleDelete(r.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Create Return</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Order *</label>
                <select value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Select order</option>
                  {orders.map(o => <option key={o.id} value={o.id}>{o.orderNumber} — {o.customerName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">SKU *</label>
                <select value={form.skuId} onChange={e => setForm({ ...form, skuId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Select SKU</option>
                  {skus.map(s => <option key={s.id} value={s.id}>{s.skuCode} — {s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Quantity *</label>
                <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" min="1" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Reason</label>
                <input type="text" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Size mismatch, Defective" />
              </div>
            </div>
            <button onClick={handleCreate} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700">Create Return</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Returns;
