import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Eye, X, CheckCircle2, QrCode, Loader2 } from 'lucide-react';
import DataTable from '../components/DataTable';
import { toast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import API from '../utils/api';

const statusColors = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-blue-100 text-blue-700',
  DISPATCHED: 'bg-teal-100 text-teal-700',
  RECEIVED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const typeColors = {
  STOCK_TRANSFER: 'bg-indigo-100 text-indigo-700',
  RETURNABLE: 'bg-purple-100 text-purple-700',
  NON_RETURNABLE: 'bg-amber-100 text-amber-700',
  RETURN_TO_VENDOR: 'bg-rose-100 text-rose-700',
  INCOMING: 'bg-green-100 text-green-700',
  RETURN: 'bg-purple-100 text-purple-700',
  MANUAL: 'bg-slate-100 text-slate-600',
};

const GATEPASS_COLUMNS = [
  { key: 'code', label: 'Code', render: (r) => <span className="text-sm font-mono font-medium">{r.code}</span> },
  { key: 'type', label: 'Type', render: (r) => <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[r.type] || 'bg-slate-100 text-slate-600'}`}>{r.type}</span> },
  { key: 'status', label: 'Status', render: (r) => <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[r.status] || 'bg-slate-100 text-slate-600'}`}>{r.status}</span> },
  { key: 'quantity', label: 'Quantity', align: 'right', render: (r) => <span className="text-sm font-mono">{r.quantity}</span> },
  { key: 'toParty', label: 'To Party', render: (r) => <span className="text-sm text-slate-600">{r.toParty || r.stockTransfer?.toWarehouse?.name || '-'}</span> },
  { key: 'createdBy', label: 'Created By', render: (r) => <span className="text-sm text-slate-600">{r.createdBy?.email || r.createdBy?.fullName || '-'}</span> },
  { key: 'createdAt', label: 'Date', render: (r) => <span className="text-sm text-slate-500">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</span> },
];

const Gatepasses = ({ detailId, setDetailId }) => {
  const [gatepasses, setGatepasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('PENDING');
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetailState] = useState(null);
  const [scanCode, setScanCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGps, setSelectedGps] = useState(new Set());

  const setDetail = (gp) => {
    setDetailState(gp);
    if (setDetailId) setDetailId(gp ? gp.id : '');
  };

  useEffect(() => {
    if (detailId && !detail) {
      API.get(`/gatepass/${detailId}`).then(res => setDetailState(res.data)).catch(() => setDetailId(''));
    }
  }, [detailId]);

  const confirm = useConfirm();
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
    if (status === 'CANCELLED' && !await confirm({
      title: 'Cancel this gatepass?',
      message: 'The gatepass will be marked as cancelled. Items in the gatepass will not be dispatched. This cannot be undone.',
      confirmText: 'Cancel gatepass',
      variant: 'danger',
    })) return;
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
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return g.code?.toLowerCase().includes(q) || g.toParty?.toLowerCase().includes(q) || g.type?.toLowerCase().includes(q);
    }
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

      <DataTable
        columns={GATEPASS_COLUMNS}
        data={filtered}
        loading={loading}
        searchable
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        searchPlaceholder="Search by code, party or type..."
        selectable
        selected={selectedGps}
        onSelectionChange={setSelectedGps}
        actions={(gp) => [
          { label: 'View Details', icon: Eye, onClick: () => setDetail(gp) },
        ]}
        emptyState={{ icon: 'orders', title: 'No gatepasses found', description: 'Create a gatepass to track stock movement.' }}
      />

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

const GATEPASS_TYPES = ['STOCK_TRANSFER', 'RETURNABLE', 'NON_RETURNABLE', 'RETURN_TO_VENDOR'];
const INVENTORY_TYPES = ['GOOD_INVENTORY', 'BAD_INVENTORY', 'QC_REJECTED'];

