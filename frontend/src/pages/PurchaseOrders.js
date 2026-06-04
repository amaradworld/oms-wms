import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Truck, ClipboardCheck, Loader } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const PurchaseOrders = () => {
  const { selectedFacility } = useAuth();
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [tab, setTab] = useState('orders');
  const [form, setForm] = useState({ supplierId: '', expectedDate: '', notes: '', items: [{ skuCode: '', quantity: 1, unitPrice: 0 }] });
  const [supForm, setSupForm] = useState({ name: '', contactPerson: '', email: '', phone: '', address: '' });
  const [showGrnModal, setShowGrnModal] = useState(false);
  const [grnItems, setGrnItems] = useState([]);
  const [selectedPoForGrn, setSelectedPoForGrn] = useState(null);
  const [grnSubmitting, setGrnSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [poRes, supRes] = await Promise.all([API.get('/purchase/orders'), API.get('/purchase/suppliers')]);
      setPos(Array.isArray(poRes.data) ? poRes.data : []);
      setSuppliers(Array.isArray(supRes.data) ? supRes.data : []);
    } catch { setPos([]); setSuppliers([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateSupplier = async () => {
    try {
      await API.post('/purchase/suppliers', supForm);
      toast.success('Supplier created');
      setShowSupplierModal(false);
      setSupForm({ name: '', contactPerson: '', email: '', phone: '', address: '' });
      fetchData();
    } catch { toast.error('Failed'); }
  };

  const handleCreatePO = async () => {
    if (!form.supplierId) return toast.error('Select supplier');
    if (!selectedFacility?.id) return toast.error('Select a warehouse/facility before creating PO');
    try {
      await API.post('/purchase/orders', { ...form, warehouseId: selectedFacility.id });
      toast.success('Purchase order created');
      setShowModal(false);
      setForm({ supplierId: '', expectedDate: '', notes: '', items: [{ skuCode: '', quantity: 1, unitPrice: 0 }] });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleReceive = async (id) => {
    try {
      await API.put(`/purchase/orders/${id}/receive`);
      toast.success('PO received, inventory updated');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const openGrnReceive = (po) => {
    setSelectedPoForGrn(po);
    setGrnItems(po.items.map(item => ({
      poItemId: item.id,
      skuId: item.skuId,
      skuCode: item.sku?.skuCode || '',
      skuName: item.sku?.name || '',
      expectedQty: item.quantity,
      receivedQty: item.quantity - (item.receivedQty || 0),
    })));
    setShowGrnModal(true);
  };

  const handleGrnReceive = async () => {
    if (!grnItems.some(i => i.receivedQty > 0)) return toast.error('Enter at least one item qty');
    setGrnSubmitting(true);
    try {
      await API.post('/grn', {
        poId: selectedPoForGrn.id,
        items: grnItems.filter(i => i.receivedQty > 0).map(i => ({
          poItemId: i.poItemId,
          skuId: i.skuId,
          expectedQty: i.expectedQty,
          receivedQty: i.receivedQty,
        })),
      });
      toast.success('GRN created. Proceed to QC and approval.');
      setShowGrnModal(false);
      setSelectedPoForGrn(null);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setGrnSubmitting(false); }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { skuCode: '', quantity: 1, unitPrice: 0 }] });

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl md:text-2xl font-bold">
          {tab === 'orders' ? 'Purchase Orders' : 'Suppliers'}
        </h1>
        <button onClick={() => tab === 'orders' ? setShowModal(true) : setShowSupplierModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> {tab === 'orders' ? 'New PO' : 'Add Supplier'}
        </button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('orders')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'orders' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>Purchase Orders</button>
        <button onClick={() => setTab('suppliers')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'suppliers' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>Suppliers</button>
      </div>

      {tab === 'orders' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? <TableSkeleton rows={5} cols={5} /> : pos.length === 0 ? <EmptyState icon="orders" title="No purchase orders" description="Create a PO to replenish stock from suppliers." />
          : <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">PO#</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Supplier</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Items</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {pos.map(po => (
                  <tr key={po.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-sm font-medium">{po.poNumber}</td>
                    <td className="px-4 py-3 text-sm">{po.supplier?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{po.items?.length || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${po.status === 'RECEIVED' ? 'bg-green-100 text-green-700' : po.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>{po.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{new Date(po.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {po.status === 'DRAFT' && <button onClick={() => handleReceive(po.id)} className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm font-medium" title="Quick receive all"><Truck size={14} /> Quick</button>}
                        {(po.status === 'APPROVED' || po.status === 'DRAFT' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'RECEIVING') && <button onClick={() => openGrnReceive(po)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"><ClipboardCheck size={14} /> GRN</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </div>
      )}

      {tab === 'suppliers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {suppliers.length === 0 ? <EmptyState icon="orders" title="No suppliers" description="Add suppliers to create purchase orders." />
          : <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Contact</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Email</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Phone</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium">{s.name}</td>
                    <td className="px-4 py-3 text-sm">{s.contactPerson || '-'}</td>
                    <td className="px-4 py-3 text-sm">{s.email || '-'}</td>
                    <td className="px-4 py-3 text-sm">{s.phone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </div>
      )}

      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-lg font-bold">Add Supplier</h2><button onClick={() => setShowSupplierModal(false)}><X size={20} /></button></div>
            <div className="space-y-3">
              <input placeholder="Company Name *" value={supForm.name} onChange={e => setSupForm({ ...supForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input placeholder="Contact Person" value={supForm.contactPerson} onChange={e => setSupForm({ ...supForm, contactPerson: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input placeholder="Email" value={supForm.email} onChange={e => setSupForm({ ...supForm, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input placeholder="Phone" value={supForm.phone} onChange={e => setSupForm({ ...supForm, phone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <textarea placeholder="Address" value={supForm.address} onChange={e => setSupForm({ ...supForm, address: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
            </div>
            <button onClick={handleCreateSupplier} disabled={!supForm.name} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">Save Supplier</button>
          </div>
        </div>
      )}

      {showGrnModal && selectedPoForGrn && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Receive via GRN - {selectedPoForGrn.poNumber}</h2>
              <button onClick={() => setShowGrnModal(false)}><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-500">{selectedPoForGrn.supplier?.name}</p>
            <div className="space-y-3">
              {grnItems.map((item, i) => (
                <div key={item.poItemId} className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.skuName || item.skuCode}</div>
                    <div className="text-xs text-slate-400">Expected: {item.expectedQty}</div>
                  </div>
                  <input
                    type="number" min="0" max={item.expectedQty}
                    value={item.receivedQty}
                    onChange={e => {
                      const updated = [...grnItems];
                      updated[i].receivedQty = Math.min(parseInt(e.target.value) || 0, item.expectedQty);
                      setGrnItems(updated);
                    }}
                    className="w-20 px-2 py-1.5 border rounded text-sm text-center"
                  />
                </div>
              ))}
            </div>
            <button onClick={handleGrnReceive} disabled={grnSubmitting} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {grnSubmitting && <Loader size={16} className="animate-spin" />}
              Create GRN
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-lg font-bold">New Purchase Order</h2><button onClick={() => setShowModal(false)}><X size={20} /></button></div>
            <div className="space-y-3">
              <select value={form.supplierId} onChange={e => setForm({ ...form, supplierId: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Select Supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="date" value={form.expectedDate} onChange={e => setForm({ ...form, expectedDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <textarea placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center"><span className="text-sm font-semibold">Items</span><button onClick={addItem} className="text-xs text-blue-600">+ Add item</button></div>
              {form.items.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input placeholder="SKU Code" value={item.skuCode} onChange={e => { const items = [...form.items]; items[i].skuCode = e.target.value; setForm({ ...form, items }); }} className="flex-1 px-2 py-1.5 border rounded text-sm" />
                  <input type="number" placeholder="Qty" value={item.quantity} onChange={e => { const items = [...form.items]; items[i].quantity = parseInt(e.target.value) || 0; setForm({ ...form, items }); }} className="w-16 px-2 py-1.5 border rounded text-sm" />
                  <input type="number" step="0.01" placeholder="Price" value={item.unitPrice} onChange={e => { const items = [...form.items]; items[i].unitPrice = parseFloat(e.target.value) || 0; setForm({ ...form, items }); }} className="w-20 px-2 py-1.5 border rounded text-sm" />
                </div>
              ))}
            </div>
            <button onClick={handleCreatePO} disabled={!form.supplierId} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">Create PO</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrders;
