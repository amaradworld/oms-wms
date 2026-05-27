import React, { useState, useEffect, useCallback } from 'react';
import { PackageCheck, QrCode, CheckCircle2, XCircle, Truck, Box, Search } from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';

const PackingScreen = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [scanInput, setScanInput] = useState('');
  const [packedItems, setPackedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/orders');
      setOrders(Array.isArray(res.data) ? res.data.filter(o => o.orderStatus !== 'DELIVERED' && o.orderStatus !== 'CANCELLED') : []);
    } catch { setOrders([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const selectOrder = async (order) => {
    setSelectedOrder(order);
    setPackedItems([]);
    setOrderLoading(true);
    try {
      const res = await API.get(`/orders`);
      const full = res.data.find(o => o.id === order.id);
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

  const markShipped = async () => {
    if (!selectedOrder) return;
    try {
      await API.patch(`/orders/${selectedOrder.id}/status`, { status: 'SHIPPED' });
      toast.success(`Order ${selectedOrder.orderNumber} marked as shipped`);
      setSelectedOrder(null);
      fetchOrders();
    } catch { toast.error('Failed to update status'); }
  };

  const packedCount = packedItems.filter(i => i.verified).length;
  const totalItems = selectedOrder?.items?.length || 0;

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Packing Station</h1>
      </div>

      {!selectedOrder ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b font-semibold text-sm flex items-center gap-2"><Search size={16} /> Select Order to Pack</div>
          {loading ? <TableSkeleton rows={5} cols={4} /> : orders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No pending orders to pack</div>
          ) : orders.map(o => (
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
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedOrder(null)} className="text-sm text-blue-600 hover:underline">&larr; Back</button>
            <span className="text-sm text-slate-500">Order #{selectedOrder.orderNumber} • {selectedOrder.customerName}</span>
            <button onClick={markShipped} disabled={packedCount < totalItems} className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              <Truck size={16} /> Mark Shipped
            </button>
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
                  <input autoFocus className="flex-1 px-4 py-2.5 md:py-3 border-2 rounded-xl font-mono text-sm outline-none focus:ring-4 focus:ring-blue-200" placeholder="Scan SKU..." value={scanInput} onChange={(e) => setScanInput(e.target.value)} />
                  <button className="px-4 md:px-6 py-2.5 md:py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"><QrCode size={18} /></button>
                </form>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
                <div className="p-4 border-b font-bold text-sm">Packing Log</div>
                {packedItems.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-sm">No scans yet</div>
                ) : packedItems.map(item => (
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

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-fit">
              <h3 className="font-bold text-sm md:text-base mb-4">Packing Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm"><span className="text-slate-500">Total Items</span><span className="font-medium">{totalItems}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Packed</span><span className="font-medium text-green-600">{packedCount}</span></div>
                <div className="flex justify-between text-sm"><span className="text-slate-500">Pending</span><span className="font-medium text-amber-600">{totalItems - packedCount}</span></div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PackingScreen;
