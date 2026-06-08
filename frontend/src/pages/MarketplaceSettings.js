import React, { useState, useEffect } from 'react';
import { RefreshCw, Link, Unlink, CheckCircle2, AlertCircle, Loader2, Store, Eye, EyeOff } from 'lucide-react';
import API from '../utils/api';
import { useConfirm } from '../components/ConfirmDialog';

const MARKETPLACE_LOGOS = {
  FLIPKART: '🛍️',
  NYKAA: '🎨',
  MYNTRA: '👕',
  TATACLIQ: '🔷',
};

const MarketplaceCard = ({ mp, config, onSave, onDelete, onSync, syncing }) => {
  const [editing, setEditing] = useState(!config);
  const [apiKey, setApiKey] = useState(config?.apiKey || '');
  const [apiSecret, setApiSecret] = useState(config?.apiSecret || '');
  const [sellerId, setSellerId] = useState(config?.sellerId || '');
  const [showSecret, setShowSecret] = useState(false);

  const handleSave = async () => {
    await onSave(mp, apiKey, apiSecret, sellerId);
    setEditing(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{MARKETPLACE_LOGOS[mp] || '🛒'}</span>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{mp}</h3>
            {config && (
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                config.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {config.isActive ? 'Connected' : 'Disconnected'}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {config && !editing && (
            <>
              <button
                onClick={() => onSync(mp)}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Sync Orders
              </button>
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50"
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {config && config.syncMessage && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
          config.syncStatus === 'error' ? 'bg-red-50 text-red-700' :
          config.syncStatus === 'syncing' ? 'bg-blue-50 text-blue-700' :
          config.syncStatus === 'idle' && config.lastSyncAt ? 'bg-green-50 text-green-700' :
          'bg-slate-50 text-slate-500'
        }`}>
          {config.syncStatus === 'error' ? <AlertCircle size={14} /> :
           config.syncStatus === 'syncing' ? <Loader2 size={14} className="animate-spin" /> :
           config.lastSyncAt ? <CheckCircle2 size={14} /> :
           <Store size={14} />}
          {config.syncMessage}
          {config.lastSyncAt && ` • Last sync: ${new Date(config.lastSyncAt).toLocaleString()}`}
        </div>
      )}

      {editing ? (
        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">API Key</label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">API Secret</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                placeholder="Enter API secret"
                className="w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Seller ID</label>
            <input
              type="text"
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
              placeholder="Enter seller ID (if applicable)"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Link size={14} className="inline mr-1" /> Save & Connect
            </button>
            {config && (
              <button onClick={() => { setEditing(false); }} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
            )}
          </div>
          {config && (
            <button
              onClick={() => onDelete(mp)}
              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 pt-1"
            >
              <Unlink size={12} /> Remove connection
            </button>
          )}
        </div>
      ) : (
        !config && (
          <div className="text-center py-4">
            <p className="text-sm text-slate-500 mb-3">Not configured yet</p>
            <button
              onClick={() => setEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              <Link size={14} className="inline mr-1" /> Connect {mp}
            </button>
          </div>
        )
      )}
    </div>
  );
};

const MarketplaceSettings = () => {
  const confirm = useConfirm();
  const [connectors, setConnectors] = useState([]);
  const [configs, setConfigs] = useState({});
  const [syncing, setSyncing] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    API.get('/marketplace/connectors').then(r => setConnectors(r.data));
    API.get('/marketplace/configs').then(r => {
      const map = {};
      r.data.forEach(c => { map[c.marketplace] = c; });
      setConfigs(map);
    });
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (mp, apiKey, apiSecret, sellerId) => {
    try {
      const res = await API.post('/marketplace/configs', { marketplace: mp, apiKey, apiSecret, sellerId });
      setConfigs(prev => ({ ...prev, [mp]: res.data }));
      showToast(`${mp} connected successfully`);
    } catch {
      showToast(`Failed to connect ${mp}`, 'error');
    }
  };

  const handleDelete = async (mp) => {
    if (!await confirm({
      title: `Disconnect ${mp}?`,
      message: `This will remove the ${mp} integration. Order sync and inventory pushes will stop. The integration can be re-added later.`,
      confirmText: 'Disconnect',
      variant: 'danger',
    })) return;
    try {
      await API.delete(`/marketplace/configs/${mp}`);
      setConfigs(prev => { const n = { ...prev }; delete n[mp]; return n; });
      showToast(`${mp} disconnected`);
    } catch {
      showToast(`Failed to disconnect ${mp}`, 'error');
    }
  };

  const handleSync = async (mp) => {
    setSyncing(mp);
    try {
      const res = await API.post(`/marketplace/sync/${mp}`);
      showToast(res.data.message);
      const statusRes = await API.get(`/marketplace/sync/${mp}/status`);
      setConfigs(prev => ({ ...prev, [mp]: { ...prev[mp], ...statusRes.data } }));
    } catch (err) {
      showToast(err.response?.data?.message || 'Sync failed', 'error');
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">Marketplace Integrations</h1>
        <p className="text-xs md:text-sm text-slate-500 mt-1">Connect your online stores to automatically import orders</p>
      </div>

      <div className="grid gap-4">
        {connectors.map(c => (
          <MarketplaceCard
            key={c.id}
            mp={c.id}
            config={configs[c.id]}
            onSave={handleSave}
            onDelete={handleDelete}
            onSync={handleSync}
            syncing={syncing === c.id}
          />
        ))}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default MarketplaceSettings;
