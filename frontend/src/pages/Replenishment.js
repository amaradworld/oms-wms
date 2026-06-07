import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Plus, RefreshCw, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';

const Replenishment = () => {
  const confirm = useConfirm();
  const { selectedFacility } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ skuId: '', fromBin: '', toBin: '', quantity: 10, priority: 'MEDIUM', notes: '' });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (filter) params.status = filter;
    try {
      const res = await API.get('/replenishment', { params });
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch { setTasks([]); } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.skuId || !form.toBin || !form.quantity) return toast.error('SKU, bin, and quantity required');
    try {
      const payload = { ...form, warehouseId: selectedFacility?.id, quantity: Number(form.quantity) };
      await API.post('/replenishment', payload);
      toast.success('Replenishment task created');
      setShowCreate(false);
      setForm({ skuId: '', fromBin: '', toBin: '', quantity: 10, priority: 'MEDIUM', notes: '' });
      fetchTasks();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleComplete = async (id) => {
    try {
      await API.put(`/replenishment/${id}/complete`);
      toast.success('Task completed');
      fetchTasks();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleCancel = async (id) => {
    if (!await confirm({
      title: 'Cancel this replenishment task?',
      message: 'The task will be marked as cancelled. Pickers will not see it. You can create a new task later.',
      confirmText: 'Cancel task',
      variant: 'warning',
    })) return;
    try {
      await API.put(`/replenishment/${id}/cancel`);
      toast.success('Task cancelled');
      fetchTasks();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleGenerate = async () => {
    try {
      const res = await API.post('/replenishment/generate', {}, { params: selectedFacility ? { warehouseId: selectedFacility.id } : {} });
      toast.success(`${res.data.created} tasks auto-generated from low stock alerts`);
      fetchTasks();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const priorityColors = { LOW: 'bg-slate-100 text-slate-600', MEDIUM: 'bg-blue-100 text-blue-700', HIGH: 'bg-amber-100 text-amber-700', CRITICAL: 'bg-rose-100 text-rose-700' };
  const statusColors = { PENDING: 'bg-slate-100 text-slate-600', IN_PROGRESS: 'bg-blue-100 text-blue-700', COMPLETED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-slate-100 text-slate-400' };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Layers size={20} /> Replenishment</h1>
          <p className="text-sm text-slate-500">Stock movement tasks from reserve to pick-face</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleGenerate} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"><AlertTriangle size={14} /> Generate from Alerts</button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"><Plus size={14} /> Create Task</button>
          <button onClick={fetchTasks} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border rounded-lg hover:bg-slate-50"><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 text-xs rounded-lg font-medium ${filter === s ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? <TableSkeleton rows={5} /> : tasks.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center text-slate-400">
          <p>No replenishment tasks</p>
          <button onClick={handleGenerate} className="mt-3 text-sm text-blue-600 hover:underline">Generate from low stock alerts</button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-slate-50 text-slate-600">
                <th className="text-left px-4 py-3">SKU</th>
                <th className="text-left px-4 py-3">From → To Bin</th>
                <th className="text-right px-4 py-3">Qty</th>
                <th className="text-left px-4 py-3">Priority</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr></thead>
              <tbody className="divide-y">
                {tasks.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><span className="font-mono text-xs">{t.sku?.skuCode}</span><br /><span className="text-xs text-slate-500">{t.sku?.name}</span></td>
                    <td className="px-4 py-3 text-xs font-mono">{t.fromBin || '—'} → {t.toBin}</td>
                    <td className="px-4 py-3 text-right font-medium">{t.quantity}</td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${priorityColors[t.priority]}`}>{t.priority}</span></td>
                    <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColors[t.status]}`}>{t.status}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {t.status === 'PENDING' && (
                          <button onClick={() => handleComplete(t.id)} className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200" title="Complete"><Check size={14} /></button>
                        )}
                        {(t.status === 'PENDING' || t.status === 'IN_PROGRESS') && (
                          <button onClick={() => handleCancel(t.id)} className="p-1.5 bg-slate-100 text-slate-500 rounded hover:bg-slate-200" title="Cancel"><X size={14} /></button>
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
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Create Replenishment Task</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <input placeholder="SKU ID" value={form.skuId} onChange={e => setForm({...form, skuId: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="From Bin (optional)" value={form.fromBin} onChange={e => setForm({...form, fromBin: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                <input placeholder="To Bin *" value={form.toBin} onChange={e => setForm({...form, toBin: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Quantity" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm">
                  <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>
                </select>
              </div>
              <textarea placeholder="Notes (optional)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Replenishment;
