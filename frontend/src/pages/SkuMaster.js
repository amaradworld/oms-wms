import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Package, Plus, Search, X, Check, Loader2, Download, Upload,
  Hash, Tag, Palette, Ruler, DollarSign, FileText, Edit2, Trash2,
  ShoppingBag, ExternalLink, AlertCircle, ChevronDown, ChevronRight,
} from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';
import { useConfirm } from '../components/ConfirmDialog';

const SAMPLE_CSV = `skuCode,epcCode,name,brand,category,size,color,mrp,hsnCode,weight,flipkartSku,amazonSku,myntraSku
SKU001,,Classic White T-Shirt,Globex,Apparel,M,White,499,6109,0.2,FK-FSN-001,AMZ-ASIN-001,MYN-001
SKU002,,Blue Denim Jeans,Globex,Apparel,32,Blue,1299,6203,0.5,FK-FSN-002,AMZ-ASIN-002,MYN-002
SKU003,,Black Hoodie,Globex,Apparel,L,Black,1499,6109,0.6,FK-FSN-003,AMZ-ASIN-003,MYN-003`;

const MARKETPLACES = [
  { key: 'flipkartSku', label: 'Flipkart', color: 'bg-blue-100 text-blue-700', placeholder: 'FK-FSN-...' },
  { key: 'amazonSku', label: 'Amazon', color: 'bg-amber-100 text-amber-700', placeholder: 'ASIN...' },
  { key: 'myntraSku', label: 'Myntra', color: 'bg-pink-100 text-pink-700', placeholder: 'MYN-...' },
  { key: 'nykaaSku', label: 'Nykaa', color: 'bg-rose-100 text-rose-700', placeholder: 'NYK-...' },
  { key: 'tatacliqSku', label: 'Tata Cliq', color: 'bg-indigo-100 text-indigo-700', placeholder: 'TC-...' },
  { key: 'meeshoSku', label: 'Meesho', color: 'bg-purple-100 text-purple-700', placeholder: 'MSH-...' },
  { key: 'shopifySku', label: 'Shopify', color: 'bg-emerald-100 text-emerald-700', placeholder: 'Variant ID' },
];

const EMPTY_FORM = {
  skuCode: '', epcCode: '', name: '', styleName: '', size: '', color: '',
  brand: '', category: '', material: '', gender: '', unitType: 'pcs',
  mrp: '', description: '', hsnCode: '', weight: '', dimensions: '',
  marketplaceSkus: {},
};

