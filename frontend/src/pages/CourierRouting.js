import React, { useState, useEffect } from 'react';
import { Truck, Plus, Edit3, Trash2, Search, X, RefreshCw, Loader2 } from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';

const SPEED_COLORS = {
  express: 'bg-purple-100 text-purple-700',
  standard: 'bg-blue-100 text-blue-700',
  economy: 'bg-slate-100 text-slate-600',
};

const CourierRouting = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestResult, setSuggestResult] = useState(null);
  const [form, setForm] = useState({
    courierName: '', isActive: true, priority: 10,
    pincodePrefixes: '', minWeight: '', maxWeight: '',
    minOrderValue: '', maxOrderValue: '', speedTier: 'standard',
  });
  const [suggestForm, setSuggestForm] = useState({
    pincode: '', weight: '', orderValue: '',
  });
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/courier/routing');
      setConfigs(data || []);
    } catch (e) {
      toast.error('Failed to load routing configs');
      setConfigs([]);
    }
    setLoading(false);
  };

  useEffect(() => { loadConfigs(); }, []);

  const openEdit = (cfg) => {
    setForm({
      courierName: cfg.courierName,
      isActive: cfg.isActive,
      priority: cfg.priority,
      pincodePrefixes: cfg.pincodePrefixes || '',
      minWeight: cfg.minWeight ?? '',
      maxWeight: cfg.maxWeight ?? '',
      minOrderValue: cfg.minOrderValue ?? '',
      maxOrderValue: cfg.maxOrderValue ?? '',
      speedTier: cfg.speedTier,
    });
    setEditing(cfg.id);
    setShowForm(true);
  };

  const openCreate = () => {
    setForm({ courierName: '', isActive: true, priority: 10, pincodePrefixes: '', minWeight: '', maxWeight: '', minOrderValue: '', maxOrderValue: '', speedTier: 'standard' });
    setEditing(null);
    setShowForm(true);
  };

  const saveConfig = async () => {
    if (!form.courierName) { toast.error('Courier name is required'); return; }
    setSaving(true);
    try {
      await API.post('/courier/routing', {
        ...form,
        minWeight: form.minWeight === '' ? null : Number(form.minWeight),
        maxWeight: form.maxWeight === '' ? null : Number(form.maxWeight),
        minOrderValue: form.minOrderValue === '' ? null : Number(form.minOrderValue),
        maxOrderValue: form.maxOrderValue === '' ? null : Number(form.maxOrderValue),
      });
      toast.success(editing ? 'Config updated' : 'Config created');
      setShowForm(false);
      loadConfigs();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    }
    setSaving(false);
  };

  const deleteConfig = async (id) => {
    if (!window.confirm('Delete this routing config?')) return;
    try {
      await API.delete(`/courier/routing/${id}`);
      toast.success('Config deleted');
      loadConfigs();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete');
    }
  };

  const runSuggest = async () => {
    setSuggesting(true);
    try {
      const { data } = await API.post('/courier/routing/suggest', {
        pincode: suggestForm.pincode || undefined,
        weight: suggestForm.weight === '' ? undefined : Number(suggestForm.weight),
        orderValue: suggestForm.orderValue === '' ? undefined : Number(suggestForm.orderValue),
      });
      setSuggestResult(data);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to suggest');
    }
    setSuggesting(false);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Courier Routing</h1>
          <p className="text-sm text-slate-500 mt-1">Configure auto-assignment rules for courier selection</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowSuggest(true); setSuggestResult(null); }} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">
            <Search size={14} /> Suggest
          </button>
          <button onClick={() => loadConfigs()} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus size={16} /> Add Rule
          </button>
        </div>
      </div>

      {loading ? <TableSkeleton rows={4} cols={7} /> : configs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Truck size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No routing rules</p>
          <p className="text-sm mt-1">Add rules to auto-assign couriers by pincode, weight, and order value</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Courier</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Priority</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Pincode Prefixes</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Weight Range</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Order Value</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Speed</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {configs.map(c => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium">{c.courierName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.priority}</td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-600">{c.pincodePrefixes || '*'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.minWeight != null ? `${c.minWeight}-${c.maxWeight ?? '∞'} kg` : 'Any'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.minOrderValue != null ? `₹${c.minOrderValue}-${c.maxOrderValue ?? '∞'}` : 'Any'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SPEED_COLORS[c.speedTier] || SPEED_COLORS.standard}`}>{c.speedTier}</span></td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600"><Edit3 size={14} /></button>
                        <button onClick={() => deleteConfig(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editing ? 'Edit Rule' : 'Add Rule'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Courier Name</label>
                <input type="text" value={form.courierName} onChange={e => setForm({ ...form, courierName: e.target.value.toUpperCase() })} placeholder="SHIPROCKET" className="input-field text-sm disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed" disabled={!!editing} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                  <input type="number" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Speed Tier</label>
                  <select value={form.speedTier} onChange={e => setForm({ ...form, speedTier: e.target.value })} className="input-field text-sm">
                    <option value="express">Express</option>
                    <option value="standard">Standard</option>
                    <option value="economy">Economy</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Pincode Prefixes</label>
                <input type="text" value={form.pincodePrefixes} onChange={e => setForm({ ...form, pincodePrefixes: e.target.value })} placeholder="10,11,12 or * for all" className="input-field text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Min Weight (kg)</label>
                  <input type="number" step="0.1" value={form.minWeight} onChange={e => setForm({ ...form, minWeight: e.target.value })} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Max Weight (kg)</label>
                  <input type="number" step="0.1" value={form.maxWeight} onChange={e => setForm({ ...form, maxWeight: e.target.value })} className="input-field text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Min Order Value (₹)</label>
                  <input type="number" value={form.minOrderValue} onChange={e => setForm({ ...form, minOrderValue: e.target.value })} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Max Order Value (₹)</label>
                  <input type="number" value={form.maxOrderValue} onChange={e => setForm({ ...form, maxOrderValue: e.target.value })} className="input-field text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                Active
              </label>
              <button onClick={saveConfig} disabled={saving} className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium text-sm mt-2 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null} {saving ? 'Saving...' : `${editing ? 'Update' : 'Create'} Rule`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuggest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSuggest(false)}>
          <div className="bg-white rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Suggest Courier</h2>
              <button onClick={() => setShowSuggest(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Pincode</label>
                <input type="text" value={suggestForm.pincode} onChange={e => setSuggestForm({ ...suggestForm, pincode: e.target.value })} placeholder="110001" className="input-field text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" value={suggestForm.weight} onChange={e => setSuggestForm({ ...suggestForm, weight: e.target.value })} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Order Value (₹)</label>
                  <input type="number" value={suggestForm.orderValue} onChange={e => setSuggestForm({ ...suggestForm, orderValue: e.target.value })} className="input-field text-sm" />
                </div>
              </div>
              <button onClick={runSuggest} disabled={suggesting} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2">
                {suggesting ? <Loader2 size={16} className="animate-spin" /> : null} {suggesting ? 'Suggesting...' : 'Suggest'}
              </button>
            </div>
            {suggestResult && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                {suggestResult.suggested ? (
                  <>
                    <p className="text-sm font-semibold text-emerald-700">✓ {suggestResult.suggested.courierName}</p>
                    <p className="text-xs text-slate-500">Priority: {suggestResult.suggested.priority} &middot; Speed: {suggestResult.suggested.speedTier}</p>
                    {suggestResult.candidates.length > 1 && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <p className="text-xs font-medium text-slate-500 mb-1">All matched:</p>
                        {suggestResult.candidates.map((c, i) => (
                          <p key={i} className="text-xs text-slate-600">{i + 1}. {c.courierName} (priority {c.priority})</p>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-amber-700 font-medium">No rule matched</p>
                    <p className="text-xs text-slate-500">Fallback: {suggestResult.fallback?.join(', ') || 'None'}</p>
                  </>
                )}
                <p className="text-xs text-slate-400 mt-1">{suggestResult.message}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierRouting;
