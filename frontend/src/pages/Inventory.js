import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Filter, MoreVertical, Download, Printer, Loader2, QrCode, CheckCircle2 } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const { selectedFacility } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [printingLabel, setPrintingLabel] = useState(null);
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const scanRef = useRef(null);

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

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    if (!selectedFacility) return toast.error('Select a facility first');
    setScanning(true);
    try {
      const res = await API.post('/inventory/scan', {
        skuCode: scanInput.trim(),
        warehouseId: selectedFacility.id,
      });
      setLastScanned(res.data.sku);
      toast.success(`+1 ${res.data.sku.skuCode} (${res.data.sku.name})`);
      fetchInventory();
      setScanInput('');
      scanRef.current?.focus();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Scan failed');
      setScanInput('');
      scanRef.current?.focus();
    } finally {
      setScanning(false);
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
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <form onSubmit={handleScan} className="flex gap-2">
          <div className="relative flex-1">
            <QrCode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={scanRef}
              autoFocus
              type="text"
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              placeholder="Scan SKU barcode to add +1 qty..."
              className="w-full pl-9 pr-3 py-2.5 border-2 rounded-xl font-mono text-sm outline-none focus:ring-4 focus:ring-blue-200"
            />
          </div>
          <button type="submit" disabled={scanning || !selectedFacility} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {scanning ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
            Scan
          </button>
        </form>
        <div className="flex items-center gap-3 mt-2">
          {lastScanned && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <CheckCircle2 size={14} /> Last: {lastScanned.skuCode}
            </span>
          )}
          <span className="text-xs text-slate-400">Each scan adds 1 to quantity on hand</span>
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

      {!selectedFacility && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
          Select a facility using the "Select Facility" dropdown to scan items into inventory.
        </div>
      )}
    </div>
  );
};

export default Inventory;
