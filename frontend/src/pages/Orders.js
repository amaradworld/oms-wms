import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, MoreVertical, RefreshCw } from 'lucide-react';
import ImportButton from '../components/ImportButton';
import SampleCSVButton from '../components/SampleCSVButton';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const statusColors = {
  PENDING: 'bg-amber-100 text-amber-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  SHIPPED: 'bg-green-100 text-green-700',
  DELIVERED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-red-100 text-red-700',
  RETURNED: 'bg-purple-100 text-purple-700',
};

const sourceColors = {
  Nykaa: 'bg-pink-100 text-pink-700',
  Myntra: 'bg-indigo-100 text-indigo-700',
  TataCliq: 'bg-cyan-100 text-cyan-700',
  Shopify: 'bg-green-100 text-green-700',
  Amazon: 'bg-orange-100 text-orange-700',
  Flipkart: 'bg-blue-100 text-blue-700',
  Meesho: 'bg-yellow-100 text-yellow-700',
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const { selectedFacility } = useAuth();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedFacility ? { warehouseId: selectedFacility.id } : {};
      const res = await API.get('/orders', { params });
      setOrders(res.data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFacility]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const filteredOrders = orders.filter(o => {
    const matchSearch = !searchTerm || 
      o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSource = sourceFilter === 'ALL' || o.source === sourceFilter;
    return matchSearch && matchSource;
  });

  const sources = [...new Set(orders.map(o => o.source).filter(Boolean))];

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Order Management</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={fetchOrders} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs md:text-sm font-medium hover:bg-slate-50">
            <RefreshCw size={14} /> Refresh
          </button>
          <SampleCSVButton type="orders" />
          <ImportButton label="Orders" endpoint="orders" onSuccess={fetchOrders} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by Order ID or Customer..." 
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-slate-400 flex-shrink-0" />
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="ALL">All Sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No orders found</div>
          ) : (
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{order.customerName}</td>
                    <td className="px-4 py-3 text-sm">
                      {order.source && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${sourceColors[order.source] || 'bg-slate-100 text-slate-600'}`}>
                          {order.source}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{order.items?.length || 0} items</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[order.orderStatus] || 'bg-slate-100 text-slate-600'}`}>
                        {order.orderStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1 hover:bg-slate-200 rounded-full"><MoreVertical size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Orders;
