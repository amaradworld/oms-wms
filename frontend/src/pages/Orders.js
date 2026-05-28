import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, MoreVertical, RefreshCw, Eye, XCircle, X, ChevronLeft, ChevronRight, FileText, Scissors, Plus, Loader2 } from 'lucide-react';
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
  DISPATCHED: 'bg-teal-100 text-teal-700',
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
  MANUAL: 'bg-purple-100 text-purple-700',
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [allSources, setAllSources] = useState([]);
  const { selectedFacility } = useAuth();

  const fetchOrders = useCallback(async (targetPage) => {
    setLoading(true);
    try {
      const pg = targetPage || 1;
      const params = { page: pg, limit: 50 };
      if (selectedFacility) params.warehouseId = selectedFacility.id;
      if (sourceFilter !== 'ALL') params.source = sourceFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const res = await API.get('/orders', { params });
      const data = res.data;
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setPage(pg);
      const sources = [...new Set((data.orders || []).map(o => o.source).filter(Boolean))];
      setAllSources(sources);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFacility, sourceFilter, dateFrom, dateTo]);

  useEffect(() => { fetchOrders(1); }, [fetchOrders]);

  const filteredOrders = orders.filter(o => {
    return !searchTerm ||
      o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
          <button onClick={() => setShowManualOrder(true)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs md:text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus size={14} /> Manual Order
          </button>
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
          <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); fetchOrders(1); }} className="input-field w-full sm:w-32">
            <option value="ALL">All Sources</option>
            {allSources.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="MANUAL">MANUAL</option>
          </select>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); }} className="input-field w-full sm:w-36 text-xs" title="From date" />
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); }} className="input-field w-full sm:w-36 text-xs" title="To date" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="p-1.5 hover:bg-slate-100 rounded-lg" title="Clear dates">
              <X size={14} />
            </button>
          )}
          <button onClick={() => fetchOrders(1)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">Apply</button>
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
                {detailOrder.ewayBillNumber && <div><span className="text-slate-500">E-way Bill</span><p className="font-mono text-xs font-medium">{detailOrder.ewayBillNumber}</p></div>}
                {detailOrder.irn && <div><span className="text-slate-500">IRN</span><p className="font-mono text-xs truncate" title={detailOrder.irn}>{detailOrder.irn.substring(0, 20)}...</p></div>}
              </div>
              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); const v = prompt('Enter E-way Bill number:'); if (v) { API.patch(`/invoice/${detailOrder.id}/eway-bill`, { ewayBillNumber: v }).then(() => { toast.success('E-way bill saved'); setDetailOrder({ ...detailOrder, ewayBillNumber: v }); }).catch(e => toast.error('Failed')); } }} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50">
                  <FileText size={13} /> Set E-way Bill
                </button>
                <button onClick={(e) => { e.stopPropagation(); const v = prompt('Enter IRN:'); if (v) { API.patch(`/invoice/${detailOrder.id}/eway-bill`, { irn: v }).then(() => { toast.success('IRN saved'); setDetailOrder({ ...detailOrder, irn: v }); }).catch(e => toast.error('Failed')); } }} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50">
                  <FileText size={13} /> Set IRN
                </button>
                {(detailOrder.orderStatus === 'PENDING' || detailOrder.orderStatus === 'PROCESSING') && detailOrder.items?.length > 1 && (
                  <button onClick={(e) => { e.stopPropagation(); const wh = prompt('Split into how many orders? (comma-separated item counts, e.g. "2,3" means 2 items in first, 3 in second):'); if (wh) { toast.info('Split feature: contact admin for warehouse mapping'); } }} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50 text-amber-600">
                    <Scissors size={13} /> Split
                  </button>
                )}
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

      {showManualOrder && (
        <ManualOrderModal
          onClose={() => setShowManualOrder(false)}
          onSuccess={() => { setShowManualOrder(false); fetchOrders(1); }}
        />
      )}
    </div>
  );
};

const ManualOrderModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    orderNumber: 'MAN-' + Date.now().toString(36).toUpperCase(),
    customerName: '',
    shippingAddress: '',
  });
  const [items, setItems] = useState([]);
  const [skuSearch, setSkuSearch] = useState('');
  const [skuResults, setSkuResults] = useState([]);
  const [searchingSku, setSearchingSku] = useState(false);
  const [creating, setCreating] = useState(false);

  const searchSkus = useCallback(async (q) => {
    if (!q || q.length < 2) { setSkuResults([]); return; }
    setSearchingSku(true);
    try {
      const res = await API.get('/skus', { params: { search: q } });
      setSkuResults(res.data?.skus || res.data || []);
    } catch {
      setSkuResults([]);
    } finally {
      setSearchingSku(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchSkus(skuSearch), 300);
    return () => clearTimeout(timer);
  }, [skuSearch, searchSkus]);

  const addItem = (sku) => {
    if (items.find(i => i.skuId === sku.id)) {
      toast.info('SKU already added');
      return;
    }
    setItems([...items, { skuId: sku.id, skuCode: sku.skuCode, name: sku.name, quantity: 1, unitPrice: sku.mrp || 0 }]);
    setSkuSearch('');
    setSkuResults([]);
  };

  const removeItem = (skuId) => setItems(items.filter(i => i.skuId !== skuId));

  const updateItem = (skuId, field, value) => {
    setItems(items.map(i => i.skuId === skuId ? { ...i, [field]: value } : i));
  };

  const handleSubmit = async () => {
    if (!form.customerName || !form.shippingAddress || items.length === 0) {
      toast.error('Customer name, shipping address, and at least one item required');
      return;
    }
    setCreating(true);
    try {
      await API.post('/orders', {
        ...form,
        items: items.map(i => ({ skuId: i.skuId, quantity: i.quantity, unitPrice: i.unitPrice })),
      });
      toast.success('Manual order created');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Manual Order</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Order Number</label>
            <input type="text" className="input-field" value={form.orderNumber} onChange={e => setForm({ ...form, orderNumber: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Customer Name</label>
            <input type="text" className="input-field" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Shipping Address</label>
            <textarea className="input-field" rows={2} value={form.shippingAddress} onChange={e => setForm({ ...form, shippingAddress: e.target.value })} placeholder="123 Main St, City, State, ZIP" />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Add Items (search by SKU)</label>
            <div className="relative">
              <input type="text" className="input-field" value={skuSearch} onChange={e => setSkuSearch(e.target.value)} placeholder="Type SKU code or name..." />
              {searchingSku && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
              {skuResults.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-white border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {skuResults.map(sku => (
                    <button key={sku.id} onClick={() => addItem(sku)} className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 flex justify-between items-center">
                      <span><span className="font-medium">{sku.skuCode}</span> {sku.name && <span className="text-slate-500">- {sku.name}</span>}</span>
                      <span className="text-xs text-indigo-600 font-medium">+ Add</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {items.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Items ({items.length})</label>
              <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                {items.map((item) => (
                  <div key={item.skuId} className="flex items-center gap-2">
                    <span className="flex-1 text-sm truncate">{item.skuCode}</span>
                    <input type="number" min={1} className="input-field w-16 text-xs text-center" value={item.quantity} onChange={e => updateItem(item.skuId, 'quantity', parseInt(e.target.value) || 1)} />
                    <input type="number" min={0} step="0.01" className="input-field w-20 text-xs text-center" value={item.unitPrice} onChange={e => updateItem(item.skuId, 'unitPrice', parseFloat(e.target.value) || 0)} placeholder="Price" />
                    <button onClick={() => removeItem(item.skuId)} className="p-1 hover:bg-red-100 rounded-lg text-red-500"><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button onClick={handleSubmit} disabled={creating || items.length === 0} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          {creating && <Loader2 size={16} className="animate-spin" />}
          {creating ? 'Creating...' : 'Create Order'}
        </button>
      </div>
    </div>
  );
};

export default Orders;