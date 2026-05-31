import React, { useState, useEffect, useCallback } from 'react';
import { PackageCheck, QrCode, CheckCircle2, XCircle, Truck, Download, FileText, Box, Search, Printer, Loader2 } from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const COURIERS = ['Delhivery', 'Shiprocket', 'BlueDart', 'XpressBees', 'FedEx'];

const PackingScreen = ({ detailId, setDetailId }) => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [scanInput, setScanInput] = useState('');
  const [packedItems, setPackedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState('');
  const [generatingAWB, setGeneratingAWB] = useState(false);
  const [generatedAWB, setGeneratedAWB] = useState(null);
  const [invoicing, setInvoicing] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/orders');
      const ordersData = res.data.orders || (Array.isArray(res.data) ? res.data : []);
      setOrders(ordersData.filter(o => o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'CANCELLED'));
    } catch { setOrders([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (detailId && !selectedOrder) {
      API.get('/orders').then(res => { const o = (res.data.orders || res.data).find(x => x.id === detailId); if (o) setSelectedOrder(o); }).catch(() => setDetailId(''));
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
    const verified = !!item;
    setPackedItems([...packedItems, { id: Date.now(), sku: scanInput, time: new Date().toLocaleTimeString(), verified }]);
    if (verified) toast.success(`${scanInput} verified`);
    else toast.error(`${scanInput} not found in order`);
    setScanInput('');
  };

  const handleDownloadInvoice = async () => {
    if (!selectedOrder) return;
    setInvoicing(true);
    try {
      const token = localStorage.getItem('token');
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_BASE}/api/invoice/${selectedOrder.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Invoice failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${selectedOrder.orderNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Invoice downloaded');
    } catch { toast.error('Failed to generate invoice'); } finally { setInvoicing(false); }
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

  const handlePrintLabel = () => {
    if (!generatedAWB) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Shipping Label</title>
      <style>body{font-family:monospace;padding:40px;text-align:center}
      h1{font-size:24px;letter-spacing:2px;border:2px dashed #333;display:inline-block;padding:30px 50px}
      .info{text-align:left;margin-top:20px;font-size:14px}
      </style></head><body>
      <h1>${generatedAWB}</h1>
      <div class="info">
        <p><strong>Courier:</strong> ${selectedCourier}</p>
        <p><strong>Order:</strong> ${selectedOrder?.orderNumber}</p>
        <p><strong>Customer:</strong> ${selectedOrder?.customerName}</p>
        <p><strong>Address:</strong> ${selectedOrder?.shippingAddress}</p>
      </div>
      <script>window.print()</script>
      </body></html>
    `);
    win.document.close();
  };

  const packedCount = packedItems.filter(i => i.verified).length;
  const totalItems = selectedOrder?.items?.length || 0;
  const allPacked = packedCount >= totalItems && totalItems > 0;

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Packing Station</h1>
      </div>

      {!selectedOrder ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b font-semibold text-sm flex items-center gap-2"><Search size={16} /> Select Order to Pack</div>
          {loading ? <TableSkeleton rows={5} cols={4} />
          : orders.length === 0 ? <EmptyState icon="orders" title="No pending orders" description="All orders have been processed or there are no orders yet." />
          : orders.map(o => (
            <div key={o.id} onClick={() => selectOrder(o)} className="px-4 py-3 flex items-center justify-between border-b last:border-0 hover:bg-slate-50 cursor-pointer">
              <div>
                <span className="font-mono text-sm font-medium">{o.orderNumber}</span>
                <span className="text-xs text-slate-400 ml-2">{o.customerName}</span>
              </div>
              <span className="text-xs text-slate-400">{o.items?.length || 0} items</span>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => { setSelectedOrder(null); if (setDetailId) setDetailId(''); }} className="text-sm text-blue-600 hover:underline">&larr; Back</button>
            <span className="text-sm text-slate-500">Order #{selectedOrder.orderNumber} • {selectedOrder.customerName}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 space-y-4">
              {orderLoading ? <TableSkeleton rows={3} cols={2} /> : (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-3"><Box size={18} className="text-slate-500" /><span className="font-semibold text-sm">Order Items</span></div>
                  <div className="divide-y">
                    {selectedOrder.items?.map((item, i) => {
                      const isPacked = packedItems.some(p => p.verified && (p.sku === item.sku?.skuCode || p.sku === item.skuCode));
                      return (
                        <div key={i} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {isPacked ? <PackageCheck size={16} className="text-green-500 flex-shrink-0" /> : <CheckCircle2 size={16} className="text-amber-500 flex-shrink-0" />}
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{item.sku?.skuCode || item.skuCode} • {item.sku?.name || item.name}</p>
                              <p className="text-xs text-slate-400">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ml-2 ${isPacked ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{isPacked ? 'Packed' : 'Pending'}</span>
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
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Total Items</span><span className="font-medium">{totalItems}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Packed</span><span className="font-medium text-green-600">{packedCount}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-500">Pending</span><span className="font-medium text-amber-600">{totalItems - packedCount}</span></div>
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
                    <button onClick={handlePrintLabel} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                      <Printer size={16} /> Print Label
                    </button>
                  )}
                </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PackingScreen;
