import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, ChevronDown, ChevronRight, Download, CheckCircle, X, Search, Truck } from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';
import Skeleton from '../components/Skeleton';

const STATUS_BADGE = {
  OPEN: 'bg-blue-100 text-blue-800',
  CLOSED: 'bg-green-100 text-green-800',
};

const Manifests = () => {
  const [manifests, setManifests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [manifestDetail, setManifestDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [courierFilter, setCourierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [shippedOrders, setShippedOrders] = useState([]);
  const [availableCouriers, setAvailableCouriers] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  const loadManifests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (courierFilter) params.courier = courierFilter;
      if (statusFilter) params.status = statusFilter;
      const { data } = await API.get('/manifests', { params });
      setManifests(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [courierFilter, statusFilter]);

  useEffect(() => { loadManifests(); }, [loadManifests]);

  const openCreate = async () => {
    try {
      const { data } = await API.get('/manifests/shipped-orders');
      setShippedOrders(data.orders || []);
      setAvailableCouriers(data.couriers || []);
    } catch (e) { console.error(e); }
    setSelectedCourier('');
    setSelectedOrderIds([]);
    setShowCreate(true);
  };

  const filteredOrders = selectedCourier
    ? shippedOrders.filter(o => o.tracking?.courierName === selectedCourier)
    : shippedOrders;

  const toggleOrder = (id) => {
    setSelectedOrderIds(prev => prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]);
  };

  const selectAllFiltered = () => {
    const ids = filteredOrders.map(o => o.id);
    const allSelected = ids.every(id => selectedOrderIds.includes(id));
    setSelectedOrderIds(allSelected ? selectedOrderIds.filter(id => !ids.includes(id)) : [...selectedOrderIds, ...ids]);
  };

  const createManifest = async () => {
    if (!selectedCourier || !selectedOrderIds.length) {
      toast.error('Select a courier and at least one order');
      return;
    }
    try {
      await API.post('/manifests', { courierName: selectedCourier, orderIds: selectedOrderIds });
      toast.success('Manifest created');
      setShowCreate(false);
      loadManifests();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create manifest');
    }
  };

  const expandManifest = async (id) => {
    if (expanded === id) { setExpanded(null); setManifestDetail(null); return; }
    setExpanded(id);
    try {
      const { data } = await API.get(`/manifests/${id}`);
      setManifestDetail(data);
    } catch (e) { setManifestDetail(null); }
  };

  const closeManifest = async (id) => {
    if (!window.confirm('Close this manifest? Orders will be marked as DISPATCHED.')) return;
    try {
      await API.patch(`/manifests/${id}/close`);
      toast.success('Manifest closed');
      loadManifests();
      if (expanded === id) {
        setManifestDetail(prev => prev ? { ...prev, status: 'CLOSED', closedAt: new Date().toISOString() } : prev);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to close manifest');
    }
  };

  const downloadPdf = async (id) => {
    try {
      const response = await API.get(`/manifests/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const disposition = response.headers['content-disposition'];
      const filename = disposition ? disposition.split('filename=')[1] : `manifest_${id}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Failed to download PDF');
    }
  };

  const allFilteredSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manifests</h1>
          <p className="text-slate-500 text-sm mt-1">Group shipped orders by courier for handover</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
          <Plus size={18} /> New Manifest
        </button>
      </div>

      <div className="card p-3 mb-4 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2">
          <Truck size={16} className="text-slate-400 flex-shrink-0" />
          <select value={courierFilter} onChange={e => setCourierFilter(e.target.value)} className="input-field text-sm">
            <option value="">All Couriers</option>
            {availableCouriers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Package size={16} className="text-slate-400 flex-shrink-0" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field text-sm">
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {loading ? <Skeleton /> : manifests.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Package size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No manifests yet</p>
          <p className="text-sm mt-1">Create a manifest to group shipped orders for courier handover</p>
        </div>
      ) : (
        <div className="space-y-3">
          {manifests.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div onClick={() => expandManifest(m.id)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  {expanded === m.id ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{m.manifestNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[m.status]}`}>{m.status}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {m.courierName} &middot; {m._count?.shipments || 0} shipments &middot; {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {m.status === 'OPEN' && (
                    <button onClick={() => closeManifest(m.id)} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium px-3 py-1.5 rounded-lg hover:bg-green-50">
                      <CheckCircle size={14} /> Close
                    </button>
                  )}
                  <button onClick={() => downloadPdf(m.id)} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50">
                    <Download size={14} /> PDF
                  </button>
                </div>
              </div>
              {expanded === m.id && manifestDetail && (
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                  <div className="grid grid-cols-3 gap-4 mb-3 text-xs text-slate-500 pb-2 border-b border-slate-200">
                    <span>Order #</span>
                    <span>AWB</span>
                    <span>Status</span>
                  </div>
                  {manifestDetail.shipments?.map(s => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div className="flex-1">
                        <span className="text-sm font-medium text-slate-700">{s.order?.orderNumber}</span>
                        <span className="text-xs text-slate-400 ml-2">{s.order?.customerName}</span>
                      </div>
                      <div className="flex-1 text-xs font-mono text-slate-500">{s.awbNumber}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.order?.orderStatus === 'SHIPPED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{s.order?.orderStatus || '-'}</span>
                    </div>
                  ))}
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
              <h2 className="text-lg font-bold text-slate-900">Create Manifest</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Courier</label>
              <select value={selectedCourier} onChange={e => setSelectedCourier(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select courier</option>
                {availableCouriers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {selectedCourier && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">{filteredOrders.length} shipped orders</label>
                  <button onClick={selectAllFiltered} className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                    {allFilteredSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                  {filteredOrders.map(order => (
                    <label key={order.id} className={`flex items-center px-3 py-2.5 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 ${selectedOrderIds.includes(order.id) ? 'bg-blue-50' : ''}`}>
                      <input type="checkbox" checked={selectedOrderIds.includes(order.id)} onChange={() => toggleOrder(order.id)} className="mr-3" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-700">{order.orderNumber}</div>
                        <div className="text-xs text-slate-400 truncate">{order.customerName} &middot; {order.tracking?.awbNumber}</div>
                      </div>
                    </label>
                  ))}
                  {filteredOrders.length === 0 && <p className="text-sm text-slate-400 text-center py-6">No shipped orders for this courier</p>}
                </div>
              </>
            )}
            <button onClick={createManifest} disabled={!selectedCourier || !selectedOrderIds.length} className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm mt-4">
              Create Manifest ({selectedOrderIds.length} shipments)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Manifests;
