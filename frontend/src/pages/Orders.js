import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Filter, MoreVertical, RefreshCw, Eye, XCircle, X, ChevronLeft, ChevronRight, FileText, Scissors, Plus, Loader2, Clock, DollarSign, Hash, MapPin, Package, Tag, Truck, User, Building2, CreditCard } from 'lucide-react';
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

const Orders = ({ detailId, setDetailId }) => {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
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

  useEffect(() => {
    if (detailId && !detailOrder) {
      API.get(`/orders/${detailId}`).then(res => setDetailOrder(res.data)).catch(() => setDetailId(''));
    }
  }, [detailId]);

  const openOrderDetail = (order) => {
    setDetailOrder(order);
    if (setDetailId) setDetailId(order.id);
  };

  const closeOrderDetail = () => {
    setDetailOrder(null);
    if (setDetailId) setDetailId('');
  };

  const fetchOrders = useCallback(async (targetPage) => {
    setLoading(true);
    try {
      const pg = targetPage || 1;
      const params = { page: pg, limit: 50 };
      if (selectedFacility) params.warehouseId = selectedFacility.id;
      if (sourceFilter !== 'ALL') params.source = sourceFilter;
      if (statusFilter !== 'ALL') params.orderStatus = statusFilter;
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
  }, [selectedFacility, sourceFilter, statusFilter, dateFrom, dateTo]);

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
          <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); }} className="input-field w-full sm:w-28">
            <option value="ALL">All Sources</option>
            {allSources.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="MANUAL">MANUAL</option>
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); }} className="input-field w-full sm:w-28">
            <option value="ALL">All Status</option>
            {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
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
                           <button onClick={() => { openOrderDetail(order); setOpenMenuId(null); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 transition-colors">
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
        <OrderDetailModal
          order={detailOrder}
          onClose={closeOrderDetail}
          onUpdate={(updated) => setDetailOrder(updated)}
          onMarkDelivered={handleMarkDelivered}
        />
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
    displayOrderCode: '', source: '', orderDate: new Date().toISOString().split('T')[0],
    paymentMode: '', currency: 'INR', warehouseId: '',
    channelProcessingTime: '', pdfAttachment: '', deliverMode: '',
    customerCode: '', customerName: '', notificationEmail: '', notificationMobile: '', customerGstin: '',
    billingName: '', billingAddress1: '', billingAddress2: '',
    billingCountry: 'India', billingState: '', billingCity: '', billingDistrict: '',
    billingPinCode: '', billingPhone: '', billingLatitude: '', billingLongitude: '', billingEmail: '',
    shippingAddress: '', shippingSameAsBilling: true,
    discountAmount: 0, giftWrapCharges: 0, shippingCharges: 0,
  });
  const [items, setItems] = useState([]);
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [creating, setCreating] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const scanRef = useRef(null);
  const { selectedFacility } = useAuth();

  useEffect(() => { scanRef.current?.focus(); }, []);
  useEffect(() => {
    API.get('/warehouses').then(r => { setWarehouses(Array.isArray(r.data) ? r.data : []); }).catch(() => {});
    if (selectedFacility?.id) setForm(f => ({ ...f, warehouseId: selectedFacility.id }));
  }, [selectedFacility]);

  const handleScan = async () => {
    const code = barcode.trim();
    if (!code) return;
    setScanning(true);
    try {
      const res = await API.get('/skus', { params: { search: code } });
      const skus = res.data?.skus || [];
      const sku = skus.find(s => s.skuCode === code);
      if (!sku) { toast.error(`SKU "${code}" not found`); setBarcode(''); return; }
      const existing = items.find(i => i.skuId === sku.id);
      if (existing) {
        setItems(items.map(i => i.skuId === sku.id ? { ...i, quantity: i.quantity + 1 } : i));
      } else {
        setItems([...items, { skuId: sku.id, skuCode: sku.skuCode, name: sku.name, quantity: 1, unitPrice: sku.mrp || 0, mrp: sku.mrp || 0, discountAmount: 0 }]);
      }
      setBarcode('');
    } catch { toast.error('Error looking up SKU'); } finally { setScanning(false); scanRef.current?.focus(); }
  };

  const updateItem = (skuId, field, value) => {
    setItems(items.map(i => i.skuId === skuId ? { ...i, [field]: value } : i));
  };

  const removeItem = (skuId) => setItems(items.filter(i => i.skuId !== skuId));

  const subtotal = items.reduce((s, i) => s + (i.unitPrice || 0) * i.quantity, 0);
  const totalDiscount = (form.discountAmount || 0) + items.reduce((s, i) => s + (i.discountAmount || 0), 0);
  const payable = subtotal - totalDiscount + (form.giftWrapCharges || 0) + (form.shippingCharges || 0);

  const setBillingField = (field, value) => {
    const updated = { ...form, [field]: value };
    if (form.shippingSameAsBilling) {
      if (field === 'billingName') updated.customerName = value;
      if (field === 'billingAddress1') updated.shippingAddress = value;
      if (field === 'billingPhone') updated.notificationMobile = value;
      if (field === 'billingEmail') updated.notificationEmail = value;
      setForm(updated);
      return;
    }
    setForm(updated);
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
        orderDate: form.orderDate ? new Date(form.orderDate).toISOString() : null,
        source: form.source || 'MANUAL',
        items: items.map(i => ({ skuId: i.skuId, quantity: i.quantity, unitPrice: i.unitPrice, mrp: i.mrp, discountAmount: i.discountAmount })),
        orderAmount: payable,
      });
      toast.success('Manual order created');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create order');
    } finally { setCreating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h3 className="text-lg font-bold">Create Order</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {/* ── Basic Details ── */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-blue-500 rounded-full" /> Basic Details</h4>
            <p className="text-[10px] text-slate-400 mb-3">Auto Generated Code is for your internal purpose, while the other code is displayed to Customer.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Auto Generated Order Code *</label>
                <input type="text" className="input-field text-sm bg-slate-50" value={form.orderNumber} onChange={e => setForm({ ...form, orderNumber: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Display Order Code (Optional)</label>
                <input type="text" className="input-field text-sm" value={form.displayOrderCode} onChange={e => setForm({ ...form, displayOrderCode: e.target.value })} placeholder="e.g. Alpha-Numeric / Numeric" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Channel *</label>
                <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="input-field text-sm">
                  <option value="">Select Channel</option>
                  <option value="MANUAL">Manual</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Flipkart">Flipkart</option>
                  <option value="Shopify">Shopify</option>
                  <option value="Nykaa">Nykaa</option>
                  <option value="Myntra">Myntra</option>
                  <option value="Meesho">Meesho</option>
                  <option value="TataCliq">TataCliq</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Order date *</label>
                <input type="date" className="input-field text-sm" value={form.orderDate} onChange={e => setForm({ ...form, orderDate: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Payment Mode *</label>
                <select value={form.paymentMode} onChange={e => setForm({ ...form, paymentMode: e.target.value })} className="input-field text-sm">
                  <option value="">Select an option</option>
                  <option value="COD">COD</option>
                  <option value="PREPAID">Prepaid</option>
                  <option value="CREDIT">Credit</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Currency (Optional)</label>
                <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="input-field text-sm">
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Facility Code *</label>
                <select value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })} className="input-field text-sm">
                  <option value="">Select Facility</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.displayName || w.name} ({w.code || 'N/A'})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Channel Processing Time (Optional)</label>
                <input type="date" className="input-field text-sm" value={form.channelProcessingTime} onChange={e => setForm({ ...form, channelProcessingTime: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">PDF_Attachment (Optional)</label>
                <input type="text" className="input-field text-sm" value={form.pdfAttachment} onChange={e => setForm({ ...form, pdfAttachment: e.target.value })} placeholder="URL or path" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">deliverMode (Optional)</label>
                <input type="text" className="input-field text-sm" value={form.deliverMode} onChange={e => setForm({ ...form, deliverMode: e.target.value })} placeholder="e.g. Standard, Express" />
              </div>
            </div>
          </div>

          {/* ── Customer Details ── */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-green-500 rounded-full" /> Customer Details</h4>
            <p className="text-[10px] text-slate-400 mb-3">Type Name or Code of Customer. Rest of the fields will be populated automatically. This Address, Email &amp; Phone no. is used to communicate order information to Customer.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Customer Code *</label>
                <input type="text" className="input-field text-sm" value={form.customerCode} onChange={e => setForm({ ...form, customerCode: e.target.value })} placeholder="e.g. name or Code" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Customer Name *</label>
                <input type="text" className="input-field text-sm" value={form.customerName} onChange={e => setBillingField('billingName', e.target.value)} placeholder="e.g. name or Code" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Notification Email (Optional)</label>
                <input type="email" className="input-field text-sm" value={form.notificationEmail} onChange={e => setForm({ ...form, notificationEmail: e.target.value })} placeholder="e.g. ken@xyz.com" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Notification Mobile (Optional)</label>
                <input type="tel" className="input-field text-sm" value={form.notificationMobile} onChange={e => setForm({ ...form, notificationMobile: e.target.value })} placeholder="e.g. 9999999999" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-medium text-slate-500 mb-1">GSTIN (Optional)</label>
                <input type="text" className="input-field text-sm" value={form.customerGstin} onChange={e => setForm({ ...form, customerGstin: e.target.value })} placeholder="GSTIN" />
              </div>
            </div>
          </div>

          {/* ── Billing Address ── */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-purple-500 rounded-full" /> Billing Address</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Name *</label>
                <input type="text" className="input-field text-sm" value={form.billingName} onChange={e => setBillingField('billingName', e.target.value)} placeholder="Name" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Email (Optional)</label>
                <input type="email" className="input-field text-sm" value={form.billingEmail} onChange={e => setBillingField('billingEmail', e.target.value)} placeholder="Email" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Address Line 1 *</label>
                <input type="text" className="input-field text-sm" value={form.billingAddress1} onChange={e => setBillingField('billingAddress1', e.target.value)} placeholder="Address Line 1" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Address Line 2 (Optional)</label>
                <input type="text" className="input-field text-sm" value={form.billingAddress2} onChange={e => setForm({ ...form, billingAddress2: e.target.value })} placeholder="Address Line 2" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Country *</label>
                <select value={form.billingCountry} onChange={e => setForm({ ...form, billingCountry: e.target.value })} className="input-field text-sm">
                  <option value="India">India (IN)</option>
                  <option value="USA">USA</option>
                  <option value="UAE">UAE</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">State *</label>
                <input type="text" className="input-field text-sm" value={form.billingState} onChange={e => setForm({ ...form, billingState: e.target.value })} placeholder="Select State" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">City *</label>
                <input type="text" className="input-field text-sm" value={form.billingCity} onChange={e => setForm({ ...form, billingCity: e.target.value })} placeholder="City" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">District (Optional)</label>
                <input type="text" className="input-field text-sm" value={form.billingDistrict} onChange={e => setForm({ ...form, billingDistrict: e.target.value })} placeholder="District" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Pin Code *</label>
                <input type="text" className="input-field text-sm" value={form.billingPinCode} onChange={e => setForm({ ...form, billingPinCode: e.target.value })} placeholder="Pincode" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Phone *</label>
                <input type="tel" className="input-field text-sm" value={form.billingPhone} onChange={e => setBillingField('billingPhone', e.target.value)} placeholder="Phone" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Latitude *</label>
                <input type="text" className="input-field text-sm" value={form.billingLatitude} onChange={e => setForm({ ...form, billingLatitude: e.target.value })} placeholder="Latitude" />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Longitude *</label>
                <input type="text" className="input-field text-sm" value={form.billingLongitude} onChange={e => setForm({ ...form, billingLongitude: e.target.value })} placeholder="Longitude" />
              </div>
            </div>
          </div>

          {/* ── Shipping Address ── */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-orange-500 rounded-full" /> Shipping Address</h4>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={form.shippingSameAsBilling} onChange={e => {
                setForm({ ...form, shippingSameAsBilling: e.target.checked });
                if (e.target.checked) {
                  setForm(f => ({ ...f, shippingSameAsBilling: true, shippingAddress: f.billingAddress1 || '' }));
                }
              }} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-xs font-medium text-slate-600">Shipping Address is same as Billing Address</span>
            </label>
            {!form.shippingSameAsBilling && (
              <div className="col-span-2">
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Shipping Address *</label>
                <textarea className="input-field text-sm" rows={2} value={form.shippingAddress} onChange={e => setForm({ ...form, shippingAddress: e.target.value })} placeholder="Full shipping address" />
              </div>
            )}
          </div>

          {/* ── Item Details ── */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-pink-500 rounded-full" /> Item Details</h4>
            <p className="text-[10px] text-slate-400 mb-3">Type first 2 characters of name or item sku of order item in order-item dropdown and fill rest of details or you can also import the list of order items by clicking Import Via CSV link.</p>

            <div className="relative mb-3">
              <input ref={scanRef} type="text" className="input-field text-sm pr-8" value={barcode} onChange={e => setBarcode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleScan(); } }} placeholder="Scan barcode or type SKU code..." />
              {scanning && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
            </div>

            {items.length > 0 && (
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-left text-xs min-w-[700px]">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-2 py-1.5 font-semibold text-slate-500">#</th>
                      <th className="px-2 py-1.5 font-semibold text-slate-500">Item SKU Code</th>
                      <th className="px-2 py-1.5 font-semibold text-slate-500">Inventory</th>
                      <th className="px-2 py-1.5 font-semibold text-slate-500 text-right">Units</th>
                      <th className="px-2 py-1.5 font-semibold text-slate-500 text-right">MRP (₹)</th>
                      <th className="px-2 py-1.5 font-semibold text-slate-500 text-right">Selling Price (₹)</th>
                      <th className="px-2 py-1.5 font-semibold text-slate-500 text-right">Discount (₹)</th>
                      <th className="px-2 py-1.5 font-semibold text-slate-500 text-right">Net Price (₹)</th>
                      <th className="px-2 py-1.5 font-semibold text-slate-500 text-right">Sub-Total (₹)</th>
                      <th className="px-2 py-1.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => {
                      const netPrice = (item.unitPrice || 0) - (item.discountAmount || 0);
                      const subTotal = netPrice * item.quantity;
                      return (
                        <tr key={item.skuId} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-2 py-1.5 text-slate-400">{idx + 1}</td>
                          <td className="px-2 py-1.5 font-mono font-medium">{item.skuCode}</td>
                          <td className="px-2 py-1.5 text-slate-400">{item.name || '-'}</td>
                          <td className="px-2 py-1.5">
                            <input type="number" min={1} className="w-14 px-1 py-0.5 border rounded text-xs text-center" value={item.quantity} onChange={e => updateItem(item.skuId, 'quantity', parseInt(e.target.value) || 1)} />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min={0} step="0.01" className="w-20 px-1 py-0.5 border rounded text-xs text-right" value={item.mrp} onChange={e => updateItem(item.skuId, 'mrp', parseFloat(e.target.value) || 0)} />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min={0} step="0.01" className="w-20 px-1 py-0.5 border rounded text-xs text-right" value={item.unitPrice} onChange={e => updateItem(item.skuId, 'unitPrice', parseFloat(e.target.value) || 0)} />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min={0} step="0.01" className="w-16 px-1 py-0.5 border rounded text-xs text-right" value={item.discountAmount} onChange={e => updateItem(item.skuId, 'discountAmount', parseFloat(e.target.value) || 0)} />
                          </td>
                          <td className="px-2 py-1.5 text-right font-medium">{netPrice.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right font-semibold">{subTotal.toFixed(2)}</td>
                          <td className="px-2 py-1.5">
                            <button onClick={() => removeItem(item.skuId)} className="p-0.5 hover:bg-red-100 rounded text-red-400"><X size={12} /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Extra Charges / Discounts / Payments ── */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><span className="w-1 h-4 bg-teal-500 rounded-full" /> Extra Charges / Discounts / Payments</h4>
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 max-w-sm">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-medium">₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Discount (-)</span>
                <input type="number" min={0} step="0.01" className="w-24 px-2 py-0.5 border rounded text-xs text-right" value={form.discountAmount} onChange={e => setForm({ ...form, discountAmount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Gift Wrap Charges</span>
                <input type="number" min={0} step="0.01" className="w-24 px-2 py-0.5 border rounded text-xs text-right" value={form.giftWrapCharges} onChange={e => setForm({ ...form, giftWrapCharges: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Shipping Charges</span>
                <input type="number" min={0} step="0.01" className="w-24 px-2 py-0.5 border rounded text-xs text-right" value={form.shippingCharges} onChange={e => setForm({ ...form, shippingCharges: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold">
                <span>Payable (for {items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                <span className="text-indigo-600">₹{payable.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={handleSubmit} disabled={creating || items.length === 0} className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {creating && <Loader2 size={16} className="animate-spin" />}
            {creating ? 'Creating...' : 'Create Order'}
          </button>
        </div>
      </div>
    </div>
  );
};

const OrderDetailModal = ({ order, onClose, onUpdate, onMarkDelivered }) => {
  const [activeTab, setActiveTab] = useState('details');

  const tr = order.tracking || {};
  const fmt = (d) => d ? new Date(d).toLocaleString() : '—';

  const tabs = [
    { id: 'details', label: 'Order Details' },
    { id: 'items', label: 'Order Items' },
    { id: 'shipments', label: 'Shipments' },
    { id: 'invoices', label: 'Invoices' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-5 max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Order #{order.orderNumber}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'details' && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <DetailField icon={Hash} label="Order No." value={order.orderNumber} />
            <DetailField icon={Hash} label="Display Order No." value={order.displayOrderCode || order.orderNumber} />
            <DetailField icon={Clock} label="Fulfillment TAT" value={order.slaDeadline ? new Date(order.slaDeadline).toLocaleString() : '—'} highlight />
            <DetailField icon={Tag} label="Priority" value={order.priority || 'Normal'} />
            <DetailField icon={Clock} label="Order Date" value={fmt(order.createdAt)} />
            <DetailField label="Status" value={<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[order.orderStatus] || 'bg-slate-100 text-slate-600'}`}>{order.orderStatus}</span>} />
            <DetailField icon={User} label="Customer" value={order.customerName} />
            <DetailField icon={Building2} label="Customer GSTIN" value={order.customerGstin || '—'} />
            <DetailField icon={Tag} label="Channel" value={order.source || '—'} />
            <DetailField icon={CreditCard} label="Payment Method" value={order.paymentMode || order.paymentStatus || '—'} />
            <DetailField icon={DollarSign} label="Order Amount" value={order.orderAmount ? `₹${Number(order.orderAmount).toFixed(2)}` : '—'} />
            <DetailField icon={Clock} label="Channel Created" value={fmt(order.createdAt)} />
            <DetailField icon={Clock} label="Uniware Created" value={fmt(order.createdAt)} />
            <DetailField icon={Clock} label="Channel Processing Time" value={order.channelProcessingTime ? fmt(order.channelProcessingTime) : '—'} />
            <DetailField icon={Clock} label="Updated at" value={fmt(order.updatedAt)} />
            <DetailField icon={Package} label="Notification Email" value={order.notificationEmail || '—'} />
            <DetailField icon={Package} label="Notification Mobile" value={order.notificationMobile || '—'} />
            <DetailField icon={FileText} label="PDF Attachment" value={order.pdfAttachment || '—'} />
            <DetailField icon={Truck} label="deliverMode" value={order.deliverMode || '—'} />
            <div className="col-span-2"><DetailField icon={MapPin} label="Shipping Address" value={order.shippingAddress || '—'} /></div>
          </div>
        )}

        {activeTab === 'items' && (
          <div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-500">Item</th>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-500">SKU</th>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-500 text-right">Qty</th>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-500 text-right">Unit Price</th>
                  <th className="px-3 py-2 text-xs font-semibold text-slate-500 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map((item, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="px-3 py-2 text-slate-600">{item.sku?.name || '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{item.sku?.skuCode || item.skuId}</td>
                    <td className="px-3 py-2 text-right">{item.quantity}</td>
                    <td className="px-3 py-2 text-right">₹{Number(item.unitPrice || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-medium">₹{Number(item.totalAmount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex gap-2 mt-3">
              {(order.orderStatus === 'PENDING' || order.orderStatus === 'PROCESSING') && order.items?.length > 1 && (
                <button onClick={() => { const v = prompt('Split: enter order numbers for each split (comma-separated):'); if (v) toast.info('Split feature invoked'); }} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50 text-amber-600">
                  <Scissors size={13} /> Split Order
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'shipments' && (
          <div className="space-y-4 text-sm">
            {order.tracking ? (
              <>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <DetailField label="Shipment Id" value={tr.id?.slice(0, 8) || '—'} />
                  <DetailField label="Shipment Status" value={tr.shipmentStatus || '—'} />
                  <DetailField label="Created On" value={tr.shippedAt ? fmt(tr.shippedAt) : '—'} />
                  <DetailField label="Picklist Number" value={tr.picklistNumber || '—'} />
                  <DetailField label="Shipment Manifest" value={tr.shipmentManifest || '—'} />
                  <DetailField label="Return Manifest" value={tr.returnManifest || '—'} />
                  <DetailField label="Invoice Number" value={tr.invoiceNumber || '—'} />
                  <DetailField label="RTO Facility" value={tr.rtoFacility || '—'} />
                  <DetailField label="Shipping Method" value={tr.shippingMethod || '—'} />
                  <DetailField label="Courier Status" value={tr.courierStatus || '—'} />
                  <DetailField label="Courier Name" value={tr.courierName || '—'} />
                  <DetailField label="Dispatched Date" value={tr.shippedAt ? fmt(tr.shippedAt) : '—'} />
                  <DetailField label="Delivery Date" value={tr.deliveredAt ? fmt(tr.deliveredAt) : '—'} />
                  <DetailField label="No. of Items" value={order.items?.length || 0} />
                  <DetailField label="Shipping Carrier" value={tr.courierName || '—'} />
                  <DetailField label="AWB No." value={tr.awbNumber || '—'} />
                  <DetailField label="No. of Boxes" value={tr.noOfBoxes || 1} />
                  <DetailField label="Shipping Package Type" value={tr.shippingPackageType || '—'} />
                  <DetailField label="Package Code" value={tr.shippingPackageCode || '—'} />
                  <DetailField label="Package Dimension (mm)" value={tr.packageDimensions || '—'} />
                  <DetailField label="Weight (Kg)" value={tr.packageWeight ? Number(tr.packageWeight).toFixed(3) : '—'} />
                  <DetailField label="Zone" value={tr.zone || '—'} />
                  <DetailField label="E-waybill Number" value={order.ewayBillNumber || '—'} />
                  <DetailField label="E-waybill Valid Till" value={tr.ewaybillValidTill ? fmt(tr.ewaybillValidTill) : '—'} />
                  <DetailField label="E-waybill Date" value={tr.ewaybillDate ? fmt(tr.ewaybillDate) : '—'} />
                  <DetailField label="deliverMode" value={order.deliverMode || '—'} />
                </div>
                {order.orderStatus === 'SHIPPED' && (
                  <button onClick={() => { onMarkDelivered(order); onClose(); }} className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors">
                    Mark Delivered
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm">No shipment tracking data available</div>
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <DetailField label="E-way Bill Number" value={order.ewayBillNumber || '—'} />
              <DetailField label="IRN" value={order.irn || '—'} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { const v = prompt('Enter E-way Bill number:'); if (v) { API.patch(`/invoice/${order.id}/eway-bill`, { ewayBillNumber: v }).then(() => { toast.success('E-way bill saved'); onUpdate({ ...order, ewayBillNumber: v }); }).catch(e => toast.error('Failed')); } }} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50">
                <FileText size={13} /> Set E-way Bill
              </button>
              <button onClick={() => { const v = prompt('Enter IRN:'); if (v) { API.patch(`/invoice/${order.id}/eway-bill`, { irn: v }).then(() => { toast.success('IRN saved'); onUpdate({ ...order, irn: v }); }).catch(e => toast.error('Failed')); } }} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50">
                <FileText size={13} /> Set IRN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DetailField = ({ icon: Icon, label, value, highlight }) => (
  <div>
    <span className="text-slate-400 text-xs flex items-center gap-1 mb-0.5">
      {Icon && <Icon size={11} />} {label}
    </span>
    <p className={`font-medium ${highlight ? 'text-amber-600' : ''}`}>{value}</p>
  </div>
);

export default Orders;