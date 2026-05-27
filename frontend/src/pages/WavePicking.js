import React, { useState, useEffect } from 'react';
import { Layers, Plus, ChevronDown, ChevronRight, CheckCircle, Clock, X, Play } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import Skeleton from '../components/Skeleton';

const STATUS_BADGE = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  PROCESSING: 'bg-blue-100 text-blue-800',
  PICKING: 'bg-indigo-100 text-indigo-800',
  PACKING: 'bg-cyan-100 text-cyan-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

const WavePicking = () => {
  const { selectedFacility } = useAuth();
  const [waves, setWaves] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [waveOrders, setWaveOrders] = useState(null);

  useEffect(() => {
    loadWaves();
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFacility]);

  const loadWaves = async () => {
    try {
      const params = selectedFacility ? { warehouseId: selectedFacility.id } : {};
      const { data } = await API.get('/waves', { params });
      setWaves(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadOrders = async () => {
    try {
      const { data } = await API.get('/orders');
      setOrders((data.orders || []).filter(o => o.orderStatus === 'PENDING' || o.orderStatus === 'PROCESSING'));
    } catch (e) { console.error(e); }
  };

  const createWave = async () => {
    if (!selectedOrders.length) return;
    if (!selectedFacility?.id) {
      toast.error('Select a warehouse/facility first');
      return;
    }
    try {
      await API.post('/waves', {
        warehouseId: selectedFacility.id,
        name,
        orderIds: selectedOrders,
      });
      toast.success(`Wave "${name || `Wave-${Date.now()}`}" created`);
      setShowCreate(false); setName(''); setSelectedOrders([]);
      loadWaves();
      loadOrders();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create wave');
      console.error(e);
    }
  };

  const toggleOrder = (id) => {
    setSelectedOrders(prev => prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]);
  };

  const expandWave = async (wave) => {
    if (expanded === wave.id) { setExpanded(null); setWaveOrders(null); return; }
    setExpanded(wave.id);
    try {
      const { data } = await API.get(`/waves/${wave.id}/orders`);
      setWaveOrders(data);
    } catch (e) { setWaveOrders(null); }
  };

  const startWave = async (id) => {
    try {
      await API.put(`/waves/${id}/start`);
      loadWaves();
    } catch (e) { console.error(e); }
  };

  const completeWave = async (id) => {
    try {
      await API.put(`/waves/${id}/complete`);
      loadWaves();
    } catch (e) { console.error(e); }
  };

  if (loading) return <Skeleton />;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Wave Picking</h1>
          <p className="text-slate-500 text-sm mt-1">Group orders into pick waves for batch processing</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <Plus size={18} /> New Wave
        </button>
      </div>

      {waves.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Layers size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No pick waves yet</p>
          <p className="text-sm mt-1">Create a wave to group orders for batch picking</p>
        </div>
      ) : (
        <div className="space-y-3">
          {waves.map(wave => (
            <div key={wave.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div onClick={() => expandWave(wave)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  {expanded === wave.id ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{wave.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[wave.status]}`}>{wave.status}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {wave.warehouse?.name} &middot; {wave._count?.orders || 0} orders &middot; {new Date(wave.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                {wave.status === 'PENDING' && (
                  <button onClick={(e) => { e.stopPropagation(); startWave(wave.id); }} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50">
                    <Play size={14} /> Start Picking
                  </button>
                )}
                {wave.status === 'IN_PROGRESS' && (
                  <button onClick={(e) => { e.stopPropagation(); completeWave(wave.id); }} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium px-3 py-1.5 rounded-lg hover:bg-green-50">
                    <CheckCircle size={14} /> Complete
                  </button>
                )}
              </div>
              {expanded === wave.id && waveOrders && (
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                  {waveOrders.orders?.map(wo => {
                    const orderStatus = wo.order?.orderStatus || wo.status;
                    return (
                      <div key={wo.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <div>
                          <span className="text-sm font-medium text-slate-700">{wo.order?.orderNumber}</span>
                          <span className="text-xs text-slate-400 ml-2">{wo.order?.customerName}</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[orderStatus] || 'bg-slate-100 text-slate-600'}`}>{orderStatus}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Create Pick Wave</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Wave Name (optional)</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Morning Wave 1" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Orders ({selectedOrders.length} selected)</label>
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                {orders.map(order => (
                  <label key={order.id} className={`flex items-center px-3 py-2.5 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 ${selectedOrders.includes(order.id) ? 'bg-blue-50' : ''}`}>
                    <input type="checkbox" checked={selectedOrders.includes(order.id)} onChange={() => toggleOrder(order.id)} className="mr-3" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-700">{order.orderNumber}</div>
                      <div className="text-xs text-slate-400 truncate">{order.customerName}</div>
                    </div>
                    <Clock size={14} className="text-slate-400" />
                  </label>
                ))}
                {orders.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No pending orders</p>}
              </div>
            </div>
            <button onClick={createWave} disabled={!selectedOrders.length} className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm">
              Create Wave ({selectedOrders.length} orders)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WavePicking;
