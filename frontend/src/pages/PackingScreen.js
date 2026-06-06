import React, { useState, useEffect, useCallback } from 'react';
import { PackageCheck, QrCode, CheckCircle2, XCircle, Truck, Download, FileText, Box, Search, Printer, Loader2, Clock, CheckCheck, RefreshCw } from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const COURIERS = ['Delhivery', 'Shiprocket', 'BlueDart', 'XpressBees', 'FedEx'];

const STATUS_BADGE = {
  PACKING: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-emerald-100 text-emerald-800',
  DISPATCHED: 'bg-purple-100 text-purple-800',
};

const PackingScreen = ({ detailId, setDetailId }) => {
  const [tab, setTab] = useState('ready');
  const [orders, setOrders] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [scanInput, setScanInput] = useState('');
  const [packedItems, setPackedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState('');
  const [generatingAWB, setGeneratingAWB] = useState(false);
  const [generatedAWB, setGeneratedAWB] = useState(null);
  const [invoicing, setInvoicing] = useState(false);
  const [printingLabel, setPrintingLabel] = useState(false);

  const fetchReadyToPack = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/orders', { params: { orderStatus: 'PACKING', limit: 100 } });
      const data = res.data.orders || [];
      setOrders(data);
    } catch { setOrders([]); } finally { setLoading(false); }
  }, []);

  const fetchRecentlyPacked = useCallback(async () => {
    setRecentLoading(true);
    try {
      const res = await API.get('/orders', { params: { orderStatus: 'SHIPPED,DISPATCHED', limit: 50 } });
      const data = res.data.orders || [];
      setRecentOrders(data);
    } catch { setRecentOrders([]); } finally { setRecentLoading(false); }
  }, []);

  useEffect(() => {
    fetchReadyToPack();
    fetchRecentlyPacked();
  }, [fetchReadyToPack, fetchRecentlyPacked]);

  useEffect(() => {
    if (detailId && !selectedOrder) {
      API.get('/orders').then(res => {
        const o = (res.data.orders || res.data).find(x => x.id === detailId);
        if (o) setSelectedOrder(o);
      }).catch(() => setDetailId(''));
    }
  }, [detailId]);

  const selectOrder = async (order) => {
    if (setDetailId) setDetailId(order.id);
    setSelectedOrder(order);
    setPackedItems([]);
    setGeneratedAWB(null);
    setSelectedCourier('');
    setOrderLoading(true);
    try {
      const res = await API.get('/orders');
      const ordersData = res.data.orders || (Array.isArray(res.data) ? res.data : []);
      const full = ordersData.find(o => o.id === order.id);
      if (full) setSelectedOrder(full);
    } catch {} finally { setOrderLoading(false); }
  };

  const handleScan = (e) => {
    e.preventDefault();
    if (!scanInput || !selectedOrder) return;
    const item = selectedOrder.items?.find(i => i.sku?.skuCode === scanInput || i.skuCode === scanInput);
    if (!item) {
      toast.error(`${scanInput} not found in order`);
      setPackedItems([...packedItems, { id: Date.now(), sku: scanInput, time: new Date().toLocaleTimeString(), verified: false }]);
      setScanInput('');
      return;
    }
    const alreadyPacked = packedItems.filter(p => p.verified && (p.sku === item.sku?.skuCode || p.sku === item.skuCode)).length;
    if (alreadyPacked >= item.quantity) {
      toast.error(`${scanInput} — already packed ${item.quantity}/${item.quantity}`);
      setScanInput('');
      return;
    }
    setPackedItems([...packedItems, { id: Date.now(), sku: scanInput, time: new Date().toLocaleTimeString(), verified: true }]);
    toast.success(`${scanInput} verified (${alreadyPacked + 1}/${item.quantity})`);
    setScanInput('');
  };

  const getPackedQty = (skuCode) => packedItems.filter(p => p.verified && p.sku === skuCode).length;

  const totalQty = selectedOrder?.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 0;
  const packedTotal = selectedOrder?.items?.reduce((s, i) => s + getPackedQty(i.sku?.skuCode || i.skuCode), 0) || 0;
  const allPacked = packedTotal >= totalQty && totalQty > 0;

  const downloadPdf = async (url, filename, errorMsg, setBusy) => {
    try {
      setBusy(true);
      const token = localStorage.getItem('token');
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
      const res = await fetch(fullUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
      toast.success('Downloaded');
    } catch {
      toast.error(errorMsg);
    } finally { setBusy(false); }
  };

  const handleDownloadInvoice = () => {
    if (!selectedOrder) return;
    downloadPdf(
      `/api/invoice/${selectedOrder.id}/pdf`,
      `invoice_${selectedOrder.orderNumber}.pdf`,
      'Failed to generate invoice',
      setInvoicing
    );
  };

  const reprintInvoice = (order) => {
    downloadPdf(
      `/api/invoice/${order.id}/pdf`,
      `invoice_${order.orderNumber}.pdf`,
      'Failed to reprint invoice',
      () => {}
    );
  };

  const reprintLabel = async (order) => {
    setPrintingLabel(order.id);
    try {
      const res = await API.post('/labels/generate-shipping', { orderId: order.id }, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `label_${order.orderNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Label reprinted');
    } catch {
      toast.error('Failed to reprint label');
    } finally { setPrintingLabel(false); }
  };

  const handleGenerateAWB = async () => {
    if (!selectedOrder || !selectedCourier) return;
    setGeneratingAWB(true);
    try {
      const res = await API.post('/courier/generate-awb', { orderId: selectedOrder.id, courier: selectedCourier });
      setGeneratedAWB(res.data.awb);
      toast.success(`AWB ${res.data.awb} generated`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate AWB');
    } finally { setGeneratingAWB(false); }
  };

  const printShippingLabel = async () => {
    if (!selectedOrder) return;
    setPrintingLabel(selectedOrder.id);
    try {
      const res = await API.post('/labels/generate-shipping', { orderId: selectedOrder.id }, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `label_${selectedOrder.orderNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Shipping label downloaded');
    } catch {
      toast.error('Failed to generate shipping label');
    } finally { setPrintingLabel(false); }
  };

  if (loading) return <Skeleton />;

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Packing Station</h1>
      </div>

      {!selectedOrder ? (
        <>
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setTab('ready')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'ready' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <PackageCheck size={16} /> Ready to Pack
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{orders.length}</span>
            </button>
            <button
              onClick={() => setTab('recent')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === 'recent' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <CheckCheck size={16} /> Recently Packed
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{recentOrders.length}</span>
            </button>
          </div>

          {tab === 'ready' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b font-semibold text-sm flex items-center gap-2">
                <Box size={16} /> Orders From Wave Picking
              </div>
              {loading ? <TableSkeleton rows={5} cols={4} />
              : orders.length === 0 ? <EmptyState icon="box" title="No orders ready to pack" description="Orders will appear here once they complete wave picking." />
              : (
                <div className="divide-y">
                  {orders.map(o => {
                    const totalQty = (o.items || []).reduce((s, i) => s + (i.quantity || 0), 0);
                    return (
                      <div key={o.id} onClick={() => selectOrder(o)} className="px-4 py-3 flex items-center justify-between hover:bg-blue-50 cursor-pointer">
                        <div>
                          <span className="font-mono text-sm font-medium">{o.orderNumber}</span>
                          <span className="text-xs text-slate-400 ml-2">{o.customerName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[o.orderStatus] || 'bg-slate-100 text-slate-600'}`}>{o.orderStatus}</span>
                          <span className="text-xs text-slate-400">{totalQty} units</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'recent' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b font-semibold text-sm flex items-center gap-2">
                <CheckCheck size={16} /> Packed & Dispatched (Reprint)
              </div>
              {recentLoading ? <TableSkeleton rows={5} cols={4} />
              : recentOrders.length === 0 ? <EmptyState icon="search" title="No recently packed orders" description="Once orders are packed and shipped, they'll appear here for reprint." />
              : (
                <div className="divide-y">
                  {recentOrders.map(o => (
                    <div key={o.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <span className="font-mono text-sm font-medium">{o.orderNumber}</span>
                        <span className="text-xs text-slate-400 ml-2">{o.customerName}</span>
                        {o.tracking?.awbNumber && (
                          <span className="text-xs text-slate-400 ml-2">AWB: {o.tracking.awbNumber}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[o.orderStatus] || 'bg-slate-100 text-slate-600'}`}>{o.orderStatus}</span>
                        <button
                          onClick={() => reprintInvoice(o)}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                          title="Reprint Invoice"
                        >
                          <FileText size={12} /> Invoice
                        </button>
                        <button
                          onClick={() => reprintLabel(o)}
                          disabled={printingLabel === o.id}
                          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                          title="Reprint Label"
                        >
                          {printingLabel === o.id ? <Loader2 size={12} className="animate-spin" /> : <Printer size={12} />} Label
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => { setSelectedOrder(null); if (setDetailId) setDetailId(''); setGeneratedAWB(null); setSelectedCourier(''); setPackedItems([]); fetchReadyToPack(); fetchRecentlyPacked(); }} className="text-sm text-blue-600 hover:underline">&larr; Back</button>
            <span className="text-sm text-slate-500">Order #{selectedOrder.orderNumber} • {selectedOrder.customerName}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[selectedOrder.orderStatus] || 'bg-slate-100 text-slate-600'}`}>{selectedOrder.orderStatus}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 space-y-4">
              {orderLoading ? <TableSkeleton rows={3} cols={2} /> : (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3"><Box size={18} className="text-slate-500" /><span className="font-semibold text-sm">Order Items</span></div>
                  <div className="divide-y">
                    {selectedOrder.items?.map((item, i) => {
                      const skuCode = item.sku?.skuCode || item.skuCode;
                      const packedQty = getPackedQty(skuCode);
                      const fullyPacked = packedQty >= item.quantity;
                      return (
                        <div key={i} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {fullyPacked ? <PackageCheck size={16} className="text-green-500 flex-shrink-0" /> : packedQty > 0 ? <CheckCircle2 size={16} className="text-amber-400 flex-shrink-0" /> : <CheckCircle2 size={16} className="text-slate-300 flex-shrink-0" />}
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{skuCode} • {item.sku?.name || item.name}</p>
                              <p className="text-xs text-slate-400">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ml-2 ${fullyPacked ? 'bg-green-100 text-green-700' : packedQty > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {fullyPacked ? `${packedQty}/${item.quantity} Packed` : packedQty > 0 ? `${packedQty}/${item.quantity}` : 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <form onSubmit={handleScan} className="flex gap-2 md:gap-3">
                  <input autoFocus className="flex-1 px-4 py-2.5 md:py-3 border-2 rounded-xl font-mono text-sm outline-none focus:ring-4 focus:ring-blue-200" placeholder="Scan SKU to pack..." value={scanInput} onChange={(e) => setScanInput(e.target.value)} />
                  <button className="px-4 md:px-6 py-2.5 md:py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"><QrCode size={18} /></button>
                </form>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="p-4 border-b font-bold text-sm">Packing Log</div>
                {packedItems.length === 0 ? <EmptyState icon="search" title="No scans yet" description="Scan SKU barcodes to verify and pack items." />
                : packedItems.map(item => (
                  <div key={item.id} className="px-4 py-3 flex items-center justify-between border-b last:border-0">
                    <span className="font-mono text-sm font-medium truncate mr-2">{item.sku}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-400">{item.time}</span>
                      {item.verified ? <CheckCircle2 size={16} className="text-green-500" /> : <XCircle size={16} className="text-red-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-sm mb-4">Packing Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Total Items</span><span className="font-medium">{totalQty}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Packed</span><span className="font-medium text-green-600">{packedTotal}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Pending</span><span className="font-medium text-amber-600">{totalQty - packedTotal}</span></div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <h3 className="font-bold text-sm flex items-center gap-2"><FileText size={16} /> Pre-Shipment {!allPacked && <span className="text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full ml-1">Pack all items first</span>}</h3>

                  <button onClick={handleDownloadInvoice} disabled={invoicing || !allPacked} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {invoicing ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} {invoicing ? 'Generating...' : 'Download Invoice'}
                  </button>

                  <select value={selectedCourier} onChange={e => setSelectedCourier(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                    <option value="">Select Courier...</option>
                    {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <button onClick={handleGenerateAWB} disabled={!selectedCourier || generatingAWB || !!generatedAWB || !allPacked} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                    {generatingAWB ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />} {generatedAWB ? `AWB: ${generatedAWB}` : generatingAWB ? 'Generating...' : 'Generate AWB'}
                  </button>

                  {generatedAWB && (
                    <button onClick={printShippingLabel} disabled={printingLabel === selectedOrder.id} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                      {printingLabel === selectedOrder.id ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Print Shipping Label
                    </button>
                  )}

                  <div className="pt-2 border-t flex gap-2">
                    <button onClick={() => reprintInvoice(selectedOrder)} className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg">
                      <RefreshCw size={12} /> Reprint Invoice
                    </button>
                    <button onClick={printShippingLabel} disabled={printingLabel === selectedOrder.id} className="flex-1 flex items-center justify-center gap-1 text-xs px-2 py-1.5 text-slate-600 hover:bg-slate-50 rounded-lg disabled:opacity-50">
                      <RefreshCw size={12} /> Reprint Label
                    </button>
                  </div>
                </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Skeleton = () => <div className="p-8"><TableSkeleton rows={5} cols={3} /></div>;

export default PackingScreen;
