import React, { useState } from 'react';
import { Search, Package, Loader, Warehouse } from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';

const TYPE_LABELS = {
  GRN: 'GRN', ORDER: 'SALES_ORDER', PUTAWAY: 'PUTAWAY',
  PURCHASE_ORDER: 'PURCHASE_ORDER', GATEPASS: 'GATEPASS', STOCK_TRANSFER: 'STOCK_TRANSFER',
};

const SkuHistory = () => {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const code = search.trim();
    if (!code) return toast.error('Enter a SKU code');
    setLoading(true);
    setSearched(true);
    try {
      const res = await API.get(`/skus/${code}/history`);
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setData(null);
        toast.error(`SKU "${code}" not found`);
      } else {
        toast.error(err.response?.data?.message || 'Failed to fetch history');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const formatDate = (d) => {
    if (!d) return '';
    try { return new Date(d).toLocaleString(); } catch { return d; }
  };

  const formatCurrency = (val) => {
    const n = parseFloat(val);
    return isNaN(n) ? '—' : `₹${n.toLocaleString('en-IN')}`;
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">SKU Transaction History</h1>
      <p className="text-sm text-slate-500">Search any SKU to see its complete lifecycle — GRN receipts, sales orders, putaway, POs, gatepasses, and stock transfers.</p>

      {/* Search bar */}
      <div className="flex gap-2 max-w-xl">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter SKU code e.g. SKU-001"
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-400"
          />
        </div>
        <button onClick={handleSearch} disabled={loading || !search.trim()} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
          {loading ? <Loader size={16} className="animate-spin" /> : <Search size={16} />}
          Search
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader size={32} className="animate-spin text-blue-600" />
        </div>
      )}

      {/* No results */}
      {searched && !loading && !data && (
        <div className="text-center py-12 text-slate-400">
          <Package size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm mt-1">Check the SKU code and try again.</p>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-4">
          {/* SKU header card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Package size={24} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold">{data.sku.name}</h2>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                  <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{data.sku.skuCode}</span>
                  {data.sku.epcCode && <span className="font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">EPC: {data.sku.epcCode}</span>}
                  {data.sku.size && <span>Size: {data.sku.size}</span>}
                  {data.sku.unitType && <span>Unit: {data.sku.unitType}</span>}
                  {data.sku.mrp && <span>MRP: ₹{Number(data.sku.mrp).toLocaleString('en-IN')}</span>}
                </div>
              </div>
              <span className="text-xs text-slate-400">{data.timeline.length} events</span>
            </div>
          </div>

          {/* Stock summary */}
          {data.inventory && data.inventory.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Warehouse size={14} /> Current Stock Levels</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase">
                      <th className="pb-2 pr-4">Warehouse</th>
                      <th className="pb-2 pr-4">Bin</th>
                      <th className="pb-2 pr-4 text-right">On Hand</th>
                      <th className="pb-2 pr-4 text-right">Available</th>
                      <th className="pb-2 text-right">Reserved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.inventory.map((inv, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 pr-4">{inv.warehouse?.name || '-'}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{inv.binLocation}</td>
                        <td className="py-2 pr-4 text-right font-medium">{inv.quantityOnHand}</td>
                        <td className="py-2 pr-4 text-right text-green-600 font-medium">{inv.quantityAvailable}</td>
                        <td className="py-2 text-right text-amber-600">{inv.quantityReserved}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Timeline table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b text-xs text-slate-500 uppercase font-semibold">
                  <th className="px-3 py-2.5 whitespace-nowrap">Timestamp</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">SKU Code</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Event Source ID</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Source Facility</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Target Facility</th>
                  <th className="px-3 py-2.5 whitespace-nowrap">Event Type</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">Qty</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">Qty Changed</th>
                  <th className="px-3 py-2.5 text-right whitespace-nowrap">Qty So Far</th>
                </tr>
              </thead>
              <tbody>
                {data.timeline.map((ev, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">{ev.date ? formatDate(ev.date) : '-'}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{data.sku.skuCode}</td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{ev.eventSourceId || ev.ref || '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">{ev.sourceFacility || '-'}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-600">{ev.targetFacility || '-'}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        ev.type === 'GRN' ? 'bg-green-100 text-green-700' :
                        ev.type === 'ORDER' ? 'bg-blue-100 text-blue-700' :
                        ev.type === 'PUTAWAY' ? 'bg-amber-100 text-amber-700' :
                        ev.type === 'PURCHASE_ORDER' ? 'bg-purple-100 text-purple-700' :
                        ev.type === 'GATEPASS' ? 'bg-indigo-100 text-indigo-700' :
                        ev.type === 'STOCK_TRANSFER' ? 'bg-cyan-100 text-cyan-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>{TYPE_LABELS[ev.type] || ev.type}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{ev.qty ?? '-'}</td>
                    <td className={`px-3 py-2.5 text-right font-mono text-xs font-medium ${ev.qtyChanged > 0 ? 'text-green-600' : ev.qtyChanged < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                      {ev.qtyChanged !== undefined ? (ev.qtyChanged > 0 ? `+${ev.qtyChanged}` : String(ev.qtyChanged)) : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">{ev.qtySoFar ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.timeline.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Package size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No transaction history found for this SKU.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SkuHistory;
