import React, { useState, useEffect, useRef } from 'react';
import { Layers, Plus, ChevronDown, ChevronRight, CheckCircle, Clock, X, Play, QrCode, Loader2, Package } from 'lucide-react';
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
  PICKED: 'bg-emerald-100 text-emerald-700',
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
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanOrderId, setScanOrderId] = useState(null);
  const scanRef = useRef(null);

  useEffect(() => {
    loadWaves();
    loadOrders();
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
    }
  };

  const toggleOrder = (id) => {
    setSelectedOrders(prev => prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]);
  };

  const expandWave = async (wave) => {
    if (expanded === wave.id) { setExpanded(null); setWaveOrders(null); setScanOrderId(null); return; }
    setExpanded(wave.id);
    try {
      const { data } = await API.get(`/waves/${wave.id}/orders`);
      setWaveOrders(data);
      if (data.orders?.length) setScanOrderId(data.orders[0].orderId);
    } catch (e) { setWaveOrders(null); }
  };

  const startWave = async (id) => {
    try {
      await API.put(`/waves/${id}/start`);
      toast.success('Wave started');
      loadWaves();
    } catch (e) { toast.error('Failed to start wave'); }
  };

  const completeWave = async (id) => {
    try {
      await API.put(`/waves/${id}/complete`);
      toast.success('Wave completed');
      loadWaves();
    } catch (e) { toast.error('Failed to complete wave'); }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanInput.trim() || !scanOrderId || !expanded) return;
    setScanning(true);
    try {
      const { data } = await API.post(`/waves/${expanded}/scan-item`, {
        skuCode: scanInput.trim(),
        orderId: scanOrderId,
      });
      toast.success(data.message);
      const refreshed = await API.get(`/waves/${expanded}/orders`);
      setWaveOrders(refreshed.data);
      setScanInput('');
      scanRef.current?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Scan failed');
      setScanInput('');
      scanRef.current?.focus();
    } finally {
      setScanning(false);
    }
  };

  const handleConfirmShortPick = async (orderId) => {
    try {
      await API.post(`/waves/${expanded}/confirm-order`, { orderId });
      toast.success('Short pick confirmed — order moved to PACKING');
      const refreshed = await API.get(`/waves/${expanded}/orders`);
      setWaveOrders(refreshed.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm');
    }
  };

  if (loading) return <Skeleton />;

  const currentOrderItems = waveOrders?.orders?.find(o => o.orderId === scanOrderId)?.order?.items || [];

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
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    {waveOrders.orders?.map(wo => {
                      const allPicked = wo.order?.items?.every(i => i.status === 'PICKED');
                      return (
                        <button key={wo.id} onClick={() => setScanOrderId(wo.orderId)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${scanOrderId === wo.orderId ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>
                          <Package size={13} />
                          {wo.order?.orderNumber}
                          {allPicked && <CheckCircle size={12} className="text-green-500" />}
                        </button>
                      );
                    })}
                  </div>

                  {currentOrderItems.length > 0 && (
                    <>
                      <form onSubmit={handleScan} className="flex gap-2">
                        <div className="relative flex-1">
                          <QrCode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            ref={scanRef}
                            autoFocus
                            type="text"
                            value={scanInput}
                            onChange={e => setScanInput(e.target.value)}
                            placeholder="Scan SKU barcode to verify..."
                            className="w-full pl-9 pr-3 py-2 border-2 rounded-xl font-mono text-sm outline-none focus:ring-4 focus:ring-blue-200"
                          />
                        </div>
                        <button type="submit" disabled={scanning} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                          {scanning ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                          Verify
                        </button>
                      </form>

                      <table className="w-full text-left text-sm">
                        <thead className="bg-white border-b">
                          <tr>
                            <th className="px-3 py-2 text-xs font-semibold text-slate-500">SKU</th>
                            <th className="px-3 py-2 text-xs font-semibold text-slate-500">Product</th>
                            <th className="px-3 py-2 text-xs font-semibold text-slate-500 text-right">Order Qty</th>
                            <th className="px-3 py-2 text-xs font-semibold text-slate-500 text-right">Scanned</th>
                            <th className="px-3 py-2 text-xs font-semibold text-slate-500">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentOrderItems.map((item, i) => {
                            const scanned = item.scannedQty || 0;
                            const partial = scanned > 0 && scanned < item.quantity;
                            return (
                              <tr key={item.id || i} className="border-b border-slate-100">
                                <td className="px-3 py-2 font-mono text-xs">{item.sku?.skuCode}</td>
                                <td className="px-3 py-2 text-slate-600">{item.sku?.name || '—'}</td>
                                <td className="px-3 py-2 text-right font-medium">{item.quantity}</td>
                                <td className="px-3 py-2 text-right">
                                  <span className={`font-mono text-xs ${partial ? 'text-amber-600 font-semibold' : scanned === item.quantity ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {scanned}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  {item.status === 'PICKED' ? (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ Picked</span>
                                  ) : scanned > 0 ? (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Partial ({scanned}/{item.quantity})</span>
                                  ) : (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Pending</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {currentOrderItems.some(i => (i.scannedQty || 0) > 0 && i.status !== 'PICKED') && (
                        <div className="flex justify-end pt-1">
                          <button onClick={() => handleConfirmShortPick(scanOrderId)}
                            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors">
                            Process with Short Pick ({currentOrderItems.filter(i => i.status !== 'PICKED').length} items remaining)
                          </button>
                        </div>
                      )}
                    </>
                  )}
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