const SkuMaster = () => {
  const [skus, setSkus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showMarketplaces, setShowMarketplaces] = useState(false);
  const fileRef = useRef(null);
  const { confirm } = useConfirm();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    API.get('/skus', { signal: controller.signal }).then(res => {
      setSkus(Array.isArray(res.data) ? res.data : (res.data?.skus || []));
    }).catch(() => { if (!controller.signal.aborted) setSkus([]); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refreshKey]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
    setShowMarketplaces(false);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (s) => {
    setForm({
      skuCode: s.skuCode || '',
      epcCode: s.epcCode || '',
      name: s.name || '',
      styleName: s.styleName || '',
      size: s.size || '',
      color: s.color || '',
      brand: s.brand || '',
      category: s.category || '',
      material: s.material || '',
      gender: s.gender || '',
      unitType: s.unitType || 'pcs',
      mrp: s.mrp != null ? String(s.mrp) : '',
      description: s.description || '',
      hsnCode: s.hsnCode || '',
      weight: s.weight != null ? String(s.weight) : '',
      dimensions: s.dimensions || '',
      marketplaceSkus: s.marketplaceSkus && typeof s.marketplaceSkus === 'object' ? s.marketplaceSkus : {},
    });
    setEditId(s.id);
    setShowMarketplaces(Object.keys(s.marketplaceSkus || {}).length > 0);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.skuCode.trim()) return toast.error('SKU code is required');
    if (!form.name.trim()) return toast.error('Product name is required');
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.epcCode) delete payload.epcCode;
      if (!payload.marketplaceSkus || Object.keys(payload.marketplaceSkus).length === 0) {
        delete payload.marketplaceSkus;
      }
      if (editId) {
        const res = await API.put(`/skus/${editId}`, payload);
        setSkus(prev => prev.map(s => s.id === editId ? res.data : s));
        toast.success(`SKU ${form.skuCode} updated`);
      } else {
        const res = await API.post('/skus', payload);
        setSkus(prev => [res.data, ...prev]);
        toast.success(`SKU ${form.skuCode} created`);
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save SKU');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (s) => {
    const ok = await confirm({
      title: `Delete SKU ${s.skuCode}?`,
      message: `This will permanently delete "${s.name}". You can only delete SKUs that are not referenced in any GRN, Stock Transfer, Order, PO, or other transaction.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await API.delete(`/skus/${s.id}`);
      setSkus(prev => prev.filter(x => x.id !== s.id));
      toast.success(`SKU ${s.skuCode} deleted`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await API.post('/skus/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(res.data.message);
      setRefreshKey(k => k + 1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sku-master-sample.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const filtered = skus.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.skuCode?.toLowerCase().includes(q) ||
      s.name?.toLowerCase().includes(q) ||
      s.brand?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q) ||
      s.epcCode?.toLowerCase().includes(q) ||
      (s.marketplaceSkus && Object.values(s.marketplaceSkus).some(v => v?.toLowerCase().includes(q)))
    );
  });

  const filledMarketplaces = (form.marketplaceSkus && Object.keys(form.marketplaceSkus).filter(k => form.marketplaceSkus[k])) || [];

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Package size={24} /> SKU Master
          </h1>
          <p className="text-sm text-slate-500 mt-1">Create products once. Reference them in GRN, Stock Transfer, and Orders.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field pl-9 py-2 text-sm w-48 md:w-64"
              placeholder="Search SKU, name, brand, marketplace..."
            />
          </div>
          <button onClick={downloadSample} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors">
            <Download size={15} /> Sample
          </button>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {importing ? 'Importing...' : 'Bulk Import'}
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2">
            <Plus size={16} /> Add SKU
          </button>
        </div>
      </div>

      {loading ? <TableSkeleton rows={6} cols={5} /> : filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <Package size={48} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">{search ? 'No SKUs match your search' : 'No SKUs yet'}</p>
          {!search && <p className="text-sm mt-1">Add a SKU or import a CSV before receiving stock (GRN), transferring inventory, or processing orders.</p>}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="table-header">SKU / EPC</th>
                  <th className="table-header">Name</th>
                  <th className="table-header">Brand / Category</th>
                  <th className="table-header">Size / Color</th>
                  <th className="table-header">MRP</th>
                  <th className="table-header">Marketplace</th>
                  <th className="table-header">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const mpEntries = s.marketplaceSkus && typeof s.marketplaceSkus === 'object'
                    ? Object.entries(s.marketplaceSkus).filter(([_, v]) => v)
                    : [];
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="table-cell">
                        <div className="font-mono text-xs font-medium">{s.skuCode}</div>
                        {s.epcCode && <div className="text-[10px] text-slate-400 mt-0.5">EPC: {s.epcCode}</div>}
                      </td>
                      <td className="table-cell">
                        <div className="font-medium text-sm">{s.name}</div>
                        {s.styleName && <div className="text-[10px] text-slate-400">{s.styleName}</div>}
                      </td>
                      <td className="table-cell text-sm">
                        {s.brand && <div>{s.brand}</div>}
                        {s.category && <div className="text-xs text-slate-500">{s.category}</div>}
                      </td>
                      <td className="table-cell text-sm">
                        {s.size || '—'}{s.color ? ` / ${s.color}` : ''}
                      </td>
                      <td className="table-cell text-sm font-medium">
                        {s.mrp != null ? `₹${Number(s.mrp).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="table-cell">
                        {mpEntries.length === 0 ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {mpEntries.slice(0, 3).map(([k, v]) => {
                              const mp = MARKETPLACES.find(m => m.key === k);
                              return (
                                <span key={k} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${mp?.color || 'bg-slate-100 text-slate-700'}`}>
                                  {mp?.label || k}: {v}
                                </span>
                              );
                            })}
                            {mpEntries.length > 3 && <span className="text-[10px] text-slate-400">+{mpEntries.length - 3}</span>}
                          </div>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(s)} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                            <Edit2 size={11} /> Edit
                          </button>
                          <button onClick={() => handleDelete(s)} className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1">
                            <Trash2 size={11} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t text-xs text-slate-400 text-center">
            {filtered.length} {filtered.length === 1 ? 'SKU' : 'SKUs'} · Master data feeds GRN, Stock Transfer & Order transactions
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => { if (!submitting) { setShowModal(false); resetForm(); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Package size={20} /> {editId ? `Edit SKU ${form.skuCode}` : 'Add New SKU'}
              </h3>
              <button onClick={() => { if (!submitting) { setShowModal(false); resetForm(); } }} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <span>This SKU becomes available in GRN, Stock Transfer (STN), and Order items immediately on save.</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><Hash size={12} /> SKU Code *</label>
                  <input
                    value={form.skuCode}
                    onChange={e => setForm({ ...form, skuCode: e.target.value })}
                    required
                    className="input-field font-mono"
                    placeholder="SKU-001 or your own"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                    <Hash size={12} /> EPC Code <span className="text-[10px] text-slate-400">(11-digit, auto)</span>
                  </label>
                  <input
                    value={form.epcCode}
                    onChange={e => setForm({ ...form, epcCode: e.target.value })}
                    className="input-field font-mono"
                    placeholder="auto-generated"
                    maxLength={11}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><Tag size={12} /> Product Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  className="input-field"
                  placeholder="Classic White T-Shirt"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><Tag size={12} /> Brand</label>
                  <input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="input-field" placeholder="Globex" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><FileText size={12} /> Category</label>
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field" placeholder="Apparel" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><Ruler size={12} /> Size</label>
                  <input value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} className="input-field" placeholder="M / 32 / 250ml" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><Palette size={12} /> Color</label>
                  <input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="input-field" placeholder="White" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><DollarSign size={12} /> MRP (₹)</label>
                  <input
                    value={form.mrp}
                    onChange={e => setForm({ ...form, mrp: e.target.value })}
                    className="input-field"
                    placeholder="499"
                    type="number"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><FileText size={12} /> HSN Code</label>
                  <input value={form.hsnCode} onChange={e => setForm({ ...form, hsnCode: e.target.value })} className="input-field" placeholder="6109" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><FileText size={12} /> Unit Type</label>
                  <select value={form.unitType} onChange={e => setForm({ ...form, unitType: e.target.value })} className="input-field">
                    <option value="pcs">pcs</option>
                    <option value="pair">pair</option>
                    <option value="set">set</option>
                    <option value="kg">kg</option>
                    <option value="litre">litre</option>
                    <option value="box">box</option>
                  </select>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowMarketplaces(!showMarketplaces)}
                  className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-left"
                >
                  <span className="text-sm font-medium flex items-center gap-2">
                    <ShoppingBag size={14} /> Marketplace SKUs
                    {filledMarketplaces.length > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                        {filledMarketplaces.length} mapped
                      </span>
                    )}
                  </span>
                  {showMarketplaces ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {showMarketplaces && (
                  <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white">
                    {MARKETPLACES.map(mp => (
                      <div key={mp.key}>
                        <label className="block text-[10px] font-medium text-slate-600 mb-0.5 uppercase tracking-wide">{mp.label}</label>
                        <input
                          value={form.marketplaceSkus[mp.key] || ''}
                          onChange={e => setForm({
                            ...form,
                            marketplaceSkus: { ...form.marketplaceSkus, [mp.key]: e.target.value }
                          })}
                          className="input-field text-sm font-mono"
                          placeholder={mp.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2 sticky bottom-0 bg-white">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} disabled={submitting} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {submitting ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Check size={16} /> {editId ? 'Update' : 'Create'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkuMaster;
