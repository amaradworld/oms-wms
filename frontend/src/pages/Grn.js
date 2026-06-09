import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, CheckCircle, XCircle, Eye, Loader, QrCode } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { trackFirst } from '../utils/analytics';

const statusColors = {
  RECEIVING: 'bg-blue-100 text-blue-700',
  QC_PENDING: 'bg-amber-100 text-amber-700',
  QC_FAILED: 'bg-red-100 text-red-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-slate-100 text-slate-600',
};

const Grn = ({ detailId, setDetailId }) => {
  const confirm = useConfirm();
  const { selectedFacility } = useAuth();
  const [tab, setTab] = useState('incoming');
  const [grns, setGrns] = useState([]);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPo, setSelectedPo] = useState(null);
  const [selectedGrn, setSelectedGrn] = useState(null);
  const [receiveItems, setReceiveItems] = useState([]);
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scanCode, setScanCode] = useState('');
  const [scannedItem, setScannedItem] = useState(null);
  const [scanningGrn, setScanningGrn] = useState(false);
  const scanRef = useRef(null);

  useEffect(() => {
    if (detailId && !selectedGrn) {
      const controller = new AbortController();
      API.get(`/grn/${detailId}`, { signal: controller.signal }).then(res => { setSelectedGrn(res.data); setShowDetailModal(true); }).catch(() => { if (!controller.signal.aborted) setDetailId(''); });
      return () => controller.abort();
    }
  }, [detailId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedFacility?.id ? { params: { warehouseId: selectedFacility.id } } : {};
      const [poRes, grnRes] = await Promise.all([
        API.get('/purchase/orders', params),
        API.get('/grn', params),
      ]);
      setPos(Array.isArray(poRes.data) ? poRes.data.filter(p => p.status === 'APPROVED' || p.status === 'DRAFT' || p.status === 'RECEIVING' || p.status === 'PARTIALLY_RECEIVED') : []);
      setGrns(Array.isArray(grnRes.data) ? grnRes.data : []);
    } catch { setPos([]); setGrns([]); } finally { setLoading(false); }
  }, [selectedFacility]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openReceive = (po) => {
    setSelectedPo(po);
    setVendorInvoiceNo('');
    setReceiveItems(po.items.map(item => ({
      poItemId: item.id,
      skuId: item.skuId,
      skuCode: item.sku?.skuCode || '',
      skuName: item.sku?.name || '',
      expectedQty: item.quantity,
      receivedQty: item.quantity - (item.receivedQty || 0),
      batchNo: '',
      expiryDate: '',
      manufacturingDate: '',
      mrp: item.sku?.mrp || '',
    })));
    setShowReceiveModal(true);
  };

  const handleReceive = async () => {
    if (!receiveItems.some(i => i.receivedQty > 0)) return toast.error('Enter at least one item qty');
    setSubmitting(true);
    try {
      const itemCount = receiveItems.filter(i => i.receivedQty > 0).length;
      await API.post('/grn', {
        poId: selectedPo.id,
        vendorInvoiceNo,
        items: receiveItems.filter(i => i.receivedQty > 0).map(i => ({
          poItemId: i.poItemId,
          skuId: i.skuId,
          expectedQty: i.expectedQty,
          receivedQty: i.receivedQty,
          batchNo: i.batchNo || undefined,
          expiryDate: i.expiryDate || undefined,
          manufacturingDate: i.manufacturingDate || undefined,
          mrp: i.mrp ? Number(i.mrp) : undefined,
        })),
      });
      trackFirst('grn', 'grn_created', { po_id: selectedPo.id, item_count: itemCount });
      toast.success('GRN created');
      setShowReceiveModal(false);
      setSelectedPo(null);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); }
  };

  const openDetail = async (grn) => {
    if (setDetailId) setDetailId(grn.id);
    setScannedItem(null);
    setScanCode('');
    try {
      const { data } = await API.get(`/grn/${grn.id}`);
      setSelectedGrn(data);
      setShowDetailModal(true);
    } catch { toast.error('Failed to load GRN detail'); }
  };

  const handleQcItem = async (grnItemId, qcStatus) => {
    const item = selectedGrn.items.find(i => i.id === grnItemId);
    const acceptedQty = qcStatus === 'PASSED' ? (item.receivedQty - (item.rejectedQty || 0)) : 0;
    const rejectedQty = qcStatus === 'FAILED' ? (item.receivedQty - (item.acceptedQty || 0)) : 0;

    try {
      await API.post(`/grn/${selectedGrn.id}/qc`, {
        items: [{ grnItemId, qcStatus, acceptedQty, rejectedQty }],
      });
      toast.success(`Item ${qcStatus === 'PASSED' ? 'passed' : 'failed'} QC`);
      const { data } = await API.get(`/grn/${selectedGrn.id}`);
      setSelectedGrn(data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleApprove = async () => {
    try {
      const { data } = await API.post(`/grn/${selectedGrn.id}/approve`);
      toast.success(data.message);
      setShowDetailModal(false);
      setSelectedGrn(null);
      if (setDetailId) setDetailId('');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleReject = async () => {
    if (!await confirm({
      title: 'Reject this GRN?',
      message: 'This will mark the entire GRN as rejected. The received quantity will be set to 0 and the PO will be returned to the supplier workflow. This cannot be undone.',
      confirmText: 'Reject GRN',
      variant: 'danger',
    })) return;
    try {
      await API.post(`/grn/${selectedGrn.id}/reject`);
      toast.success('GRN rejected');
      setShowDetailModal(false);
      setSelectedGrn(null);
      if (setDetailId) setDetailId('');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleScanReceive = async (e) => {
    e.preventDefault();
    if (!scanCode.trim()) return;
    setScanningGrn(true);
    try {
      const code = scanCode.trim();
      const isEpc = /^\d{11}$/.test(code);
      const item = selectedGrn.items.find(i => i.sku?.skuCode === code);
      if (!item) return toast.error('SKU not found in this GRN');
      setScannedItem({ ...item, isEpc });
      setScanCode('');
    } catch { toast.error('Scan failed'); } finally { setScanningGrn(false); }
  };

  const handleConfirmScanQc = async (qcStatus) => {
    if (!scannedItem) return;
    setScanningGrn(true);
    try {
      const payload = scannedItem.isEpc ? { epcCode: scannedItem.sku.skuCode, qcStatus } : { skuCode: scannedItem.sku.skuCode, qcStatus };
      await API.post(`/grn/${selectedGrn.id}/scan-receive`, payload);
      toast.success(`${scannedItem.sku.skuCode} → ${qcStatus}`);
      setScannedItem(null);
      const res = await API.get(`/grn/${selectedGrn.id}`);
      setSelectedGrn(res.data);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setScanningGrn(false); scanRef.current?.focus(); }
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">Goods Receipt Note</h1>

      <div className="flex gap-2">
        <button onClick={() => setTab('incoming')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'incoming' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>Incoming POs</button>
        <button onClick={() => setTab('grns')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'grns' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>All GRNs ({grns.length})</button>
      </div>

      {tab === 'incoming' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? <TableSkeleton rows={5} cols={5} /> : pos.length === 0
            ? <EmptyState icon="orders" title="No POs ready" description="Create a PO first to start receiving stock." />
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
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${po.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' : po.status === 'RECEIVING' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{po.status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{new Date(po.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => openReceive(po)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium">
                          Receive
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
        </div>
      )}

      {tab === 'grns' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? <TableSkeleton rows={5} cols={6} /> : grns.length === 0
            ? <EmptyState icon="orders" title="No GRNs" description="Receive items from a PO to create a GRN." />
            : <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">GRN#</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">PO#</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Total Qty</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Accepted</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Rejected</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Date</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {grns.map(grn => (
                    <tr key={grn.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-sm font-medium">{grn.grnNumber}</td>
                      <td className="px-4 py-3 text-sm">{grn.purchaseOrder?.poNumber || '-'}</td>
                      <td className="px-4 py-3 text-sm">{grn.totalQty}</td>
                      <td className="px-4 py-3 text-sm text-green-600 font-medium">{grn.acceptedQty}</td>
                      <td className="px-4 py-3 text-sm text-red-600 font-medium">{grn.rejectedQty}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[grn.status] || 'bg-slate-100 text-slate-600'}`}>{grn.status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">{new Date(grn.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => openDetail(grn)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium">
                          <Eye size={14} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
        </div>
      )}

      {/* Receive Modal */}
      {showReceiveModal && selectedPo && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Receive - {selectedPo.poNumber}</h2>
              <button onClick={() => setShowReceiveModal(false)}><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-500">{selectedPo.supplier?.name}</p>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase">Vendor Invoice No.</label>
              <input type="text" value={vendorInvoiceNo} onChange={e => setVendorInvoiceNo(e.target.value)} placeholder="e.g. INV-001" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
            </div>
            <div className="space-y-3">
              {receiveItems.map((item, i) => (
                <div key={item.poItemId} className="bg-slate-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.skuName || item.skuCode}</div>
                      <div className="text-xs text-slate-400">Expected: {item.expectedQty}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Received</span>
                      <input type="number" min="0" value={item.receivedQty}
                        onChange={e => { const u = [...receiveItems]; u[i].receivedQty = Math.max(0, parseInt(e.target.value) || 0); setReceiveItems(u); }}
                        className="w-16 px-2 py-1.5 border rounded text-sm text-center" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] font-medium text-slate-400">Batch No.</label>
                      <input type="text" value={item.batchNo} placeholder="B001"
                        onChange={e => { const u = [...receiveItems]; u[i].batchNo = e.target.value; setReceiveItems(u); }}
                        className="w-full px-2 py-1 border rounded text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-400">MRP</label>
                      <input type="number" step="0.01" value={item.mrp} placeholder="999"
                        onChange={e => { const u = [...receiveItems]; u[i].mrp = e.target.value; setReceiveItems(u); }}
                        className="w-full px-2 py-1 border rounded text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-400">Expiry</label>
                      <input type="date" value={item.expiryDate}
                        onChange={e => { const u = [...receiveItems]; u[i].expiryDate = e.target.value; setReceiveItems(u); }}
                        className="w-full px-2 py-1 border rounded text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-400">Mfg Date</label>
                      <input type="date" value={item.manufacturingDate}
                        onChange={e => { const u = [...receiveItems]; u[i].manufacturingDate = e.target.value; setReceiveItems(u); }}
                        className="w-full px-2 py-1 border rounded text-xs" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleReceive} disabled={submitting} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting && <Loader size={16} className="animate-spin" />}
              Create GRN
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedGrn && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold">{selectedGrn.grnNumber}</h2>
                <p className="text-sm text-slate-500">PO: {selectedGrn.purchaseOrder?.poNumber} | Supplier: {selectedGrn.purchaseOrder?.supplier?.name}</p>
                {selectedGrn.vendorInvoiceNo && <p className="text-xs text-slate-400 mt-0.5">Invoice: {selectedGrn.vendorInvoiceNo}</p>}
              </div>
              <button onClick={() => { setShowDetailModal(false); if (setDetailId) setDetailId(''); }}><X size={20} /></button>
            </div>

            <div className={`px-3 py-1.5 rounded-full text-xs font-medium inline-block ${statusColors[selectedGrn.status]}`}>{selectedGrn.status}</div>

            {/* Flow indicator */}
            <div className="flex items-center gap-1 text-[10px] font-medium">
              {['RECEIVING', 'QC_PENDING', 'APPROVED'].map((step, i) => {
                const stepIdx = ['RECEIVING', 'QC_PENDING', 'APPROVED'].indexOf(selectedGrn.status === 'QC_FAILED' ? 'QC_PENDING' : selectedGrn.status);
                const stepStatus = i < stepIdx ? 'done' : i === stepIdx ? 'current' : 'pending';
                return (
                  <React.Fragment key={step}>
                    {i > 0 && <div className={`w-4 h-px ${stepStatus === 'done' ? 'bg-green-400' : 'bg-slate-200'}`} />}
                    <span className={`px-2 py-0.5 rounded-full ${
                      stepStatus === 'done' ? 'bg-green-100 text-green-700' :
                      stepStatus === 'current' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {step === 'RECEIVING' ? '1. Receive' : step === 'QC_PENDING' ? '2. QC' : '3. Approve'}
                    </span>
                  </React.Fragment>
                );
              })}
              <div className={`w-4 h-px ${selectedGrn.status === 'APPROVED' ? 'bg-green-400' : 'bg-slate-200'}`} />
              <span className={`px-2 py-0.5 rounded-full ${selectedGrn.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>
                4. Putaway
              </span>
            </div>

            {selectedGrn.status === 'RECEIVING' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                <p className="font-medium">Ready to approve</p>
                <p className="text-xs mt-1">Approve this GRN to update inventory and auto-create putaway tasks. You can QC items first or approve directly.</p>
              </div>
            )}

            {selectedGrn.status !== 'APPROVED' && selectedGrn.status !== 'REJECTED' && (
              <div className="space-y-2">
                <form onSubmit={handleScanReceive} className="flex gap-2">
                  <div className="flex-1 relative">
                    <QrCode size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input ref={scanRef} type="text" value={scanCode} onChange={e => setScanCode(e.target.value)} placeholder="Scan SKU code or EPC..." autoFocus className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <button type="submit" disabled={scanningGrn} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Scan</button>
                </form>
                {scannedItem && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{scannedItem.sku?.name}</p>
                      <p className="text-xs text-slate-500">{scannedItem.sku?.skuCode} — Received {scannedItem.receivedQty}/{scannedItem.expectedQty}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleConfirmScanQc('PASSED')} disabled={scanningGrn} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
                        <CheckCircle size={16} /> Good
                      </button>
                      <button onClick={() => handleConfirmScanQc('FAILED')} disabled={scanningGrn} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-1">
                        <XCircle size={16} /> Bad
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {selectedGrn.items.map(item => (
                <div key={item.id} className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{item.sku?.name || item.sku?.skuCode}</div>
                      <div className="text-xs text-slate-400">{item.sku?.skuCode} {item.sku?.size ? `| ${item.sku.size}` : ''}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Expected: {item.expectedQty} | Received: {item.receivedQty} | Accepted: {item.acceptedQty} | Rejected: {item.rejectedQty}
                      </div>
                      {(item.batchNo || item.mrp || item.expiryDate || item.manufacturingDate) && (
                        <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] text-slate-400">
                          {item.batchNo && <span className="bg-white px-1.5 py-0.5 rounded border">Batch: {item.batchNo}</span>}
                          {item.mrp && <span className="bg-white px-1.5 py-0.5 rounded border">MRP: ₹{Number(item.mrp).toFixed(2)}</span>}
                          {item.expiryDate && <span className="bg-white px-1.5 py-0.5 rounded border">Exp: {new Date(item.expiryDate).toLocaleDateString()}</span>}
                          {item.manufacturingDate && <span className="bg-white px-1.5 py-0.5 rounded border">Mfg: {new Date(item.manufacturingDate).toLocaleDateString()}</span>}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      {item.qcStatus === 'PENDING' && selectedGrn.status !== 'APPROVED' && selectedGrn.status !== 'REJECTED' && (
                        <div className="flex gap-1">
                          <button onClick={() => handleQcItem(item.id, 'PASSED')} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200" title="Pass QC">
                            <CheckCircle size={16} />
                          </button>
                          <button onClick={() => handleQcItem(item.id, 'FAILED')} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Fail QC">
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}
                      {item.qcStatus !== 'PENDING' && (
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.qcStatus === 'PASSED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.qcStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {(selectedGrn.status === 'RECEIVING' || selectedGrn.status === 'QC_PENDING' || selectedGrn.status === 'QC_FAILED') && (
              <div className="flex gap-2">
                <button onClick={handleApprove} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 flex items-center justify-center gap-2">
                  <CheckCircle size={16} />
                  {selectedGrn.status === 'QC_FAILED' ? 'Approve Passed Items & Create Putaway' :
                   selectedGrn.status === 'RECEIVING' ? 'Approve GRN (Skip QC) & Create Putaway' :
                   'Approve GRN & Create Putaway'}
                </button>
                <button onClick={handleReject} className="px-4 py-2.5 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200">
                  Reject
                </button>
              </div>
            )}

            {selectedGrn.status === 'APPROVED' && selectedGrn.putawayTasks?.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
                {selectedGrn.putawayTasks.filter(t => t.status === 'COMPLETED').length} / {selectedGrn.putawayTasks.length} putaway tasks completed
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Grn;
