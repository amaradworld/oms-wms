import React, { useState, useEffect } from 'react';
import { Plus, X, Loader2, Globe, RefreshCw, Link, Power, PowerOff, Settings } from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const INTEGRATION_PLATFORMS = [
  { id: 'shopify', label: 'Shopify' },
  { id: 'woocommerce', label: 'WooCommerce' },
  { id: 'amazon', label: 'Amazon SP-API' },
  { id: 'flipkart', label: 'Flipkart' },
  { id: 'nykaa', label: 'Nykaa' },
  { id: 'myntra', label: 'Myntra' },
  { id: 'custom', label: 'Custom API' },
];

const Integrations = () => {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [syncing, setSyncing] = useState(null);
  const [form, setForm] = useState({
    name: '', platform: 'custom', apiBaseUrl: '', apiKey: '', apiSecret: '',
    accessToken: '', webhookUrl: '', syncInventory: true, syncOrders: false, syncProducts: false,
    config: '',
  });

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/integrations');
      setIntegrations(Array.isArray(data) ? data : []);
    } catch { setIntegrations([]); } finally { setLoading(false); }
  };

  useEffect(() => { fetchIntegrations(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', platform: 'custom', apiBaseUrl: '', apiKey: '', apiSecret: '', accessToken: '', webhookUrl: '', syncInventory: true, syncOrders: false, syncProducts: false, config: '' });
    setShowModal(true);
  };

  const openEdit = (int) => {
    setEditing(int);
    setForm({
      name: int.name, platform: int.platform, apiBaseUrl: int.apiBaseUrl || '',
      apiKey: int.apiKey || '', apiSecret: int.apiSecret || '', accessToken: int.accessToken || '',
      webhookUrl: int.webhookUrl || '', syncInventory: int.syncInventory || false,
      syncOrders: int.syncOrders || false, syncProducts: int.syncProducts || false,
      config: int.config ? JSON.stringify(int.config, null, 2) : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name) { toast.error('Integration name is required'); return; }
    try {
      const payload = {
        ...form,
        config: form.config ? (() => { try { return JSON.parse(form.config); } catch { return form.config; } })() : undefined,
      };
      if (editing) {
        await API.put(`/integrations/${editing.id}`, payload);
        toast.success('Integration updated');
      } else {
        await API.post('/integrations', payload);
        toast.success('Integration added');
      }
      setShowModal(false);
      fetchIntegrations();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this integration?')) return;
    try {
      await API.delete(`/integrations/${id}`);
      toast.success('Integration deleted');
      fetchIntegrations();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const handleSync = async (id) => {
    setSyncing(id);
    try {
      const { data } = await API.post(`/integrations/${id}/sync`);
      toast.success(`Sync completed: ${data.message}`);
      fetchIntegrations();
    } catch (err) { toast.error(err.response?.data?.message || 'Sync failed'); }
    finally { setSyncing(null); }
  };

  const toggleActive = async (int) => {
    try {
      await API.put(`/integrations/${int.id}`, { isActive: !int.isActive });
      toast.success(int.isActive ? 'Integration disabled' : 'Integration enabled');
      fetchIntegrations();
    } catch (err) { toast.error(err.response?.data?.message || 'Toggle failed'); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Integrations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Connect external platforms for inventory sync</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Add Integration
        </button>
      </div>

      {loading ? <TableSkeleton rows={4} cols={5} /> : !integrations.length ? (
        <EmptyState icon="globe" title="No integrations" description="Connect your marketplace or ERP platforms to auto-sync inventory.">
          <button onClick={openCreate} className="mt-3 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> Add Integration
          </button>
        </EmptyState>
      ) : (
        <div className="grid gap-4">
          {integrations.map(int => (
            <div key={int.id} className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`p-2.5 rounded-lg ${int.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Globe size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{int.name}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${int.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {int.platform}
                    </span>
                    {int.lastSyncAt && (
                      <span className="text-[10px] text-slate-400">Last sync: {new Date(int.lastSyncAt).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    <span className={`text-[10px] flex items-center gap-1 ${int.syncInventory ? 'text-blue-600' : 'text-slate-400'}`}>
                      <RefreshCw size={10} /> Inventory {int.syncInventory ? 'enabled' : 'disabled'}
                    </span>
                    {int.apiBaseUrl && <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{int.apiBaseUrl}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => handleSync(int.id)} disabled={syncing === int.id || !int.isActive} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors">
                  {syncing === int.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Sync
                </button>
                <button onClick={() => openEdit(int)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                  <Settings size={16} />
                </button>
                <button onClick={() => toggleActive(int)} className={`p-1.5 rounded-lg transition-colors ${int.isActive ? 'hover:bg-amber-50 text-slate-400 hover:text-amber-600' : 'hover:bg-emerald-50 text-slate-400 hover:text-emerald-600'}`}>
                  {int.isActive ? <PowerOff size={16} /> : <Power size={16} />}
                </button>
                <button onClick={() => handleDelete(int.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500">
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing ? 'Edit Integration' : 'New Integration'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Platform *</label>
                <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className="input-field">
                  {INTEGRATION_PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Integration Name *</label>
                <input type="text" className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Shopify Store" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">API Base URL</label>
                <input type="text" className="input-field" value={form.apiBaseUrl} onChange={e => setForm({ ...form, apiBaseUrl: e.target.value })} placeholder="https://your-store.com/api" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">API Key</label>
                  <input type="text" className="input-field" value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} placeholder="API key" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">API Secret</label>
                  <input type="text" className="input-field" value={form.apiSecret} onChange={e => setForm({ ...form, apiSecret: e.target.value })} placeholder="API secret" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Access Token</label>
                <input type="text" className="input-field" value={form.accessToken} onChange={e => setForm({ ...form, accessToken: e.target.value })} placeholder="Bearer token for auth" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Webhook URL</label>
                <input type="text" className="input-field" value={form.webhookUrl} onChange={e => setForm({ ...form, webhookUrl: e.target.value })} placeholder="https://your-app.com/webhook" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Sync Settings</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.syncInventory} onChange={e => setForm({ ...form, syncInventory: e.target.checked })} className="rounded border-slate-300" />
                    Sync Inventory
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.syncOrders} onChange={e => setForm({ ...form, syncOrders: e.target.checked })} className="rounded border-slate-300" />
                    Sync Orders
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.syncProducts} onChange={e => setForm({ ...form, syncProducts: e.target.checked })} className="rounded border-slate-300" />
                    Sync Products
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Custom Config (JSON)</label>
                <textarea className="input-field font-mono text-xs" rows={4} value={form.config} onChange={e => setForm({ ...form, config: e.target.value })} placeholder='{ "field_mapping": { "sku": "product_code" } }' />
              </div>
            </div>
            <button onClick={handleSave} className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              <Link size={16} /> {editing ? 'Update Integration' : 'Connect Platform'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;
