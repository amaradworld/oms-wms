import React, { useState, useEffect, useCallback } from 'react';
import { Package, Plus, ChevronDown, ChevronRight, Download, CheckCircle, X, Truck, Loader2 } from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';

const STATUS_BADGE = {
  OPEN: 'bg-blue-100 text-blue-800',
  CLOSED: 'bg-green-100 text-green-800',
};

const safeDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
};

const Manifests = ({ detailId, setDetailId }) => {
  const confirm = useConfirm();
  const [manifests, setManifests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [manifestDetail, setManifestDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [courierFilter, setCourierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [shippedOrders, setShippedOrders] = useState([]);
  const [availableCouriers, setAvailableCouriers] = useState([]);
  const [selectedCourier, setSelectedCourier] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [fetchingShipped, setFetchingShipped] = useState(false);
  const [closingId, setClosingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const loadManifests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (courierFilter) params.courier = courierFilter;
      if (statusFilter) params.status = statusFilter;
      const { data } = await API.get('/manifests', { params });
      setManifests(data || []);
    } catch (e) {
      toast.error('Failed to load manifests');
      setManifests([]);
    }
    setLoading(false);
  }, [courierFilter, statusFilter]);

  useEffect(() => { loadManifests(); }, [loadManifests]);

  useEffect(() => {
    if (!showCreate) { setShippedOrders([]); setAvailableCouriers([]); }
  }, [showCreate]);

  useEffect(() => {
    if (detailId && expanded !== detailId) expandManifest(detailId);
  }, [detailId]);

  const openCreate = async () => {
    setFetchingShipped(true);
    setShowCreate(true);
    try {
      const { data } = await API.get('/manifests/shipped-orders');
      setShippedOrders(data.orders || []);
      setAvailableCouriers(data.couriers || []);
    } catch (e) {
      toast.error('Failed to load shipped orders');
      setShippedOrders([]);
      setAvailableCouriers([]);
    }
    setFetchingShipped(false);
    setSelectedCourier('');
    setSelectedOrderIds([]);
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
    setCreating(true);
    try {
      await API.post('/manifests', { courierName: selectedCourier, orderIds: selectedOrderIds });
      toast.success('Manifest created');
      setShowCreate(false);
      loadManifests();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create manifest');
    }
    setCreating(false);
  };

  const expandManifest = async (id) => {
    if (expanded === id) { setExpanded(null); setManifestDetail(null); if (setDetailId) setDetailId(''); return; }
    if (setDetailId) setDetailId(id);
    setExpanded(id);
    setDetailLoading(true);
    try {
      const { data } = await API.get(`/manifests/${id}`);
      setManifestDetail(data);
    } catch (e) {
      toast.error('Failed to load manifest details');
      setManifestDetail(null);
    }
    setDetailLoading(false);
  };

  const closeManifest = async (id) => {
    if (!await confirm({
      title: 'Close this manifest?',
      message: 'All orders in this manifest will be marked as DISPATCHED. AWB numbers will be locked. This action cannot be undone.',
      confirmText: 'Close manifest',
      variant: 'warning',
    })) return;
    setClosingId(id);
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
    setClosingId(null);
  };

  const downloadPdf = async (id) => {
    setDownloadingId(id);
    try {
      const response = await API.get(`/manifests/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const disposition = response.headers['content-disposition'];
      let filename = `manifest_${id}.pdf`;
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match) filename = match[1].replace(/['"]/g, '');
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Failed to download PDF');
    }
    setDownloadingId(null);
  };

  const allFilteredSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id));

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manifests</h1>
          <p className="text-slate-500 text-sm mt-1">Group shipped orders by courier for handover</p>
        </div>
        <button onClick={openCreate} disabled={fetchingShipped} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium">
          {fetchingShipped ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} New Manifest
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

      {loading ? <TableSkeleton rows={4} cols={3} /> : manifests.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Package size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No manifests yet</p>
          <p className="text-sm mt-1">Create a manifest to group shipped orders for courier handover</p>
        </div>
      ) : (
        <div className="space-y-3">
          {manifests.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div onClick={() => expandManifest(m.id)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {expanded === m.id ? <ChevronDown size={18} className="text-slate-400 flex-shrink-0" /> : <ChevronRight size={18} className="text-slate-400 flex-shrink-0" />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800 truncate">{m.manifestNumber || `#${m.id.slice(0, 8)}`}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[m.status] || 'bg-slate-100 text-slate-600'}`}>{m.status || 'UNKNOWN'}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">
                      {m.courierName || '—'} &middot; {m._count?.shipments || 0} shipments &middot; {safeDate(m.createdAt)?.toLocaleString() || '—'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                  {m.status === 'OPEN' && (
                    <button onClick={() => closeManifest(m.id)} disabled={closingId === m.id} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium px-3 py-1.5 rounded-lg hover:bg-green-50 disabled:opacity-50">
                      {closingId === m.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Close
                    </button>
                  )}
                  <button onClick={() => downloadPdf(m.id)} disabled={downloadingId === m.id} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 disabled:opacity-50">
                    {downloadingId === m.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
                  </button>
                </div>
              </div>
              {expanded === m.id && (
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                  {detailLoading ? (
                    <div className="text-center py-4 text-sm text-slate-400">Loading details...</div>
                  ) : manifestDetail ? (
                    <>
                      <div className="grid grid-cols-3 gap-4 mb-3 text-xs text-slate-500 pb-2 border-b border-slate-200">
                        <span>Order #</span>
                        <span>AWB</span>
                        <span>Status</span>
                      </div>
                      {manifestDetail.shipments?.map(s => (
                        <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-slate-700">{s.order?.orderNumber || '—'}</span>
                            <span className="text-xs text-slate-400 ml-2">{s.order?.customerName || ''}</span>
                          </div>
                          <div className="flex-1 text-xs font-mono text-slate-500 break-all">{s.awbNumber || '—'}</div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${s.order?.orderStatus === 'SHIPPED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{s.order?.orderStatus || '—'}</span>
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-4 text-sm text-slate-400">Failed to load details</div>
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
              <h2 className="text-lg font-bold text-slate-900">Create Manifest</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-100 rounded-lg"><X size={20} /></button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Courier</label>
              <select value={selectedCourier} onChange={e => setSelectedCourier(e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Select courier</option>
                {fetchingShipped ? <option value="" disabled>Loading...</option> : availableCouriers.map(c => <option key={c} value={c}>{c}</option>)}
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
                  {filteredOrders.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">No shipped orders for this courier</p>
                  ) : filteredOrders.map(order => (
                    <label key={order.id} className={`flex items-center px-3 py-2.5 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 ${selectedOrderIds.includes(order.id) ? 'bg-blue-50' : ''}`}>
                      <input type="checkbox" checked={selectedOrderIds.includes(order.id)} onChange={() => toggleOrder(order.id)} className="mr-3" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-700 truncate">{order.orderNumber}</div>
                        <div className="text-xs text-slate-400 truncate">{order.customerName} &middot; {order.tracking?.awbNumber || '—'}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
            <button onClick={createManifest} disabled={!selectedCourier || !selectedOrderIds.length || creating} className="w-full bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm mt-4 flex items-center justify-center gap-2">
              {creating ? <Loader2 size={16} className="animate-spin" /> : null}
              {creating ? 'Creating...' : `Create Manifest (${selectedOrderIds.length} shipments)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Manifests;
