import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Download, Printer, Loader2, QrCode, CheckCircle2, RefreshCw } from 'lucide-react';
import ImportButton from '../components/ImportButton';
import SampleCSVButton from '../components/SampleCSVButton';
import BarcodeCell from '../components/BarcodeCell';
import DataTable from '../components/DataTable';
import { toast } from '../components/Toast';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';

const INVENTORY_COLUMNS = [
  { key: 'barcode', label: 'Barcode', render: (r) => <BarcodeCell value={r.skuCode} /> },
  { key: 'skuCode', label: 'SKU', render: (r) => <span className="text-sm font-mono font-medium">{r.skuCode}</span> },
  { key: 'epcCode', label: 'EPC', render: (r) => <span className="text-sm font-mono text-amber-700">{r.epcCode || '-'}</span> },
  { key: 'name', label: 'Product' },
  { key: 'warehouse', label: 'Shelf', render: (r) => <span className="text-sm text-slate-600" title={`Inventory Allocation: ${r.inventoryAllocation}\nInventory Sync: ${r.inventorySync}\nSku Mixing: ${r.skuMixing}\nShelf on hold: ${r.shelfOnHold}`}>{r.warehouse || '-'}</span> },
  { key: 'batch', label: 'Batch', render: (r) => <span className="text-sm text-slate-600">{r.batch || '-'}</span> },
  { key: 'batchStatus', label: 'Batch Status', render: (r) => <span className="text-sm text-slate-600">{r.batchStatus || '-'}</span> },
  { key: 'type', label: 'Type', render: (r) => <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${r.type === 'Bad' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{r.type}</span> },
  { key: 'quantityOnHand', label: 'Total', align: 'right', render: (r) => <span className="text-sm font-mono">{r.quantityOnHand ?? '-'}</span> },
  { key: 'quantityAvailable', label: 'Available', align: 'right', render: (r) => <span className="text-sm font-mono font-semibold text-emerald-600">{r.quantityAvailable ?? '-'}</span> },
  { key: 'quantityReserved', label: 'Blocked', align: 'right', render: (r) => <span className="text-sm font-mono text-amber-600">{r.quantityReserved ?? 0}</span> },
  { key: 'notFound', label: 'Not Found', align: 'right', render: (r) => <span className="text-sm font-mono">{r.notFound ?? 0}</span> },
  { key: 'size', label: 'Size', render: (r) => <span className="text-sm text-slate-600">{r.size || '-'}</span> },
  { key: 'color', label: 'Color', render: (r) => <span className="text-sm text-slate-600">{r.color || '-'}</span> },
  { key: 'brand', label: 'Brand', render: (r) => <span className="text-sm text-slate-600">{r.brand || '-'}</span> },
  { key: 'lastUpdated', label: 'Updated', render: (r) => <span className="text-sm text-slate-500">{r.lastUpdated ? new Date(r.lastUpdated).toLocaleDateString() : '—'}</span> },
  { key: 'status', label: 'Status', render: (r) => <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${r.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{r.status}</span> },
];

const Inventory = () => {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { selectedFacility } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [printingLabel, setPrintingLabel] = useState(null);
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const scanRef = useRef(null);

  const fetchInventory = useCallback(async (silent) => {
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const params = selectedFacility ? { warehouseId: selectedFacility.id } : {};
      const res = await API.get('/inventory', { params });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error('Failed to load inventory');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedFacility]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    if (!selectedFacility) return toast.error('Select a facility first');
    setScanning(true);
    try {
      const code = scanInput.trim();
      const isEpc = /^\d{11}$/.test(code);
      const payload = { warehouseId: selectedFacility.id };
      if (isEpc) payload.epcCode = code; else payload.skuCode = code;
      const res = await API.post('/inventory/scan', payload);
      setLastScanned(res.data.sku);
      toast.success(`+1 ${res.data.sku.skuCode} (${res.data.sku.name})`);
      fetchInventory(true);
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
    (i.skuCode || '').toLowerCase().includes(searchStr) ||
    (i.name || '').toLowerCase().includes(searchStr) ||
    (i.styleName || '').toLowerCase().includes(searchStr) ||
    (i.brand || '').toLowerCase().includes(searchStr) ||
    (i.color || '').toLowerCase().includes(searchStr) ||
    (i.size || '').toLowerCase().includes(searchStr) ||
    (i.warehouse || '').toLowerCase().includes(searchStr) ||
    (i.batch || '').toLowerCase().includes(searchStr) ||
    (i.binLocation || '').toLowerCase().includes(searchStr)
  );

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => fetchInventory()} disabled={loading || refreshing} className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw size={16} /> Refresh
          </button>
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

      <DataTable
        columns={INVENTORY_COLUMNS}
        data={filtered}
        loading={loading}
        searchable
        searchValue={search}
        onSearch={setSearch}
        searchPlaceholder="Search by SKU, name, style, brand, color, shelf..."
        selectable
        selected={selectedItems}
        onSelectionChange={setSelectedItems}
        actions={(item) => [
          { label: 'Print Label', icon: Printer, onClick: () => handlePrintLabel(item.skuCode, item.name) },
        ]}
        emptyState={{ icon: 'inventory', title: 'No SKUs found', description: 'Add your first SKU using the button above or import via CSV.' }}
      />

      {!selectedFacility && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
          Select a facility using the "Select Facility" dropdown to scan items into inventory.
        </div>
      )}
    </div>
  );
};

export default Inventory;
