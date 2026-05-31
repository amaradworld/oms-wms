import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, CheckCircle, QrCode, Loader2, Printer } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const StockTransfer = ({ detailId, setDetailId }) => {
  const { user, selectedFacility } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [detailTransfer, setDetailTransfer] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanInput, setScanInput] = useState('');
  const [createScanInput, setCreateScanInput] = useState('');
  const scanRef = useRef(null);
  const createScanRef = useRef(null);
  const [form, setForm] = useState({ fromWarehouseId: selectedFacility?.id || '', toWarehouseId: '', notes: '', items: [] });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, wRes] = await Promise.all([API.get('/transfers'), API.get('/warehouses')]);
      setTransfers(Array.isArray(tRes.data) ? tRes.data : []);
      setWarehouses(Array.isArray(wRes.data) ? wRes.data : []);
    } catch { setTransfers([]); setWarehouses([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { if (showModal) setTimeout(() => createScanRef.current?.focus(), 100); }, [showModal]);

  useEffect(() => {
    if (detailId && !detailTransfer) {
      API.get(`/transfers/${detailId}`).then(res => { setDetailTransfer(res.data); }).catch(() => setDetailId(''));
    }
  }, [detailId]);

  const [creating, setCreating] = useState(false);

  const handleCreateScan = async () => {
    const code = createScanInput.trim();
    if (!code) return;
    setScanning(true);
    try {
      const res = await API.get('/skus', { params: { search: code } });
      const skus = res.data?.skus || [];
      const sku = skus.find(s => s.skuCode === code);
      if (!sku) { toast.error(`SKU "${code}" not found`); setCreateScanInput(''); return; }
      const existing = form.items.find(i => i.skuCode === code);
      if (existing) {
        setForm({ ...form, items: form.items.map(i => i.skuCode === code ? { ...i, quantity: i.quantity + 1 } : i) });
        toast.success(`${code} qty → ${existing.quantity + 1}`);
      } else {
        setForm({ ...form, items: [...form.items, { skuCode: code, quantity: 1 }] });
        toast.success(`${code} added`);
      }
      setCreateScanInput('');
    } catch {
      toast.error('Error looking up SKU');
    } finally {
      setScanning(false);
      createScanRef.current?.focus();
    }
  };

  const handleCreate = async () => {
    if (!form.fromWarehouseId || !form.toWarehouseId) return toast.error('Select source and destination');
    setCreating(true);
    try {
      await API.post('/transfers', form);
      toast.success('Transfer created');
      setShowModal(false);
      setForm({ fromWarehouseId: selectedFacility?.id || '', toWarehouseId: '', notes: '', items: [] });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setCreating(false); }
  };

  const openDetail = async (t) => {
    if (setDetailId) setDetailId(t.id);
    try {
      const { data } = await API.get(`/transfers/${t.id}`);
      setDetailTransfer(data);
    } catch { toast.error('Failed to load transfer details'); }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanInput.trim() || !detailTransfer) return;
    setScanning(true);
    try {
      const { data } = await API.put(`/transfers/${detailTransfer.id}/scan-item`, { skuCode: scanInput.trim() });
      setDetailTransfer(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === data.id ? { ...i, receivedQty: data.receivedQty, status: data.status } : i),
      }));
      toast.success(`Scanned ${data.sku.skuCode}: ${data.receivedQty} total`);
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

  const handlePrint = async () => {
    if (!detailTransfer) return;
    try {
      const res = await API.get(`/transfers/${detailTransfer.id}/print`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `STN_${detailTransfer.id.slice(0, 8)}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  const handleComplete = async () => {
    if (!detailTransfer) return;
    try {
      await API.put(`/transfers/${detailTransfer.id}/complete`);
      toast.success('Transfer completed');
      setDetailTransfer(null);
      if (setDetailId) setDetailId('');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Complete failed'); }
  };

  const canReceive = detailTransfer && detailTransfer.status === 'DRAFT' && user?.warehouseId === detailTransfer.toWarehouseId;
  const allScanned = detailTransfer?.items?.every(i => i.status === 'RECEIVED');

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Stock Transfer</h1>
          <p className="text-sm text-slate-500">Move inventory between facilities</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> New Transfer
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? <TableSkeleton rows={4} cols={5} /> : transfers.length === 0 ? <EmptyState icon="orders" title="No transfers" description="Transfer stock between facilities to balance inventory." />
        : <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">From</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">To</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Items</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => openDetail(t)}>
                  <td className="px-4 py-3 text-sm">{t.fromWarehouse?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{t.toWarehouse?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{t.items?.length || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{t.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm text-blue-600 font-medium">View</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>

      {detailTransfer && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50" onClick={() => { setDetailTransfer(null); if (setDetailId) setDetailId(''); }}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Transfer Details</h2>
                <p className="text-xs text-slate-400">{detailTransfer.fromWarehouse?.name} → {detailTransfer.toWarehouse?.name}</p>
              </div>
              <button onClick={() => { setDetailTransfer(null); if (setDetailId) setDetailId(''); }}><X size={20} /></button>
            </div>
            <div className="flex gap-2">
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                <Printer size={14} /> Print STN
              </button>
            </div>

            {detailTransfer.notes && <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{detailTransfer.notes}</p>}

            {canReceive && (
              <form onSubmit={handleScan} className="flex gap-2">
                <div className="relative flex-1">
                  <QrCode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={scanRef}
                    autoFocus
                    type="text"
                    value={scanInput}
                    onChange={e => setScanInput(e.target.value)}
                    placeholder="Scan SKU barcode to add +1 qty..."
                    className="w-full pl-9 pr-3 py-2.5 border-2 rounded-xl font-mono text-sm outline-none focus:ring-4 focus:ring-blue-200"
                  />
                </div>
                <button type="submit" disabled={scanning} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {scanning ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
                  Scan
                </button>
              </form>
            )}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">SKU</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase text-right">Qty Requested</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase text-right">Qty Received</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detailTransfer.items?.map(item => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-3 py-2.5 text-sm font-mono">{item.sku?.skuCode}</td>
                      <td className="px-3 py-2.5 text-sm text-right">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-sm text-right font-semibold">{item.receivedQty || 0}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'RECEIVED' ? 'bg-green-100 text-green-700' : item.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {detailTransfer.status === 'COMPLETED' && detailTransfer.receivedAt && (
              <p className="text-xs text-slate-400">Received on {new Date(detailTransfer.receivedAt).toLocaleString()}</p>
            )}

            {canReceive && (
              <button onClick={handleComplete} disabled={!allScanned} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
                <CheckCircle size={18} /> {allScanned ? 'Complete Transfer' : 'Scan all items to complete'}
              </button>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-lg font-bold">New Stock Transfer</h2><button onClick={() => setShowModal(false)}><X size={20} /></button></div>
            <div className="space-y-3">
              <select value={form.fromWarehouseId} onChange={e => setForm({ ...form, fromWarehouseId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Source Facility...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <select value={form.toWarehouseId} onChange={e => setForm({ ...form, toWarehouseId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Destination Facility...</option>
                {warehouses.filter(w => w.id !== form.fromWarehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center"><span className="text-sm font-semibold">Items ({form.items.reduce((s, i) => s + i.quantity, 0)} total)</span></div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  {scanning && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border-2 rounded-xl font-mono text-sm outline-none focus:ring-4 focus:ring-blue-200"
                  placeholder="Scan barcode to add item..."
                  value={createScanInput}
                  onChange={e => setCreateScanInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateScan(); } }}
                  ref={createScanRef}
                />
              </div>
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center bg-slate-50 rounded-lg px-3 py-2">
                  <span className="flex-1 text-sm font-mono font-medium">{item.skuCode}</span>
                  <span className="w-10 text-xs text-center font-semibold text-blue-600">x{item.quantity}</span>
                  <button onClick={() => { const items = form.items.filter((_, idx) => idx !== i); setForm({ ...form, items }); }} className="p-1 hover:bg-red-100 rounded-lg text-red-500"><X size={14} /></button>
                </div>
              ))}
            </div>
            <button onClick={handleCreate} disabled={!form.fromWarehouseId || !form.toWarehouseId || form.items.length === 0 || creating} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {creating && <Loader2 size={16} className="animate-spin" />}
              {creating ? 'Creating...' : 'Create Transfer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockTransfer;
