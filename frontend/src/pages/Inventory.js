import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, MoreVertical, Plus, X, Download, Printer, Loader2 } from 'lucide-react';
import ImportButton from '../components/ImportButton';
import SampleCSVButton from '../components/SampleCSVButton';
import BarcodeCell from '../components/BarcodeCell';
import { toast } from '../components/Toast';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/EmptyState';

const Inventory = () => {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ skuCode: '', name: '', styleName: '', size: '', color: '', brand: '', category: '', material: '', gender: '', unitType: '', mrp: '', hsnCode: '', weight: '' });
  const { selectedFacility } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [printingLabel, setPrintingLabel] = useState(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedFacility ? { warehouseId: selectedFacility.id } : {};
      const res = await API.get('/inventory', { params });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFacility]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const handleAddSku = async () => {
    try {
      await API.post('/skus', form);
      setShowModal(false);
      setForm({ skuCode: '', name: '', styleName: '', size: '', color: '', brand: '', category: '', material: '', gender: '', unitType: '', mrp: '', hsnCode: '', weight: '' });
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create SKU');
    }
  };

  const handlePrintLabel = async (skuCode, name) => {
    setPrintingLabel(skuCode);
    try {
      const res = await API.post('/labels/generate', { skuCode, name }, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `label_${skuCode}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Label ${skuCode} downloaded`);
    } catch { toast.error('Failed to generate label'); } finally { setPrintingLabel(null); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await API.get('/export/inventory', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'inventory.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Inventory exported');
    } catch { toast.error('Export failed'); } finally { setExporting(false); }
  };

  const searchStr = search.toLowerCase();
  const filtered = items.filter(i =>
    (i.skuCode || i.sku || '').toLowerCase().includes(searchStr) ||
    (i.name || '').toLowerCase().includes(searchStr) ||
    (i.styleName || '').toLowerCase().includes(searchStr) ||
    (i.brand || '').toLowerCase().includes(searchStr) ||
    (i.color || '').toLowerCase().includes(searchStr) ||
    (i.size || '').toLowerCase().includes(searchStr)
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <div className="flex gap-3">
          <button onClick={handleExport} disabled={exporting} className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
            <Download size={16} /> {exporting ? 'Exporting...' : 'Export'}
          </button>
          <SampleCSVButton type="inventory" />
          <ImportButton label="Inventory" endpoint="inventory" onSuccess={fetchInventory} warehouseId={selectedFacility?.id || ''} />
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add SKU
          </button>
        </div>
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by SKU, name, style, brand, color..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium"><Filter size={16} /> Filters</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Barcode</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Style</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Color</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Brand</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">On Hand</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Available</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="12" className="p-8 text-center text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="12"><EmptyState icon="inventory" title="No SKUs found" description="Add your first SKU using the button above or import via CSV." /></td></tr>
              ) : filtered.map((item, i) => (
                <tr key={item.id || i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3"><BarcodeCell value={item.skuCode || item.sku} /></td>
                  <td className="px-4 py-3 text-sm font-mono font-medium">{item.skuCode || item.sku}</td>
                  <td className="px-4 py-3 text-sm">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.styleName || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.size || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.color || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{item.brand || '-'}</td>
                  <td className="px-4 py-3 text-sm">{item.category || '-'}</td>
                  <td className="px-4 py-3 text-sm font-mono text-right">{item.quantityOnHand ?? '-'}</td>
                  <td className="px-4 py-3 text-sm font-mono text-right">{item.quantityAvailable ?? '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handlePrintLabel(item.skuCode || item.sku, item.name)} disabled={printingLabel === (item.skuCode || item.sku)} className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors" title="Download PDF label">
                        {printingLabel === (item.skuCode || item.sku) ? <Loader2 size={15} className="text-indigo-500 animate-spin" /> : <Printer size={15} className="text-slate-400" />}
                      </button>
                      <button className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><MoreVertical size={15} className="text-slate-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-lg md:mx-4 p-5 md:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Add New SKU</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">SKU Code *</label>
                <input type="text" value={form.skuCode} onChange={e => setForm({ ...form, skuCode: e.target.value })} placeholder="e.g. TSH-BLU-XL" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Product Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Blue Cotton T-Shirt (XL)" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Style Name</label>
                <input type="text" value={form.styleName} onChange={e => setForm({ ...form, styleName: e.target.value })} placeholder="e.g. Classic Fit T-Shirt" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Size</label>
                  <input type="text" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} placeholder="e.g. XL, 32, 10" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Color</label>
                  <input type="text" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} placeholder="e.g. Blue" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Brand</label>
                  <input type="text" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Nike, NoName" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                  <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="e.g. Apparel" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Gender</label>
                  <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Unisex">Unisex</option>
                    <option value="Kids">Kids</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Material</label>
                  <input type="text" value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} placeholder="e.g. Cotton" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">MRP (₹)</label>
                  <input type="number" step="0.01" value={form.mrp} onChange={e => setForm({ ...form, mrp: e.target.value })} placeholder="e.g. 999" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Unit Type</label>
                  <select value={form.unitType} onChange={e => setForm({ ...form, unitType: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                    <option value="">Select</option>
                    <option value="Pieces">Pieces</option>
                    <option value="Pair">Pair</option>
                    <option value="Kg">Kg</option>
                    <option value="Meter">Meter</option>
                    <option value="Pack">Pack</option>
                    <option value="Set">Set</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })} placeholder="e.g. 0.2" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">HSN Code</label>
                  <input type="text" value={form.hsnCode} onChange={e => setForm({ ...form, hsnCode: e.target.value })} placeholder="e.g. 6109" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional product details" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows={2} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleAddSku} disabled={!form.skuCode || !form.name} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                Create SKU
              </button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
