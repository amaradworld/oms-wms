import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Search, Plus, X, Loader2 } from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { useConfirm } from '../components/ConfirmDialog';

const STATUS_COLORS = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  DISPATCHED: 'bg-purple-100 text-purple-700',
  RECEIVED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

const TYPE_COLORS = {
  INCOMING: 'bg-blue-50 text-blue-700',
  RETURN: 'bg-orange-50 text-orange-700',
  STOCK_TRANSFER: 'bg-teal-50 text-teal-700',
  MANUAL: 'bg-slate-50 text-slate-600',
};

const GatepassOrder = () => {
  const confirm = useConfirm();
  const [gatepasses, setGatepasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [skus, setSkus] = useState([]);
  const [form, setForm] = useState({ type: 'INCOMING', toParty: '', expectedDate: '', notes: '', items: [{ skuId: '', quantity: 1 }] });

  const fetchGatepasses = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/gatepass');
      setGatepasses(data?.gatepasses || (Array.isArray(data) ? data : []));
    } catch {
      setGatepasses([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGatepasses(); }, [fetchGatepasses]);

  const fetchSkus = async () => {
    try {
      const { data } = await API.get('/skus');
      setSkus(Array.isArray(data) ? data : (data?.data || []));
    } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    if (!form.toParty) { toast.error('To Party is required'); return; }
    const validItems = form.items.filter(i => i.skuId && i.quantity > 0);
    if (!validItems.length) { toast.error('Add at least one SKU item'); return; }
    try {
      await API.post('/gatepass', {
        type: form.type,
        toParty: form.toParty,
        expectedDate: form.expectedDate || null,
        notes: form.notes,
        quantity: validItems.reduce((s, i) => s + i.quantity, 0),
        items: validItems,
      });
      toast.success('Gatepass created');
      setShowCreate(false);
      setForm({ type: 'INCOMING', toParty: '', expectedDate: '', notes: '', items: [{ skuId: '', quantity: 1 }] });
      fetchGatepasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create gatepass');
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await API.patch(`/gatepass/${id}/status`, { status });
      toast.success(`Gatepass ${status.toLowerCase()}`);
      fetchGatepasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleDelete = async (id, code) => {
    if (!await confirm({ title: `Delete ${code}?`, message: 'This gatepass will be permanently removed.', confirmText: 'Delete', variant: 'danger' })) return;
    try {
      await API.delete(`/gatepass/${id}`);
      toast.success('Gatepass deleted');
      fetchGatepasses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { skuId: '', quantity: 1 }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: field === 'quantity' ? parseInt(value) || 1 : value };
    setForm({ ...form, items });
  };

  const filtered = gatepasses.filter(gp => {
    if (filterType !== 'ALL' && gp.type !== filterType) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (gp.code || '').toLowerCase().includes(q) || (gp.toParty || '').toLowerCase().includes(q) || (gp.notes || '').toLowerCase().includes(q);
  });

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><FileText size={24} /> Gatepass Orders</h1>
          <p className="text-xs text-slate-500 mt-1">Manage incoming, return, and stock transfer gatepasses</p>
        </div>
        <button onClick={() => { setShowCreate(true); fetchSkus(); }} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> New Gatepass
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by code, party, or notes..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="ALL">All Types</option>
          <option value="INCOMING">Incoming</option>
          <option value="RETURN">Return</option>
          <option value="STOCK_TRANSFER">Stock Transfer</option>
          <option value="MANUAL">Manual</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[750px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Code</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">To Party</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Items</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Created</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7"><TableSkeleton rows={3} cols={7} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7"><EmptyState icon="gatepass" title="No gatepasses found" description="Create a gatepass to start dispatching or receiving goods." /></td></tr>
              ) : filtered.map(gp => (
                <tr key={gp.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium">{gp.code}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${TYPE_COLORS[gp.type] || ''}`}>{gp.type}</span></td>
                  <td className="px-4 py-3 text-sm">{gp.toParty || '—'}</td>
                  <td className="px-4 py-3 text-sm">{gp.items?.length || 0} SKUs</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[gp.status] || ''}`}>{gp.status}</span></td>
                  <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{new Date(gp.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {gp.status === 'PENDING' && <button onClick={() => handleStatusUpdate(gp.id, 'APPROVED')} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Approve</button>}
                      {gp.status === 'APPROVED' && <button onClick={() => handleStatusUpdate(gp.id, 'DISPATCHED')} className="text-xs text-purple-600 hover:text-purple-800 font-medium">Dispatch</button>}
                      {gp.status === 'DISPATCHED' && <button onClick={() => handleStatusUpdate(gp.id, 'RECEIVED')} className="text-xs text-green-600 hover:text-green-800 font-medium">Receive</button>}
                      {(gp.status === 'PENDING' || gp.status === 'APPROVED') && (
                        <button onClick={() => handleDelete(gp.id, gp.code)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                      )}
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">New Gatepass</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Type *</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="INCOMING">Incoming</option>
                    <option value="RETURN">Return</option>
                    <option value="STOCK_TRANSFER">Stock Transfer</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">To Party *</label>
                  <input type="text" value={form.toParty} onChange={e => setForm({ ...form, toParty: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Vendor or facility name" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Expected Date</label>
                  <input type="date" value={form.expectedDate} onChange={e => setForm({ ...form, expectedDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                  <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Optional notes" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-500">Items *</label>
                  <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add SKU</button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select value={item.skuId} onChange={e => updateItem(idx, 'skuId', e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">Select SKU</option>
                        {skus.map(s => <option key={s.id} value={s.id}>{s.skuCode} — {s.name}</option>)}
                      </select>
                      <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="w-20 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" min="1" />
                      {form.items.length > 1 && <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><X size={14} /></button>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleCreate} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700">Create Gatepass</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GatepassOrder;
