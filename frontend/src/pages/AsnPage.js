import React, { useState, useEffect, useCallback } from 'react';
import { Truck, Plus, RefreshCw, Search, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';

const AsnPage = () => {
  const { selectedFacility } = useAuth();
  const [asns, setAsns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ asnNumber: '', supplierName: '', expectedDate: '', notes: '' });
  const [items, setItems] = useState([{ skuId: '', expectedQty: 1 }]);

  const fetchAsns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/asn');
      setAsns(Array.isArray(res.data) ? res.data : []);
    } catch { setAsns([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAsns(); }, [fetchAsns]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.asnNumber || !items.some(i => i.skuId && i.expectedQty > 0)) return toast.error('ASN number and at least one item required');
    try {
      await API.post('/asn', { ...form, warehouseId: selectedFacility?.id, items: items.filter(i => i.skuId && i.expectedQty > 0) });
      toast.success('ASN created');
      setShowCreate(false);
      setForm({ asnNumber: '', supplierName: '', expectedDate: '', notes: '' });
      setItems([{ skuId: '', expectedQty: 1 }]);
      fetchAsns();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await API.put(`/asn/${id}/status`, { status });
      toast.success(`ASN status updated to ${status}`);
      fetchAsns();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const filtered = asns.filter(a =>
    a.asnNumber?.toLowerCase().includes(search.toLowerCase()) ||
    a.supplierName?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors = { PENDING: 'bg-slate-100 text-slate-600', PARTIAL: 'bg-amber-100 text-amber-700', RECEIVED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-slate-100 text-slate-400' };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Truck size={20} /> Advanced Shipment Notices</h1>
          <p className="text-sm text-slate-500">Pre-notify incoming shipments from suppliers</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"><Plus size={14} /> Create ASN</button>
          <button onClick={fetchAsns} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border rounded-lg hover:bg-slate-50"><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      <div className="relative max-w-xs"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Search ASN..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm" />
      </div>

      {loading ? <TableSkeleton rows={5} /> : filtered.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center text-slate-400"><p>No ASNs found</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(asn => (
            <div key={asn.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50" onClick={() => setExpandedId(expandedId === asn.id ? null : asn.id)}>
                <div className="flex items-center gap-4">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${statusColors[asn.status]}`}>{asn.status}</span>
                  <div>
                    <span className="font-mono text-sm font-medium">{asn.asnNumber}</span>
                    <span className="text-sm text-slate-500 ml-3">{asn.supplierName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{asn.items?.length || 0} items</span>
                  {asn.expectedDate && <span>ETA: {new Date(asn.expectedDate).toLocaleDateString()}</span>}
                  {expandedId === asn.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              </div>
              {expandedId === asn.id && (
                <div className="border-t px-4 py-3 bg-slate-50">
                  {asn.items?.length > 0 && (
                    <table className="w-full text-sm mb-3">
                      <thead><tr className="text-slate-600"><th className="text-left px-2 py-1">SKU</th><th className="text-right px-2 py-1">Expected</th><th className="text-right px-2 py-1">Received</th></tr></thead>
                      <tbody>{asn.items.map((item, i) => (
                        <tr key={i}><td className="px-2 py-1 font-mono text-xs">{item.sku?.skuCode || item.skuId}</td><td className="px-2 py-1 text-right">{item.expectedQty}</td><td className="px-2 py-1 text-right">{item.receivedQty}</td></tr>
                      ))}</tbody>
                    </table>
                  )}
                  {asn.notes && <p className="text-xs text-slate-500 mb-3">{asn.notes}</p>}
                  <div className="flex gap-2">
                    {asn.status === 'PENDING' && <button onClick={() => handleStatusUpdate(asn.id, 'PARTIAL')} className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg">Mark Partial</button>}
                    {asn.status !== 'RECEIVED' && asn.status !== 'CANCELLED' && (
                      <><button onClick={() => handleStatusUpdate(asn.id, 'RECEIVED')} className="px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-lg">Mark Received</button>
                      <button onClick={() => handleStatusUpdate(asn.id, 'CANCELLED')} className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg">Cancel</button></>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Create ASN</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-slate-600 mb-1 block">ASN Number *</label>
                  <input value={form.asnNumber} onChange={e => setForm({...form, asnNumber: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" required /></div>
                <div><label className="text-xs font-medium text-slate-600 mb-1 block">Supplier</label>
                  <input value={form.supplierName} onChange={e => setForm({...form, supplierName: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              </div>
              <div><label className="text-xs font-medium text-slate-600 mb-1 block">Expected Date</label>
                <input type="date" value={form.expectedDate} onChange={e => setForm({...form, expectedDate: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="text-xs font-medium text-slate-600 mb-1 block">Items</label>
                {items.map((item, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input placeholder="SKU ID *" value={item.skuId} onChange={e => { const newItems = [...items]; newItems[i].skuId = e.target.value; setItems(newItems); }} className="flex-1 px-3 py-2 border rounded-lg text-sm" required />
                    <input type="number" placeholder="Qty" value={item.expectedQty} onChange={e => { const newItems = [...items]; newItems[i].expectedQty = Number(e.target.value); setItems(newItems); }} className="w-20 px-3 py-2 border rounded-lg text-sm" />
                    {items.length > 1 && <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="px-2 py-2 text-red-500 text-sm">✕</button>}
                  </div>
                ))}
                <button type="button" onClick={() => setItems([...items, { skuId: '', expectedQty: 1 }])} className="text-xs text-blue-600 hover:underline">+ Add item</button>
              </div>
              <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border rounded-lg text-sm">Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Create ASN</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AsnPage;
