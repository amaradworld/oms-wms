import React, { useState, useCallback } from 'react';
import { Search, Package, Truck, ClipboardCheck, FileText, ShoppingCart, Loader2 } from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';

const Section = ({ icon: Icon, title, items, renderItem }) => (
  <div className="card overflow-hidden">
    <div className="p-3 bg-slate-50 border-b flex items-center gap-2 font-semibold text-sm">
      <Icon size={16} className="text-indigo-600" /> {title} <span className="text-slate-400 font-normal">({items.length})</span>
    </div>
    {items.length === 0 ? (
      <div className="p-4 text-center text-slate-400 text-sm">None found</div>
    ) : (
      <div className="divide-y">
        {items.map((item, i) => (
          <div key={item.id || i} className="p-3 text-sm hover:bg-slate-50">
            {renderItem(item)}
          </div>
        ))}
      </div>
    )}
  </div>
);

const BatchTrace = () => {
  const [query, setQuery] = useState('');
  const [batches, setBatches] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [trace, setTrace] = useState(null);
  const [tracing, setTracing] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSelected(null);
    setTrace(null);
    try {
      const res = await API.get(`/batch?q=${encodeURIComponent(query.trim())}`);
      setBatches(Array.isArray(res.data) ? res.data : []);
      if (res.data.length === 0) toast.info('No batches found');
    } catch { toast.error('Search failed'); } finally { setSearching(false); }
  }, [query]);

  const handleTrace = useCallback(async (batchNo) => {
    setSelected(batchNo);
    setTracing(true);
    try {
      const res = await API.get(`/batch/trace/${encodeURIComponent(batchNo)}`);
      setTrace(res.data);
    } catch { toast.error('Trace failed'); } finally { setTracing(false); }
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 max-w-6xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><Search size={24} /> Batch / Serial Trace</h1>

      <div className="card p-4 space-y-3">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="input-field flex-1"
            placeholder="Search by batch number..."
          />
          <button onClick={handleSearch} disabled={searching || !query.trim()} className="btn-primary flex items-center gap-2 disabled:opacity-50">
            {searching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Search
          </button>
        </div>

        {batches.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
            {batches.map((b, i) => (
              <div
                key={i}
                onClick={() => handleTrace(b.batch)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${selected === b.batch ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
              >
                <p className="font-mono text-sm font-semibold">{b.batch}</p>
                <p className="text-xs text-slate-500 truncate">{b.sku_code} — {b.sku_name}</p>
                <p className="text-xs text-slate-400">{b.warehouse_name} {b.batch_status ? `· ${b.batch_status}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {tracing && (
        <div className="flex items-center justify-center p-8">
          <Loader2 size={24} className="animate-spin text-indigo-600" />
        </div>
      )}

      {trace && (
        <div className="space-y-4">
          <div className="card p-3 bg-indigo-50 border-indigo-200">
            <p className="font-mono font-bold text-lg">Batch: {trace.batchNo}</p>
          </div>

          <Section icon={Package} title="Current Inventory" items={trace.inventory || []} renderItem={i => (
            <div className="flex justify-between">
              <div><span className="font-medium">{i.sku?.skuCode}</span> — {i.sku?.name}</div>
              <div className="text-right text-xs"><span className="font-semibold">{i.quantityOnHand}</span> on hand · <span className="font-semibold">{i.quantityAvailable}</span> avail · Bin: {i.binLocation}</div>
            </div>
          )} />

          <Section icon={ClipboardCheck} title="GRN Records" items={trace.grnItems || []} renderItem={i => (
            <div className="flex justify-between">
              <div><span className="font-medium">{i.sku?.skuCode}</span> — {i.grn?.grnNumber} <span className="text-xs text-slate-400">({i.grn?.purchaseOrder?.supplier?.name})</span></div>
              <div className="text-right text-xs">Exp: {i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : '—'} · Qty: {i.receivedQty}</div>
            </div>
          )} />

          <Section icon={ShoppingCart} title="Orders" items={trace.orderItems || []} renderItem={i => (
            <div className="flex justify-between">
              <div><span className="font-medium">{i.sku?.skuCode}</span> — {i.order?.orderNumber} <span className="text-xs text-slate-400">({i.order?.customerName})</span></div>
              <div className="text-right text-xs">{i.order?.orderStatus} · Qty: {i.quantity}</div>
            </div>
          )} />

          <Section icon={FileText} title="ASN" items={trace.asnItems || []} renderItem={i => (
            <div className="flex justify-between">
              <div><span className="font-medium">{i.sku?.skuCode}</span> — {i.asn?.asnNumber}</div>
              <div className="text-right text-xs">Expected: {i.expectedQty} · Received: {i.receivedQty}</div>
            </div>
          )} />

          <Section icon={Truck} title="Gatepass" items={trace.gatepassItems || []} renderItem={i => (
            <div className="flex justify-between">
              <div><span className="font-medium">{i.sku?.skuCode}</span> — {i.gatepass?.code}</div>
              <div className="text-right text-xs">{i.gatepass?.status} · Qty: {i.quantity}</div>
            </div>
          )} />
        </div>
      )}
    </div>
  );
};

export default BatchTrace;
