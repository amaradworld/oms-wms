import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Eye, X, CheckCircle2, QrCode, Loader2 } from 'lucide-react';
import { toast } from '../components/Toast';
import API from '../utils/api';
import EmptyState from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';

const statusColors = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  DISPATCHED: 'bg-teal-100 text-teal-700',
  RECEIVED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const typeColors = {
  STOCK_TRANSFER: 'bg-indigo-100 text-indigo-700',
  INCOMING: 'bg-green-100 text-green-700',
  RETURN: 'bg-purple-100 text-purple-700',
  MANUAL: 'bg-slate-100 text-slate-600',
};

const Gatepasses = () => {
  const [gatepasses, setGatepasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('PENDING');
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState(null);
  const [scanCode, setScanCode] = useState('');
  const [scanning, setScanning] = useState(false);

  const fetchGatepasses = useCallback(async () => {
    setLoading(true);
    try {
      const params = tab === 'ALL' ? {} : { status: tab };
      const res = await API.get('/gatepass', { params });
      setGatepasses(res.data?.gatepasses || []);
    } catch {
      toast.error('Failed to load gatepasses');
      setGatepasses([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { fetchGatepasses(); }, [fetchGatepasses]);

  const handleStatusUpdate = async (id, status) => {
    try {
      await API.patch(`/gatepass/${id}/status`, { status });
      toast.success(`Gatepass ${status}`);
      fetchGatepasses();
      if (detail?.id === id) setDetail({ ...detail, status });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanCode.trim() || !detail) return;
    setScanning(true);
    try {
      const res = await API.post(`/gatepass/${detail.id}/scan`, { skuCode: scanCode.trim() });
      toast.success(res.data.message);
      const updated = await API.get(`/gatepass/${detail.id}`);
      setDetail(updated.data);
      setScanCode('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const tabs = ['PENDING', 'ALL', 'INCOMING'];
  const filtered = gatepasses.filter(g => {
    if (tab === 'INCOMING') return g.type === 'INCOMING' || g.type === 'RETURN';
    return true;
  });

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Gatepass Orders</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs md:text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus size={14} /> Create Gatepass
          </button>
          <button onClick={fetchGatepasses} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs md:text-sm font-medium hover:bg-slate-50">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'ALL' ? 'All' : t === 'INCOMING' ? 'Incoming' : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : filtered.length === 0 ? (
            <EmptyState icon="orders" title="No gatepasses found" description="Create a gatepass to track stock movement." />
          ) : (
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Quantity</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">To Party</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created At</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(gp => (
                  <tr key={gp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium">{gp.code}</td>
                    <td className="px-4 py-3 text-sm"><span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[gp.type] || 'bg-slate-100 text-slate-600'}`}>{gp.type}</span></td>
                    <td className="px-4 py-3 text-sm"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[gp.status] || 'bg-slate-100 text-slate-600'}`}>{gp.status}</span></td>
                    <td className="px-4 py-3 text-sm font-mono text-right">{gp.quantity}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{gp.toParty || gp.stockTransfer?.toWarehouse?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{gp.createdBy?.email || gp.createdBy?.fullName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{gp.createdAt ? new Date(gp.createdAt).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDetail(gp)} className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors">
                        <Eye size={16} className="text-slate-400" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateGatepassModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); fetchGatepasses(); }} />
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{detail.code}</h3>
              <button onClick={() => setDetail(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Type</span><p className="font-medium">{detail.type}</p></div>
              <div><span className="text-slate-500">Status</span><p><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[detail.status] || ''}`}>{detail.status}</span></p></div>
              <div><span className="text-slate-500">To Party</span><p className="font-medium">{detail.toParty || detail.stockTransfer?.toWarehouse?.name || '-'}</p></div>
              <div><span className="text-slate-500">Quantity</span><p className="font-mono font-medium">{detail.quantity}</p></div>
              {detail.notes && <div className="col-span-2"><span className="text-slate-500">Notes</span><p>{detail.notes}</p></div>}
              <div className="col-span-2"><span className="text-slate-500">Created By</span><p>{detail.createdBy?.email || detail.createdBy?.fullName || '-'}</p></div>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-500 block mb-2">Items ({detail.items?.length || 0})</span>
              <div className="bg-slate-50 rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
                {detail.items?.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs">{item.sku?.skuCode}</span>
                    <span className="text-slate-500">
                      {item.scannedQty}/{item.quantity} scanned
                      {item.scannedQty >= item.quantity && <CheckCircle2 size={14} className="inline ml-1 text-green-500" />}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {detail.status !== 'RECEIVED' && detail.status !== 'CANCELLED' && (
              <form onSubmit={handleScan} className="flex gap-2">
                <div className="relative flex-1">
                  <QrCode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={scanCode}
                    onChange={e => setScanCode(e.target.value)}
                    placeholder="Scan SKU code to verify..."
                    className="w-full pl-9 pr-3 py-2 border rounded-lg font-mono text-sm outline-none focus:ring-2 focus:ring-blue-200"
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={scanning} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {scanning ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                  Scan
                </button>
              </form>
            )}

            <div className="flex gap-2">
              {detail.status === 'PENDING' && (
                <>
                  <button onClick={() => handleStatusUpdate(detail.id, 'APPROVED')} className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700">Approve</button>
                  <button onClick={() => handleStatusUpdate(detail.id, 'CANCELLED')} className="flex-1 py-2 bg-red-600 text-white rounded-xl font-medium text-sm hover:bg-red-700">Cancel</button>
                </>
              )}
              {detail.status === 'APPROVED' && (
                <button onClick={() => handleStatusUpdate(detail.id, 'DISPATCHED')} className="w-full py-2 bg-teal-600 text-white rounded-xl font-medium text-sm hover:bg-teal-700">Mark Dispatched</button>
              )}
              {detail.status === 'DISPATCHED' && (
                <button onClick={() => handleStatusUpdate(detail.id, 'RECEIVED')} disabled className="w-full py-2 bg-emerald-600 text-white rounded-xl font-medium text-sm opacity-50 cursor-not-allowed">Scan all items to receive</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CreateGatepassModal = ({ onClose, onSuccess }) => {
  const [transfers, setTransfers] = useState([]);
  const [loadingTransfers, setLoadingTransfers] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    type: 'MANUAL',
    toParty: '',
    notes: '',
    stockTransferId: '',
    items: [],
  });
  const [manualItems, setManualItems] = useState([]);
  const [skuSearch, setSkuSearch] = useState('');
  const [skuResults, setSkuResults] = useState([]);
  const [searchingSku, setSearchingSku] = useState(false);

  useEffect(() => {
    API.get('/transfers').then(res => {
      setTransfers(res.data?.transfers || res.data || []);
    }).catch(() => {}).finally(() => setLoadingTransfers(false));
  }, []);

  const searchSkus = useCallback(async (q) => {
    if (!q || q.length < 2) { setSkuResults([]); return; }
    setSearchingSku(true);
    try {
      const res = await API.get('/skus', { params: { search: q } });
      setSkuResults(res.data?.skus || res.data || []);
    } catch {} finally { setSearchingSku(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchSkus(skuSearch), 300);
    return () => clearTimeout(t);
  }, [skuSearch, searchSkus]);

  const addManualItem = (sku) => {
    if (manualItems.find(i => i.skuId === sku.id)) { toast.info('Already added'); return; }
    setManualItems([...manualItems, { skuId: sku.id, skuCode: sku.skuCode, quantity: 1 }]);
    setSkuSearch(''); setSkuResults([]);
  };

  const handleSubmit = async () => {
    if (form.stockTransferId) {
      setCreating(true);
      try {
        await API.post(`/gatepass/from-stock-transfer/${form.stockTransferId}`);
        toast.success('Gatepass created from stock transfer');
        onSuccess();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to create');
      } finally { setCreating(false); }
      return;
    }
    if (!form.toParty || manualItems.length === 0) {
      toast.error('To Party and at least one item required');
      return;
    }
    setCreating(true);
    try {
      await API.post('/gatepass', {
        type: form.type,
        toParty: form.toParty,
        notes: form.notes,
        items: manualItems.map(i => ({ skuId: i.skuId, quantity: i.quantity })),
      });
      toast.success('Gatepass created');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    } finally { setCreating(false); }
  };

  const selectedTransfer = transfers.find(t => t.id === form.stockTransferId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Create Gatepass</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Create from Stock Transfer (optional)</label>
            <select value={form.stockTransferId} onChange={e => setForm({ ...form, stockTransferId: e.target.value, items: [] })} className="input-field">
              <option value="">Manual entry</option>
              {loadingTransfers ? <option disabled>Loading...</option> : transfers.map(t => (
                <option key={t.id} value={t.id}>{t.id.slice(0, 8)} - {t.fromWarehouse?.name} → {t.toWarehouse?.name}</option>
              ))}
            </select>
          </div>

          {!form.stockTransferId && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">
                  <option value="MANUAL">Manual</option>
                  <option value="INCOMING">Incoming</option>
                  <option value="RETURN">Return</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">To Party</label>
                <input type="text" className="input-field" value={form.toParty} onChange={e => setForm({ ...form, toParty: e.target.value })} placeholder="Party name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                <input type="text" className="input-field" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Items</label>
                <div className="relative mb-2">
                  <input type="text" className="input-field" value={skuSearch} onChange={e => setSkuSearch(e.target.value)} placeholder="Search SKU..." />
                  {searchingSku && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                  {skuResults.length > 0 && (
                    <div className="absolute z-10 top-full mt-1 w-full bg-white border rounded-xl shadow-lg max-h-40 overflow-y-auto">
                      {skuResults.map(sku => (
                        <button key={sku.id} onClick={() => addManualItem(sku)} className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex justify-between">
                          <span><span className="font-medium">{sku.skuCode}</span></span>
                          <span className="text-xs text-indigo-600">+ Add</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {manualItems.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-2 space-y-1">
                    {manualItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 font-mono text-xs">{item.skuCode}</span>
                        <input type="number" min={1} className="input-field w-16 text-xs text-center" value={item.quantity} onChange={e => {
                          const updated = [...manualItems];
                          updated[i].quantity = parseInt(e.target.value) || 1;
                          setManualItems(updated);
                        }} />
                        <button onClick={() => setManualItems(manualItems.filter((_, idx) => idx !== i))} className="p-1 hover:bg-red-100 rounded-lg text-red-500"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {form.stockTransferId && selectedTransfer && (
            <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1">
              <p className="font-medium">{selectedTransfer.fromWarehouse?.name} → {selectedTransfer.toWarehouse?.name}</p>
              <p className="text-xs text-slate-500">Items will be auto-populated from this transfer</p>
            </div>
          )}
        </div>

        <button onClick={handleSubmit} disabled={creating} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {creating && <Loader2 size={16} className="animate-spin" />}
          {creating ? 'Creating...' : 'Create Gatepass'}
        </button>
      </div>
    </div>
  );
};

export default Gatepasses;
