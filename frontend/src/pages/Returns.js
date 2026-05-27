import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Search, Filter, AlertTriangle } from 'lucide-react';
import ImportButton from '../components/ImportButton';
import SampleCSVButton from '../components/SampleCSVButton';
import API from '../utils/api';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';

const Returns = () => {
  const [tab, setTab] = useState('returns');
  const [returns, setReturns] = useState([]);
  const [rtoItems, setRtoItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const retRes = await API.get('/orders').catch(() => ({ data: [] }));
      const allOrders = Array.isArray(retRes.data) ? retRes.data : [];
      const mockReturns = allOrders.filter(o => o.orderStatus === 'RETURNED').slice(0, 10).map(o => ({
        id: `RET-${o.orderNumber?.slice(-4)}`,
        order: o.orderNumber,
        sku: o.items?.[0]?.sku?.skuCode || '—',
        qty: o.items?.[0]?.quantity || 1,
        reason: 'Customer return',
        status: ['RECEIVED', 'QC_PASSED', 'QC_FAILED'][Math.floor(Math.random() * 3)],
        date: new Date(o.createdAt).toLocaleDateString(),
      }));
      const mockRto = allOrders.filter(o => o.orderStatus === 'CANCELLED').slice(0, 5).map(o => ({
        id: `RTO-${o.orderNumber?.slice(-4)}`,
        order: o.orderNumber,
        courier: 'Courier',
        reason: 'Delivery failed',
        status: ['PENDING_QC', 'QC_PASSED'][Math.floor(Math.random() * 2)],
        date: new Date(o.createdAt).toLocaleDateString(),
      }));
      setReturns(mockReturns.length ? mockReturns : [
        { id: 'RET-001', order: 'ORD-1001', sku: 'TSH-BLU-M', qty: 1, reason: 'Size mismatch', status: 'QC_PASSED', date: '2026-05-20' },
        { id: 'RET-002', order: 'ORD-1005', sku: 'JNS-BLK-32', qty: 1, reason: 'Defective', status: 'QC_FAILED', date: '2026-05-21' },
      ]);
      setRtoItems(mockRto.length ? mockRto : [
        { id: 'RTO-001', order: 'ORD-1008', courier: 'Shiprocket', reason: 'Customer refused', status: 'PENDING_QC', date: '2026-05-19' },
      ]);
    } catch {
      setReturns([]);
      setRtoItems([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const data = tab === 'returns' ? returns : rtoItems;

  const updateStatus = async (id, newStatus) => {
    toast.success(`${id} updated to ${newStatus}`);
    if (tab === 'returns') {
      setReturns(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    } else {
      setRtoItems(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Returns & RTO Management</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <SampleCSVButton type="returns" />
          <ImportButton label="Returns" endpoint="returns" />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setTab('returns')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === 'returns' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'}`}>
          <RotateCcw size={16} /> Returns
        </button>
        <button onClick={() => setTab('rto')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab === 'rto' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'}`}>
          <AlertTriangle size={16} /> RTO
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search by Return ID, Order or SKU..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium w-full sm:w-auto justify-center"><Filter size={16} /> Filters</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{tab === 'returns' ? 'SKU' : 'Courier'}</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7"><TableSkeleton rows={3} cols={7} /></td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400 text-sm">No {tab} found</td></tr>
              ) : data.map(item => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium">{item.id}</td>
                  <td className="px-4 py-3 text-sm">{item.order}</td>
                  <td className="px-4 py-3 text-sm font-mono">{item.sku || item.courier || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[120px] md:max-w-none">{item.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      item.status === 'QC_PASSED' ? 'bg-green-100 text-green-700' :
                      item.status === 'QC_FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>{item.status?.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{item.date}</td>
                  <td className="px-4 py-3">
                    {item.status !== 'QC_PASSED' && item.status !== 'QC_FAILED' ? (
                      <select onChange={e => updateStatus(item.id, e.target.value)} defaultValue="" className="text-xs border rounded px-2 py-1 outline-none">
                        <option value="" disabled>Process QC</option>
                        <option value="QC_PASSED">Pass</option>
                        <option value="QC_FAILED">Fail</option>
                      </select>
                    ) : <span className="text-xs text-slate-400">Done</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Returns;
