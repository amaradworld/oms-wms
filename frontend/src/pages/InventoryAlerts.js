import React, { useState, useEffect } from 'react';
import { AlertTriangle, Package, RefreshCw, Sliders } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const InventoryAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [total, setTotal] = useState(0);
  const [threshold, setThreshold] = useState(5);
  const [loading, setLoading] = useState(true);
  const { selectedFacility } = useAuth();

  const loadAlerts = async (t) => {
    setLoading(true);
    try {
      const params = { threshold: t || threshold };
      if (selectedFacility) params.warehouseId = selectedFacility.id;
      const { data } = await API.get('/inventory/alerts', { params });
      setAlerts(data.alerts || []);
      setTotal(data.total || 0);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadAlerts(); }, [selectedFacility]);

  const outOfStock = alerts.filter(a => a.status === 'OUT_OF_STOCK');
  const lowStock = alerts.filter(a => a.status === 'LOW_STOCK');

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Inventory Alerts</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor low stock and out-of-stock items</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border rounded-lg px-3 py-2 text-sm">
            <Sliders size={14} className="text-slate-400" />
            <label className="text-slate-500">Threshold:</label>
            <input type="number" value={threshold} onChange={e => setThreshold(Number(e.target.value))} className="w-16 text-sm outline-none" min="1" />
            <button onClick={() => loadAlerts(threshold)} className="text-blue-600 font-medium text-xs">Apply</button>
          </div>
          <button onClick={() => loadAlerts()} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4"><p className="text-xs text-slate-500 font-semibold uppercase">Total Alerts</p><p className="text-2xl font-bold mt-1">{total}</p></div>
        <div className="card p-4 border-red-200"><p className="text-xs text-red-600 font-semibold uppercase">Out of Stock</p><p className="text-2xl font-bold mt-1 text-red-600">{outOfStock.length}</p></div>
        <div className="card p-4 border-amber-200"><p className="text-xs text-amber-600 font-semibold uppercase">Low Stock</p><p className="text-2xl font-bold mt-1 text-amber-600">{lowStock.length}</p></div>
      </div>

      {loading ? <Skeleton /> : alerts.length === 0 ? (
        <EmptyState icon="package" title="All stocked up" description="No items below the threshold." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">SKU</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Item</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Warehouse</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Bin</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Available</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Reorder Point</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map(a => (
                  <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-mono font-medium">{a.skuCode}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{a.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{a.warehouseName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{a.binLocation || '-'}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{a.quantityAvailable}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{a.reorderPoint}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${a.status === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {a.status === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Low Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryAlerts;
