import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, Search, RefreshCw } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { TableSkeleton } from '../components/Skeleton';

const StockExpiry = () => {
  const { selectedFacility } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = { days };
    if (selectedFacility) params.warehouseId = selectedFacility.id;
    try {
      const res = await API.get('/expiry/stock', { params });
      setData(res.data);
    } catch { setData(null); } finally { setLoading(false); }
  }, [days, selectedFacility]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const now = new Date();

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Clock size={20} /> Stock Expiry Tracking</h1>
          <p className="text-sm text-slate-500">Monitor inventory approaching expiration</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={days} onChange={e => setDays(Number(e.target.value))} className="text-sm border rounded-lg px-3 py-2">
            <option value={7}>Next 7 days</option>
            <option value={14}>Next 14 days</option>
            <option value={30}>Next 30 days</option>
            <option value={60}>Next 60 days</option>
            <option value={90}>Next 90 days</option>
          </select>
          <button onClick={fetchData} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border rounded-lg hover:bg-slate-50"><RefreshCw size={14} /> Refresh</button>
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} /> : !data ? (
        <div className="bg-white border rounded-xl p-12 text-center text-slate-400">No data</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase">Total Expiring</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{data.total}</p>
              <p className="text-xs text-slate-400 mt-1">Within {days} days</p>
            </div>
            <div className="bg-white border border-rose-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-rose-600 uppercase flex items-center gap-1"><AlertTriangle size={12} /> Already Expired</p>
              <p className="text-2xl font-bold text-rose-700 mt-1">{data.expired?.length || 0}</p>
            </div>
            <div className="bg-white border border-amber-200 rounded-xl p-5">
              <p className="text-xs font-semibold text-amber-600 uppercase">Expiring Soon</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{data.expiringSoon?.length || 0}</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b"><h3 className="font-semibold text-sm">Expiring Items</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 text-slate-600">
                  <th className="text-left px-4 py-3 font-medium">SKU</th>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Warehouse</th>
                  <th className="text-left px-4 py-3 font-medium">Bin</th>
                  <th className="text-right px-4 py-3 font-medium">Qty</th>
                  <th className="text-left px-4 py-3 font-medium">Expiry Date</th>
                  <th className="text-left px-4 py-3 font-medium">Days Left</th>
                </tr></thead>
                <tbody className="divide-y">
                  {data.expired?.concat(data.expiringSoon)?.map((item, i) => {
                    const daysLeft = Math.ceil((new Date(item.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <tr key={i} className={`hover:bg-slate-50 ${daysLeft <= 0 ? 'bg-rose-50' : daysLeft <= 7 ? 'bg-amber-50' : ''}`}>
                        <td className="px-4 py-3 font-mono text-xs">{item.sku?.skuCode}</td>
                        <td className="px-4 py-3">{item.sku?.name}</td>
                        <td className="px-4 py-3 text-slate-500">{item.warehouse?.name}</td>
                        <td className="px-4 py-3 font-mono text-xs">{item.binLocation}</td>
                        <td className="px-4 py-3 text-right font-medium">{item.quantityOnHand}</td>
                        <td className="px-4 py-3">{new Date(item.expiryDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${daysLeft <= 0 ? 'bg-rose-100 text-rose-700' : daysLeft <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {daysLeft <= 0 ? 'EXPIRED' : `${daysLeft}d`}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {(!data.expired?.length && !data.expiringSoon?.length) && (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-400">No items expiring in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StockExpiry;
