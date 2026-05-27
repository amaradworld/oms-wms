import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, MoreVertical, RefreshCw, Eye, XCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import ImportButton from '../components/ImportButton';
import SampleCSVButton from '../components/SampleCSVButton';
import { toast } from '../components/Toast';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/EmptyState';
import { TableSkeleton } from '../components/Skeleton';

const statusColors = {
  PENDING: 'bg-amber-100 text-amber-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  PICKING: 'bg-indigo-100 text-indigo-700',
  PACKING: 'bg-cyan-100 text-cyan-700',
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const { selectedFacility } = useAuth();

  const fetchOrders = useCallback(async (targetPage) => {
    setLoading(true);
    try {
      const pg = targetPage || 1;
      const params = { page: pg, limit: 50 };
      if (selectedFacility) params.warehouseId = selectedFacility.id;
      const res = await API.get('/orders', { params });
      const data = res.data;
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setPage(pg);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFacility]);

  useEffect(() => { fetchOrders(1); }, [fetchOrders]);

  const filteredOrders = orders.filter(o => {
    const matchSearch = !searchTerm || 
      o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSource = sourceFilter === 'ALL' || o.source === sourceFilter;
    return matchSearch && matchSource;
  });

  const sources = [...new Set(orders.map(o => o.source).filter(Boolean))];

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('[data-menu]')) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCancelOrder = async (order) => {
    if (!window.confirm(`Cancel order ${order.orderNumber}?`)) return;
    try {
      await API.post(`/orders/${order.id}/cancel`);
      toast.success(`Order ${order.orderNumber} cancelled`);
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
    setOpenMenuId(null);
  };

  const handleMarkDelivered = async (order) => {
    if (!window.confirm(`Mark order ${order.orderNumber} as delivered?`)) return;
    try {
      await API.patch(`/delivery/orders/${order.id}/deliver`);
      toast.success(`Order ${order.orderNumber} marked delivered`);
      fetchOrders();
      if (detailOrder?.id === order.id) {
        setDetailOrder({ ...detailOrder, orderStatus: 'DELIVERED' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark delivered');
    }
    setOpenMenuId(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Order Management</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={() => fetchOrders(1)} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs md:text-sm font-medium hover:bg-slate-50">
            <RefreshCw size={14} /> Refresh
          </button>
          <SampleCSVButton type="orders" />
          <ImportButton label="Orders" endpoint="orders" onSuccess={fetchOrders} />
        </div>
      </div>

      <div className="card p-3 md:p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by Order ID or Customer..." 
            className="input-field"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-slate-400 flex-shrink-0" />
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); fetchOrders(1); }}
            className="input-field w-full sm:w-auto"
          >
            <option value="ALL">All Sources</option>
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <TableSkeleton rows={8} cols={7} />
          ) : filteredOrders.length === 0 ? (
              <EmptyState icon="orders" title="No orders found" description="Orders will appear here once they are created or synced from marketplaces." />
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
                    <td className="px-4 py-3 text-right relative">
                      <button onClick={() => setOpenMenuId(openMenuId === order.id ? null : order.id)} className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors">
                        <MoreVertical size={16} className="text-slate-400" />
                      </button>
                      {openMenuId === order.id && (
                        <div data-menu className="absolute right-2 top-10 z-40 w-44 bg-white rounded-xl shadow-xl border border-indigo-100/60 py-1 animate-fade-in">
                          <button onClick={() => { setDetailOrder(order); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 transition-colors">
                            <Eye size={15} className="text-indigo-500" /> View Details
                          </button>
                          <button onClick={() => handleCancelOrder(order)} disabled={order.orderStatus === 'CANCELLED' || order.orderStatus === 'DELIVERED'} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                            <XCircle size={15} /> Cancel Order
                          </button>
                          {order.orderStatus === 'SHIPPED' && (
                            <button onClick={() => handleMarkDelivered(order)} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors">
                              <span className="text-lg leading-none">&#10003;</span> Mark Delivered
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => fetchOrders(page - 1)} disabled={page <= 1} className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft size={14} /> Previous
            </button>
            <button onClick={() => fetchOrders(page + 1)} disabled={page >= totalPages} className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDetailOrder(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Order {detailOrder.orderNumber}</h3>
              <button onClick={() => setDetailOrder(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-slate-500">Customer</span><p className="font-medium">{detailOrder.customerName}</p></div>
                <div><span className="text-slate-500">Status</span><p><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[detailOrder.orderStatus] || 'bg-slate-100 text-slate-600'}`}>{detailOrder.orderStatus}</span></p></div>
                <div className="col-span-2"><span className="text-slate-500">Shipping Address</span><p className="font-medium">{detailOrder.shippingAddress || '—'}</p></div>
                <div><span className="text-slate-500">Source</span><p className="font-medium">{detailOrder.source || '—'}</p></div>
                <div><span className="text-slate-500">Date</span><p className="font-medium">{detailOrder.createdAt ? new Date(detailOrder.createdAt).toLocaleDateString() : '—'}</p></div>
                {detailOrder.trackingAWB && <div className="col-span-2"><span className="text-slate-500">Tracking AWB</span><p className="font-mono text-xs">{detailOrder.trackingAWB}</p></div>}
              </div>
              {detailOrder.items?.length > 0 && (
                <div>
                  <span className="text-slate-500 block mb-2">Items ({detailOrder.items.length})</span>
                  <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                    {detailOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{item.sku?.skuCode || item.skuId} {item.sku?.name ? `- ${item.sku.name}` : ''}</span>
                        <span className="text-slate-500">x{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {detailOrder.orderStatus === 'SHIPPED' && (
                <button onClick={() => { handleMarkDelivered(detailOrder); setDetailOrder(null); }} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors">
                  Mark Delivered
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
