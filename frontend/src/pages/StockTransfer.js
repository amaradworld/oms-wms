import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, ArrowLeftRight } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const StockTransfer = () => {
  const { selectedFacility } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ fromWarehouseId: selectedFacility?.id || '', toWarehouseId: '', notes: '', items: [{ skuCode: '', quantity: 1 }] });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, wRes] = await Promise.all([API.get('/transfers'), API.get('/warehouses')]);
      setTransfers(Array.isArray(tRes.data) ? tRes.data : []);
      setWarehouses(Array.isArray(wRes.data) ? wRes.data : []);
    } catch { setTransfers([]); setWarehouses([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!form.fromWarehouseId || !form.toWarehouseId) return toast.error('Select source and destination');
    try {
      await API.post('/transfers', form);
      toast.success('Transfer created');
      setShowModal(false);
      setForm({ fromWarehouseId: selectedFacility?.id || '', toWarehouseId: '', notes: '', items: [{ skuCode: '', quantity: 1 }] });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleComplete = async (id) => {
    try {
      await API.put(`/transfers/${id}/complete`);
      toast.success('Transfer completed');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Insufficient stock'); }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { skuCode: '', quantity: 1 }] });

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Stock Transfer</h1>
          <p className="text-sm text-slate-500">Move inventory between facilities</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> New Transfer
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? <TableSkeleton rows={4} cols={5} /> : transfers.length === 0 ? <EmptyState icon="orders" title="No transfers" description="Transfer stock between facilities to balance inventory." />
        : <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">From</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">To</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Items</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">{t.fromWarehouse?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{t.toWarehouse?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{t.items?.length || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {t.status === 'DRAFT' && <button onClick={() => handleComplete(t.id)} className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm font-medium"><ArrowLeftRight size={14} /> Complete</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-lg font-bold">New Stock Transfer</h2><button onClick={() => setShowModal(false)}><X size={20} /></button></div>
            <div className="space-y-3">
              <select value={form.fromWarehouseId} onChange={e => setForm({ ...form, fromWarehouseId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Source Facility...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <select value={form.toWarehouseId} onChange={e => setForm({ ...form, toWarehouseId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Destination Facility...</option>
                {warehouses.filter(w => w.id !== form.fromWarehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center"><span className="text-sm font-semibold">Items</span><button onClick={addItem} className="text-xs text-blue-600">+ Add item</button></div>
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input placeholder="SKU Code" value={item.skuCode} onChange={e => { const items = [...form.items]; items[i].skuCode = e.target.value; setForm({ ...form, items }); }} className="flex-1 px-2 py-1.5 border rounded text-sm" />
                  <input type="number" placeholder="Qty" value={item.quantity} onChange={e => { const items = [...form.items]; items[i].quantity = parseInt(e.target.value) || 0; setForm({ ...form, items }); }} className="w-20 px-2 py-1.5 border rounded text-sm" />
                </div>
              ))}
            </div>
            <button onClick={handleCreate} disabled={!form.fromWarehouseId || !form.toWarehouseId} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">Create Transfer</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockTransfer;
