import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, CheckCircle2, XCircle, Eye, Play, QrCode } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const CycleCount = ({ detailId, setDetailId }) => {
  const { selectedFacility } = useAuth();
  const [counts, setCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCount, setSelectedCount] = useState(null);
  const [countDetails, setCountDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [countValues, setCountValues] = useState({});
  const [scanInput, setScanInput] = useState('');
  const scanRef = useRef(null);

  useEffect(() => {
    if (detailId && !countDetails) openDetails(detailId);
  }, [detailId]);

  useEffect(() => {
    if (countDetails && scanRef.current) scanRef.current.focus();
  }, [countDetails]);

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedFacility ? { warehouseId: selectedFacility.id } : {};
      const res = await API.get('/cycle-counts', { params });
      setCounts(Array.isArray(res.data) ? res.data : []);
    } catch { setCounts([]); } finally { setLoading(false); }
  }, [selectedFacility]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  const openDetails = async (id) => {
    setSelectedCount(id);
    if (setDetailId) setDetailId(id);
    setDetailsLoading(true);
    try {
      const res = await API.get(`/cycle-counts/${id}`);
      setCountDetails(res.data);
      const values = {};
      res.data.items.forEach(item => {
        values[item.skuId] = item.countedQty ?? '';
      });
      setCountValues(values);
    } catch { toast.error('Failed to load details'); } finally { setDetailsLoading(false); }
  };

  const handleCreate = async () => {
    if (!selectedFacility) return toast.error('Please select a facility first');
    try {
      const res = await API.post('/cycle-counts', { warehouseId: selectedFacility.id });
      toast.success('Cycle count created');
      fetchCounts();
      openDetails(res.data.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create count');
    }
  };

  const handleUpdateCount = async (skuId) => {
    const countedQty = parseInt(countValues[skuId], 10);
    if (isNaN(countedQty) || countedQty < 0) return toast.error('Enter a valid count');
    try {
      await API.put('/cycle-counts/item', { cycleCountId: selectedCount, skuId, countedQty });
      toast.success('Count updated');
      openDetails(selectedCount);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update count');
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanInput || !countDetails) return;
    const code = scanInput.trim();

    const matchedItem = countDetails.items.find(item =>
      item.sku.skuCode === code || item.skuCode === code
    );

    if (!matchedItem) {
      toast.error(`SKU ${code} not found in this cycle count`);
      setScanInput('');
      return;
    }

    const current = parseInt(countValues[matchedItem.skuId], 10) || 0;
    const newQty = current + 1;
    setCountValues(prev => ({ ...prev, [matchedItem.skuId]: newQty }));

    try {
      await API.put('/cycle-counts/item', {
        cycleCountId: selectedCount,
        skuId: matchedItem.skuId,
        countedQty: newQty,
      });
      openDetails(selectedCount);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update count');
    }
    setScanInput('');
    scanRef.current?.focus();
  };

  const handleComplete = async () => {
    try {
      await API.put(`/cycle-counts/${selectedCount}/complete`);
      toast.success('Cycle count completed — inventory adjusted');
      setSelectedCount(null);
      setCountDetails(null);
      if (setDetailId) setDetailId('');
      fetchCounts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete');
    }
  };

  const handleCancel = async () => {
    try {
      await API.put(`/cycle-counts/${selectedCount}/cancel`);
      toast.success('Cycle count cancelled');
      setSelectedCount(null);
      setCountDetails(null);
      if (setDetailId) setDetailId('');
      fetchCounts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const totalItems = countDetails?.items?.length || 0;
  const countedItems = countDetails?.items?.filter(i => i.status === 'COUNTED').length || 0;

  if (countDetails) {
    return (
      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Cycle Count #{countDetails.id.slice(0, 8)}</h1>
            <p className="text-sm text-slate-500">{countDetails.warehouse?.name} · {countedItems}/{totalItems} items counted</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setSelectedCount(null); setCountDetails(null); if (setDetailId) setDetailId(''); }} className="px-3 py-2 border rounded-lg text-sm hover:bg-slate-50">Back</button>
            {countDetails.status === 'IN_PROGRESS' && (
              <>
                <button onClick={handleCancel} className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"><XCircle size={16} /> Cancel</button>
                <button onClick={handleComplete} className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"><CheckCircle2 size={16} /> Complete Count</button>
              </>
            )}
          </div>
        </div>

        {countDetails.status === 'IN_PROGRESS' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <form onSubmit={handleScan} className="flex gap-2">
              <div className="relative flex-1">
                <QrCode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={scanRef}
                  autoFocus
                  type="text"
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  placeholder="Scan SKU barcode to count..."
                  className="w-full pl-9 pr-3 py-2.5 border-2 rounded-xl font-mono text-sm outline-none focus:ring-4 focus:ring-blue-200"
                />
              </div>
              <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700">+1</button>
            </form>
            <p className="text-xs text-slate-400 mt-2 ml-1">Each scan increments the count by 1 for the matching SKU</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <span className="text-sm font-semibold">Items to Count</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              countDetails.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
              countDetails.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
              countDetails.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
            }`}>{countDetails.status.replace(/_/g, ' ')}</span>
          </div>
          {detailsLoading ? <TableSkeleton rows={5} cols={5} /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bin</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Expected</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Counted</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Variance</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {countDetails.items.map(item => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-mono font-medium">{item.sku.skuCode}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.sku.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{item.binLocation || '—'}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{item.expectedQty}</td>
                      <td className="px-4 py-3 text-right">
                        {item.status === 'COUNTED' ? (
                          <span className="text-sm font-medium">{item.countedQty}</span>
                        ) : countDetails.status === 'IN_PROGRESS' ? (
                          <div className="flex items-center gap-1 justify-end">
                            <input type="number" min="0" value={countValues[item.skuId] ?? ''} onChange={e => setCountValues({ ...countValues, [item.skuId]: e.target.value })} className="w-20 px-2 py-1 border rounded text-sm text-right" />
                            <button onClick={() => handleUpdateCount(item.skuId)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Play size={14} /></button>
                          </div>
                        ) : <span className="text-sm text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.variance != null ? (
                          <span className={`text-sm font-medium ${item.variance === 0 ? 'text-green-600' : item.variance > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {item.variance > 0 ? '+' : ''}{item.variance}
                          </span>
                        ) : <span className="text-sm text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.status === 'COUNTED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>{item.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Cycle Count</h1>
          <p className="text-sm text-slate-500">Reconcile physical inventory with system records</p>
        </div>
        <button onClick={handleCreate} disabled={!selectedFacility} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          <Plus size={16} /> Start New Count
        </button>
      </div>

      {!selectedFacility && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
          Select a facility using the "Load" button on the Warehouse page to start a cycle count.
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? <TableSkeleton rows={4} cols={5} /> : counts.length === 0 ? (
          <EmptyState icon="search" title="No cycle counts" description="Start a new count to reconcile inventory in your facility." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Facility</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {counts.map(c => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-mono">#{c.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sm">{c.warehouse?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm">{c._count?.items || c.items?.length || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        c.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        c.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                        c.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                      }`}>{c.status.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openDetails(c.id)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium">
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CycleCount;