const CreateGatepassModal = ({ onClose, onSuccess }) => {
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    type: 'STOCK_TRANSFER',
    toParty: '',
    expectedDate: '',
    notes: '',
    items: [],
  });
  const [manualItems, setManualItems] = useState([]);
  const [skuSearch, setSkuSearch] = useState('');
  const [skuResults, setSkuResults] = useState([]);
  const [searchingSku, setSearchingSku] = useState(false);

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
    setManualItems([...manualItems, { skuId: sku.id, skuCode: sku.skuCode, quantity: 1, inventoryType: 'GOOD_INVENTORY', shelfCode: '', unitPrice: '', batchCode: '', forceAllocate: false }]);
    setSkuSearch(''); setSkuResults([]);
  };

  const handleSubmit = async () => {
    if (!form.toParty) return toast.error('To Party is required');
    if (manualItems.length === 0) return toast.error('Add at least one item');

    setCreating(true);
    try {
      await API.post('/gatepass', {
        type: form.type,
        toParty: form.toParty,
        expectedDate: form.expectedDate || null,
        notes: form.notes,
        items: manualItems.map(i => ({ skuId: i.skuId, quantity: i.quantity, inventoryType: i.inventoryType, shelfCode: i.shelfCode || null, unitPrice: i.unitPrice ? parseFloat(i.unitPrice) : null, batchCode: i.batchCode || null, forceAllocate: i.forceAllocate })),
      });
      toast.success('Gatepass created');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    } finally { setCreating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Create Gatepass Order</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Gatepass Order No</label>
              <input type="text" className="input-field bg-slate-50 text-slate-400" value="Auto-generated" disabled />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Gatepass Type *</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">
                {GATEPASS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">To Party *</label>
            <input type="text" className="input-field" value={form.toParty} onChange={e => setForm({ ...form, toParty: e.target.value })} placeholder="Party name" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Expected Date</label>
            <input type="date" className="input-field" value={form.expectedDate} onChange={e => setForm({ ...form, expectedDate: e.target.value })} />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
            <input type="text" className="input-field" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Items</label>
            <div className="relative mb-2">
              <input type="text" className="input-field" value={skuSearch} onChange={e => setSkuSearch(e.target.value)} placeholder="Search SKU to add..." />
              {searchingSku && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
              {skuResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white border rounded-xl shadow-lg max-h-40 overflow-y-auto">
                  {skuResults.map(sku => (
                    <button key={sku.id} onClick={() => addManualItem(sku)} className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex justify-between">
                      <span><span className="font-medium">{sku.skuCode}</span> - {sku.name}</span>
                      <span className="text-xs text-indigo-600">+ Add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {manualItems.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-2 space-y-2 max-h-64 overflow-y-auto">
                {manualItems.map((item, i) => (
                  <div key={i} className="border border-slate-200 rounded-lg p-2 bg-white space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-medium text-indigo-600">{item.skuCode}</span>
                      <button onClick={() => setManualItems(manualItems.filter((_, idx) => idx !== i))} className="p-0.5 hover:bg-red-100 rounded text-red-500"><X size={12} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[9px] font-medium text-slate-400 uppercase">Qty</label>
                        <input type="number" min={1} className="w-full px-1.5 py-1 border rounded text-xs text-center" value={item.quantity} onChange={e => {
                          const updated = [...manualItems];
                          updated[i].quantity = parseInt(e.target.value) || 1;
                          setManualItems(updated);
                        }} />
                      </div>
                      <div>
                        <label className="text-[9px] font-medium text-slate-400 uppercase">Inventory Type</label>
                        <select value={item.inventoryType} onChange={e => {
                          const updated = [...manualItems];
                          updated[i].inventoryType = e.target.value;
                          setManualItems(updated);
                        }} className="w-full px-1.5 py-1 border rounded text-[10px]">
                          {INVENTORY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-medium text-slate-400 uppercase">Shelf Code</label>
                        <input type="text" className="w-full px-1.5 py-1 border rounded text-xs" value={item.shelfCode} onChange={e => {
                          const updated = [...manualItems];
                          updated[i].shelfCode = e.target.value;
                          setManualItems(updated);
                        }} placeholder="e.g. A-01" />
                      </div>
                      <div>
                        <label className="text-[9px] font-medium text-slate-400 uppercase">Unit Price</label>
                        <input type="number" step="0.01" className="w-full px-1.5 py-1 border rounded text-xs" value={item.unitPrice} onChange={e => {
                          const updated = [...manualItems];
                          updated[i].unitPrice = e.target.value;
                          setManualItems(updated);
                        }} placeholder="0.00" />
                      </div>
                      <div>
                        <label className="text-[9px] font-medium text-slate-400 uppercase">Batch Code</label>
                        <input type="text" className="w-full px-1.5 py-1 border rounded text-xs" value={item.batchCode} onChange={e => {
                          const updated = [...manualItems];
                          updated[i].batchCode = e.target.value;
                          setManualItems(updated);
                        }} placeholder="Batch/Lot" />
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={item.forceAllocate} onChange={e => {
                            const updated = [...manualItems];
                            updated[i].forceAllocate = e.target.checked;
                            setManualItems(updated);
                          }} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-[10px] font-medium text-slate-500">Force Allocate</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button onClick={handleSubmit} disabled={creating || manualItems.length === 0} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
          {creating && <Loader2 size={16} className="animate-spin" />}
          {creating ? 'Creating...' : 'Create Gatepass'}
        </button>
      </div>
    </div>
  );
};

export default Gatepasses;
