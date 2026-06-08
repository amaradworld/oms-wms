import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, Plus, X, Filter, Eye, XCircle, Loader2, Hash, Clock, Tag, User, Building2, CreditCard, DollarSign, Package, FileText, Truck, MapPin, Scissors, Save } from 'lucide-react';
import ImportButton from '../components/ImportButton';
import SampleCSVButton from '../components/SampleCSVButton';
import DataTable from '../components/DataTable';
import ExportButton from '../components/ExportButton';
import { toast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { track, trackFirst } from '../utils/analytics';

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
  ON_HOLD: 'bg-rose-100 text-rose-700',
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

const ORDERS_COLUMNS = [
  { key: 'orderNumber', label: 'Order ID', sortable: true, render: (r) => <span className="text-sm font-medium text-slate-900">{r.orderNumber}</span> },
  { key: 'customerName', label: 'Customer', sortable: true },
  { key: 'source', label: 'Source', render: (r) => r.source ? <span className={`px-2 py-1 rounded-full text-xs font-medium ${sourceColors[r.source] || 'bg-slate-100 text-slate-600'}`}>{r.source}</span> : '-' },
  { key: 'items', label: 'Items', align: 'right', render: (r) => <span className="text-sm text-slate-600">{r.items?.length || 0} items</span> },
  { key: 'orderStatus', label: 'Status', sortable: true, render: (r) => <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[r.orderStatus] || 'bg-slate-100 text-slate-600'}`}>{r.orderStatus}</span> },
  { key: 'createdAt', label: 'Date', sortable: true, render: (r) => <span className="text-sm text-slate-600">{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</span> },
];

const Orders = ({ detailId, setDetailId }) => {
  const confirm = useConfirm();
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailOrder, setDetailOrder] = useState(null);
  const [showManualOrder, setShowManualOrder] = useState(false);
  const [allSources, setAllSources] = useState([]);
  const [splitModalOrder, setSplitModalOrder] = useState(null);
  const [splitInput, setSplitInput] = useState('');
  const [ewayModalOrder, setEwayModalOrder] = useState(null);
  const [ewayInput, setEwayInput] = useState('');
  const [irnModalOrder, setIrnModalOrder] = useState(null);
  const [irnInput, setIrnInput] = useState('');
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [refreshKey, setRefreshKey] = useState(0);
  const { selectedFacility } = useAuth();

  useEffect(() => {
    if (detailId && !detailOrder) {
      const controller = new AbortController();
      API.get(`/orders/${detailId}`, { signal: controller.signal }).then(res => setDetailOrder(res.data)).catch(() => { if (!controller.signal.aborted) setDetailId(''); });
      return () => controller.abort();
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

  const refetchOrders = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const pg = 1;
    const params = { page: pg, limit: 50 };
    if (selectedFacility) params.warehouseId = selectedFacility.id;
    if (sourceFilter !== 'ALL') params.source = sourceFilter;
    if (statusFilter !== 'ALL') params.orderStatus = statusFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    API.get('/orders', { params, signal: controller.signal }).then(res => {
      const data = res.data;
      setOrders(data.orders || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setPage(pg);
      const sources = [...new Set((data.orders || []).map(o => o.source).filter(Boolean))];
      setAllSources(sources);
    }).catch(() => { if (!controller.signal.aborted) setOrders([]); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedFacility, sourceFilter, statusFilter, dateFrom, dateTo, refreshKey]);

  const filteredOrders = orders.filter(o => {
    return !searchTerm ||
      o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (!aVal) return 1; if (!bVal) return -1;
    const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : (aVal > bVal ? 1 : -1);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleCancelOrder = async (order) => {
    if (!await confirm({
      title: `Cancel ${order.orderNumber}?`,
      message: 'The customer will be notified of the cancellation. This action can be reversed by re-creating the order.',
      confirmText: 'Cancel order',
      variant: 'danger',
    })) return;
    try {
      await API.post(`/orders/${order.id}/cancel`);
      toast.success(`Order ${order.orderNumber} cancelled`, {
        duration: 6000,
        onUndo: () => toast.info('To restore a cancelled order, please recreate it manually.'),
      });
      refetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    }
  };

  const handleMarkDelivered = async (order) => {
    if (!order.awbNumber) {
      if (!await confirm({
        title: 'Mark delivered without AWB?',
        message: `Order ${order.orderNumber} has no AWB number assigned. Are you sure you want to mark it as delivered? This is unusual and may indicate a data entry issue.`,
        confirmText: 'Mark delivered anyway',
        variant: 'warning',
      })) return;
    } else {
      if (!await confirm({
        title: `Mark ${order.orderNumber} as delivered?`,
        message: `This will mark the order as DELIVERED for AWB ${order.awbNumber}.`,
        confirmText: 'Mark delivered',
        variant: 'info',
      })) return;
    }
    try {
      await API.patch(`/delivery/orders/${order.id}/deliver`);
      toast.success(`Order ${order.orderNumber} marked delivered`);
      refetchOrders();
      if (detailOrder?.id === order.id) {
        setDetailOrder({ ...detailOrder, orderStatus: 'DELIVERED' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark delivered');
    }
  };

  const handleHoldUnhold = async (order) => {
    const isHeld = order.orderStatus === 'ON_HOLD';
    if (!await confirm({
      title: `${isHeld ? 'Unhold' : 'Hold'} ${order.orderNumber}?`,
      message: isHeld ? 'This will resume order processing.' : 'This will pause the order. The customer will not be charged and the order will not be picked/packed until unheld.',
      confirmText: isHeld ? 'Unhold order' : 'Hold order',
      variant: isHeld ? 'info' : 'warning',
    })) return;
    try {
      await API.patch(`/orders/${order.id}/status`, { status: isHeld ? 'PENDING' : 'ON_HOLD' });
      toast.success(`Order ${order.orderNumber} ${isHeld ? 'unheld' : 'held'}`);
      refetchOrders();
      if (detailOrder?.id === order.id) setDetailOrder({ ...detailOrder, orderStatus: isHeld ? 'PENDING' : 'ON_HOLD' });
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${isHeld ? 'unhold' : 'hold'} order`);
    }
  };

  const handleSplitOrder = async (order) => {
    const items = order.items || [];
    if (items.length < 2) return toast.error('Need at least 2 items to split');
    setSplitInput('');
    setSplitModalOrder(order);
  };

  const handleBulkCancel = async (selected) => {
    const count = selected.size;
    if (!await confirm({
      title: `Cancel ${count} order(s)?`,
      message: `This will cancel ${count} selected orders. Customers will be notified. This action affects multiple orders.`,
      confirmText: `Cancel ${count} order(s)`,
      variant: 'danger',
      requireText: count >= 5 ? 'CANCEL ALL' : null,
    })) return;
    let cancelled = 0;
    let failed = 0;
    for (const id of selected) {
      try { await API.post(`/orders/${id}/cancel`); cancelled++; } catch { failed++; }
    }
    if (failed === 0) {
      toast.success(`${cancelled} of ${count} orders cancelled`);
    } else {
      toast.warning(`Cancelled ${cancelled}, ${failed} failed`);
    }
    setSelectedOrders(new Set());
    refetchOrders();
  };

  const handleSort = (key, dir) => {
    setSortKey(key);
    setSortDir(dir);
  };

  const actionsConfig = (order) => [
    { label: 'View Details', icon: Eye, onClick: () => openOrderDetail(order) },
    { label: 'Edit Order', icon: () => <span className="text-base leading-none">✏️</span>, onClick: () => openOrderDetail(order, 'edit') },
    { label: 'Hold Order', icon: () => <span className="text-base leading-none">⏸</span>, onClick: () => handleHoldUnhold(order), disabled: order.orderStatus === 'ON_HOLD' || order.orderStatus === 'CANCELLED' || order.orderStatus === 'DELIVERED' },
    { label: 'Unhold Order', icon: () => <span className="text-base leading-none">▶</span>, onClick: () => handleHoldUnhold(order), hidden: order.orderStatus !== 'ON_HOLD' },
    { label: 'Cancel Order', icon: XCircle, onClick: () => handleCancelOrder(order), variant: 'danger', disabled: order.orderStatus === 'CANCELLED' || order.orderStatus === 'DELIVERED' },
    ...(order.orderStatus === 'SHIPPED' ? [{ label: 'Mark Delivered', icon: () => <span className="text-lg leading-none">✓</span>, onClick: () => handleMarkDelivered(order), variant: 'success' }] : []),
  ];

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Order Management</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={() => setShowManualOrder(true)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs md:text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus size={14} /> Manual Order
          </button>
          <button onClick={() => refetchOrders()} className="flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs md:text-sm font-medium hover:bg-slate-50">
            <RefreshCw size={14} /> Refresh
          </button>
          <SampleCSVButton type="orders" />
          <ImportButton label="Orders" endpoint="orders" onSuccess={refetchOrders} />
          <ExportButton
            filename="orders"
            data={sortedOrders}
            columns={[
              { key: 'orderNumber', label: 'Order ID' },
              { key: 'customerName', label: 'Customer' },
              { key: 'customerPhone', label: 'Phone' },
              { key: 'customerCity', label: 'City' },
              { key: 'source', label: 'Source' },
              { key: 'orderStatus', label: 'Status' },
              { key: 'totalAmount', label: 'Total', get: (r) => r.totalAmount ?? r.amount ?? '' },
              { key: 'paymentMode', label: 'Payment' },
              { key: 'trackingNumber', label: 'AWB' },
              { key: 'courier', label: 'Courier' },
              { key: 'itemsCount', label: 'Items', get: (r) => r.items?.length || 0 },
              { key: 'createdAt', label: 'Date', get: (r) => r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : '' },
            ]}
          />
        </div>
      </div>

      <div className="card p-3 md:p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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
          <button onClick={() => refetchOrders()} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors">Apply</button>
        </div>
      </div>

      <DataTable
        columns={ORDERS_COLUMNS}
        data={sortedOrders}
        loading={loading}
        searchable
        searchValue={searchTerm}
        onSearch={setSearchTerm}
        searchPlaceholder="Search by Order ID or Customer..."
        selectable
        selected={selectedOrders}
        onSelectionChange={setSelectedOrders}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={(p) => { setLoading(true); API.get('/orders', { params: { page: p, limit: 50 } }).then(res => { setOrders(res.data.orders || []); setTotalPages(res.data.totalPages || 1); setTotal(res.data.total || 0); setPage(p); }).catch(() => {}).finally(() => setLoading(false)); }}
        actions={actionsConfig}
        bulkActions={[
          { label: 'Bulk Cancel', icon: XCircle, onClick: (selected) => handleBulkCancel(selected), variant: 'danger' },
        ]}
        emptyState={{ icon: 'orders', title: 'No orders found', description: 'Orders will appear here once they are created or synced from marketplaces.' }}
      />

      {detailOrder && (
        <OrderDetailModal
          order={detailOrder}
          onClose={closeOrderDetail}
          onUpdate={(updated) => { setDetailOrder(updated); refetchOrders(); }}
          onMarkDelivered={handleMarkDelivered}
          onHoldUnhold={handleHoldUnhold}
          onSplitOrder={handleSplitOrder}
          onSetEway={() => { setEwayInput(''); setEwayModalOrder(detailOrder); }}
          onSetIrn={() => { setIrnInput(''); setIrnModalOrder(detailOrder); }}
        />
      )}

      {showManualOrder && (
        <ManualOrderModal
          onClose={() => setShowManualOrder(false)}
          onSuccess={() => { setShowManualOrder(false); refetchOrders(); }}
        />
      )}

      {splitModalOrder && (() => {
        const items = splitModalOrder.items || [];
        const choices = items.map((item, i) => `${i + 1}. ${item.sku?.name || item.skuId} x${item.quantity}`);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSplitModalOrder(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">Split Order {splitModalOrder.orderNumber}</h2>
                <button onClick={() => setSplitModalOrder(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
              </div>
              <p className="text-sm text-slate-600">Enter item numbers for the NEW order (comma-separated):</p>
              <div className="bg-slate-50 rounded-lg p-3 text-sm font-mono text-slate-700 max-h-32 overflow-y-auto">{choices.join('\n')}</div>
              <input autoFocus type="text" value={splitInput} onChange={e => setSplitInput(e.target.value)} placeholder='e.g. "1,3"' className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200" />
              <div className="flex gap-2">
                <button onClick={() => setSplitModalOrder(null)} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                <button onClick={() => { if (!splitInput.trim()) return; const order = splitModalOrder; const orderItems = order.items || []; const indices = splitInput.split(',').map(s => parseInt(s.trim()) - 1).filter(n => n >= 0 && n < orderItems.length); if (indices.length === 0 || indices.length >= orderItems.length) { toast.error('Select at least 1 but not all items'); return; } const splitItemIds = indices.map(i => orderItems[i].id); const remainingItemIds = orderItems.filter((_, i) => !indices.includes(i)).map(item => item.id); setSplitModalOrder(null); API.post(`/orders/${order.id}/split`, { splits: [{ itemIds: remainingItemIds }, { itemIds: splitItemIds }] }).then(res => { toast.success(res.data?.message || 'Order split successfully'); refetchOrders(); setDetailOrder(null); }).catch(err => toast.error(err.response?.data?.message || 'Failed to split order')); }} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Split</button>
              </div>
            </div>
          </div>
        );
      })()}

      {ewayModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setEwayModalOrder(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold">E-way Bill Number</h2>
            <input autoFocus type="text" value={ewayInput} onChange={e => setEwayInput(e.target.value)} placeholder="Enter E-way Bill number" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200" />
            <div className="flex gap-2">
              <button onClick={() => setEwayModalOrder(null)} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={() => { if (!ewayInput.trim()) return; const o = ewayModalOrder; setEwayModalOrder(null); API.patch(`/invoice/${o.id}/eway-bill`, { ewayBillNumber: ewayInput }).then(() => { toast.success('E-way bill saved'); if (detailOrder?.id === o.id) setDetailOrder({ ...o, ewayBillNumber: ewayInput }); refetchOrders(); }).catch(() => toast.error('Failed')); }} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}

      {irnModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setIrnModalOrder(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold">IRN</h2>
            <input autoFocus type="text" value={irnInput} onChange={e => setIrnInput(e.target.value)} placeholder="Enter IRN" className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-200" />
            <div className="flex gap-2">
              <button onClick={() => setIrnModalOrder(null)} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={() => { if (!irnInput.trim()) return; const o = irnModalOrder; setIrnModalOrder(null); API.patch(`/invoice/${o.id}/eway-bill`, { irn: irnInput }).then(() => { toast.success('IRN saved'); if (detailOrder?.id === o.id) setDetailOrder({ ...o, irn: irnInput }); refetchOrders(); }).catch(() => toast.error('Failed')); }} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
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
      const source = form.source || 'MANUAL';
      await API.post('/orders', {
        ...form,
        orderDate: form.orderDate ? new Date(form.orderDate).toISOString() : null,
        source,
        items: items.map(i => ({ skuId: i.skuId, quantity: i.quantity, unitPrice: i.unitPrice, mrp: i.mrp, discountAmount: i.discountAmount })),
        orderAmount: payable,
      });
      trackFirst('order', 'order_created', { source, item_count: items.length, amount: payable });
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

const OrderDetailModal = ({ order, onClose, onUpdate, onMarkDelivered, onHoldUnhold, onSplitOrder, onSetEway, onSetIrn }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ customerName: order.customerName, shippingAddress: order.shippingAddress, notificationEmail: order.notificationEmail || '', notificationMobile: order.notificationMobile || '' });
  const [saving, setSaving] = useState(false);

  const tr = order.tracking || {};
  const fmt = (d) => d ? new Date(d).toLocaleString() : '—';

  useEffect(() => { setEditForm({ customerName: order.customerName, shippingAddress: order.shippingAddress, notificationEmail: order.notificationEmail || '', notificationMobile: order.notificationMobile || '' }); }, [order]);

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await API.patch(`/orders/${order.id}`, {
        customerName: editForm.customerName,
        shippingAddress: editForm.shippingAddress,
        notificationEmail: editForm.notificationEmail,
        notificationMobile: editForm.notificationMobile,
      });
      toast.success('Order updated');
      onUpdate({ ...order, ...res.data, ...editForm });
      setEditMode(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update order');
    } finally { setSaving(false); }
  };

  const tabs = [
    { id: 'details', label: 'Order Details' },
    { id: 'items', label: 'Order Items' },
    { id: 'shipments', label: 'Shipments' },
    { id: 'invoices', label: 'Invoices' },
  ];

  const canEdit = order.orderStatus === 'PENDING' || order.orderStatus === 'ON_HOLD';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-5 max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Order #{order.orderNumber}</h3>
          <div className="flex items-center gap-2">
            {canEdit && !editMode && (
              <button onClick={() => setEditMode(true)} className="flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50">
                ✏️ Edit
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit overflow-x-auto">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
          {order.orderStatus === 'ON_HOLD' && (
            <button onClick={() => { onHoldUnhold(order); onClose(); }} className="flex items-center gap-1 px-3 py-1.5 border border-rose-300 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-50">
              ▶ Unhold
            </button>
          )}
          {(order.orderStatus === 'PENDING' || order.orderStatus === 'PROCESSING') && (
            <button onClick={() => { onHoldUnhold(order); onClose(); }} className="flex items-center gap-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50">
              ⏸ Hold
            </button>
          )}
        </div>

        {activeTab === 'details' && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <DetailField icon={Hash} label="Order No." value={order.orderNumber} />
            <DetailField icon={Hash} label="Display Order No." value={order.displayOrderCode || order.orderNumber} />
            <DetailField icon={Clock} label="Fulfillment TAT" value={order.slaDeadline ? new Date(order.slaDeadline).toLocaleString() : '—'} highlight />
            <DetailField icon={Tag} label="Priority" value={order.priority || 'Normal'} />
            <DetailField icon={Clock} label="Order Date" value={fmt(order.createdAt)} />
            <DetailField label="Status" value={<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[order.orderStatus] || 'bg-slate-100 text-slate-600'}`}>{order.orderStatus}</span>} />
            <div className="col-span-2">
              {editMode ? (
                <div className="space-y-3 p-3 bg-slate-50 rounded-xl">
                  <p className="font-semibold text-xs text-slate-500">✏️ Edit Mode</p>
                  <div>
                    <label className="text-xs text-slate-400 block mb-0.5">Customer Name</label>
                    <input value={editForm.customerName} onChange={e => setEditForm({ ...editForm, customerName: e.target.value })} className="input-field text-sm w-full" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-0.5">Shipping Address</label>
                    <textarea value={editForm.shippingAddress} onChange={e => setEditForm({ ...editForm, shippingAddress: e.target.value })} className="input-field text-sm w-full" rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 block mb-0.5">Notification Email</label>
                      <input value={editForm.notificationEmail} onChange={e => setEditForm({ ...editForm, notificationEmail: e.target.value })} className="input-field text-sm w-full" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-0.5">Notification Mobile</label>
                      <input value={editForm.notificationMobile} onChange={e => setEditForm({ ...editForm, notificationMobile: e.target.value })} className="input-field text-sm w-full" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSaveEdit} disabled={saving} className="btn-primary flex items-center gap-1.5 text-xs px-3 py-1.5 disabled:opacity-50">
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                    </button>
                    <button onClick={() => setEditMode(false)} className="px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>
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
                <button onClick={() => { onSplitOrder(order); }} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50 text-amber-600">
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
              <button onClick={onSetEway} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50">
                <FileText size={13} /> Set E-way Bill
              </button>
              <button onClick={onSetIrn} className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50">
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