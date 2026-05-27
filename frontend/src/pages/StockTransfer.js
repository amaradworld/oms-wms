import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Scan, CheckCircle } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const StockTransfer = () => {
  const { selectedFacility, user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [detailTransfer, setDetailTransfer] = useState(null);
  const [scanValues, setScanValues] = useState({});
  const [form, setForm] = useState({ fromWarehouseId: selectedFacility?.id || '', toWarehouseId: '', notes: '', items: [{ skuCode: '', quantity: 1 }] });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, wRes] = await Promise.all([API.get('/transfers'), API.get('/warehouses')]);
      setTransfers(Array.isArray(tRes.data) ? tRes.data : []);
      setWarehouses(Array.isArray(wRes.data) ? wRes.data : []);
    } catch { setTransfers([]); setWarehouses([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreate = async () => {
    if (!form.fromWarehouseId || !form.toWarehouseId) return toast.error('Select source and destination');
    try {
      await API.post('/transfers', form);
      toast.success('Transfer created');
      setShowModal(false);
      setForm({ fromWarehouseId: selectedFacility?.id || '', toWarehouseId: '', notes: '', items: [{ skuCode: '', quantity: 1 }] });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { skuCode: '', quantity: 1 }] });

  const openDetail = async (t) => {
    try {
      const { data } = await API.get(`/transfers/${t.id}`);
      setDetailTransfer(data);
      const scans = {};
      data.items.forEach(i => { scans[i.sku?.skuCode] = i.receivedQty || 0; });
      setScanValues(scans);
    } catch { toast.error('Failed to load transfer details'); }
  };

  const handleScan = async (skuCode) => {
    if (!detailTransfer) return;
    try {
      const receivedQty = parseInt(scanValues[skuCode]) || 0;
      const { data } = await API.put(`/transfers/${detailTransfer.id}/scan-item`, { skuCode, receivedQty });
      const scans = { ...scanValues, [skuCode]: data.receivedQty };
      setScanValues(scans);
      setDetailTransfer(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === data.id ? { ...i, receivedQty: data.receivedQty, status: data.status } : i),
      }));
      toast.success(`Scanned ${skuCode}: ${data.receivedQty} received`);
    } catch (err) { toast.error(err.response?.data?.message || 'Scan failed'); }
  };

  const handleComplete = async () => {
    if (!detailTransfer) return;
    try {
      await API.put(`/transfers/${detailTransfer.id}/complete`);
      toast.success('Transfer completed');
      setDetailTransfer(null);
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
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50" onClick={() => setDetailTransfer(null)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">Transfer Details</h2>
                <p className="text-xs text-slate-400">{detailTransfer.fromWarehouse?.name} → {detailTransfer.toWarehouse?.name}</p>
              </div>
              <button onClick={() => setDetailTransfer(null)}><X size={20} /></button>
            </div>

            {detailTransfer.notes && <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{detailTransfer.notes}</p>}

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">SKU</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase text-right">Qty Requested</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase text-right">Qty Received</th>
                    <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    {canReceive && <th className="px-3 py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {detailTransfer.items?.map(item => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="px-3 py-2.5 text-sm font-mono">{item.sku?.skuCode}</td>
                      <td className="px-3 py-2.5 text-sm text-right">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-sm text-right">{item.receivedQty || '-'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === 'RECEIVED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {item.status}
                        </span>
                      </td>
                      {canReceive && (
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="number" min="0" max={item.quantity}
                              value={scanValues[item.sku?.skuCode] || 0}
                              onChange={e => setScanValues({ ...scanValues, [item.sku?.skuCode]: parseInt(e.target.value) || 0 })}
                              className="w-16 px-2 py-1 border rounded text-sm text-center"
                              placeholder="Qty"
                            />
                            <button onClick={() => handleScan(item.sku?.skuCode)} className="flex items-center gap-1 text-xs px-2 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200">
                              <Scan size={14} /> Scan
                            </button>
                          </div>
                        </td>
                      )}
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
              <div className="flex justify-between items-center"><span className="text-sm font-semibold">Items</span><button onClick={addItem} className="text-xs text-blue-600">+ Add item</button></div>
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input placeholder="SKU Code" value={item.skuCode} onChange={e => { const items = [...form.items]; items[i].skuCode = e.target.value; setForm({ ...form, items }); }} className="flex-1 px-2 py-1.5 border rounded text-sm" />
                  <input type="number" placeholder="Qty" value={item.quantity} onChange={e => { const items = [...form.items]; items[i].quantity = parseInt(e.target.value) || 0; setForm({ ...form, items }); }} className="w-20 px-2 py-1.5 border rounded text-sm" />
                </div>
              ))}
            </div>
            <button onClick={handleCreate} disabled={!form.fromWarehouseId || !form.toWarehouseId} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">Create Transfer</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockTransfer;
