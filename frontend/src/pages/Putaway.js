import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, Loader, Plus, Package, ArrowRight } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const PUTAWAY_SOURCES = [
  { value: 'PUTAWAY_GRN_ITEM', label: 'GRN Item', desc: 'Items from approved GRNs awaiting bin assignment' },
  { value: 'PUTAWAY_CANCELLED_ITEM', label: 'Cancelled Item', desc: 'Items from cancelled orders to return to shelf' },
  { value: 'PUTAWAY_GATEPASS_ITEM', label: 'Gatepass Item', desc: 'Items from received gatepasses (inbound)' },
  { value: 'PUTAWAY_RECEIVED_RETURNS', label: 'Received Returns', desc: 'Customer returns QC-passed needing restocking' },
  { value: 'PUTAWAY_SHELF_TRANSFER', label: 'Shelf Transfer', desc: 'Stock transfers received from another facility' },
  { value: 'PUTAWAY_PICKLIST_ITEM', label: 'Picklist Item', desc: 'Picked items from cancelled/returned orders' },
];

const Putaway = ({ detailId, setDetailId }) => {
  const { selectedFacility } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailTask, setDetailTask] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBinId, setSelectedBinId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Create Putaway modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [selectedSource, setSelectedSource] = useState('');
  const [sourceItems, setSourceItems] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    if (detailId && !detailTask) {
      API.get(`/putaway/${detailId}`).then(res => { setDetailTask(res.data); setShowAssignModal(true); }).catch(() => setDetailId(''));
    }
  }, [detailId]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedFacility?.id ? { params: { warehouseId: selectedFacility.id } } : {};
      const [taskRes, binRes] = await Promise.all([
        API.get('/putaway', { params: { ...params.params, status: 'PENDING,IN_PROGRESS' } }),
        API.get('/bins', params),
      ]);
      setTasks(Array.isArray(taskRes.data) ? taskRes.data : []);
      setBins(Array.isArray(binRes.data) ? binRes.data : []);
    } catch { setTasks([]); setBins([]); } finally { setLoading(false); }
  }, [selectedFacility]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openAssign = (task) => {
    if (setDetailId) setDetailId(task.id);
    setDetailTask(task);
    setSelectedBinId(task.binId || '');
    setShowAssignModal(true);
  };

  const handleAssignBin = async () => {
    if (!selectedBinId) return toast.error('Select a bin');
    setSubmitting(true);
    try {
      await API.put(`/putaway/${detailTask.id}/assign-bin`, { binId: selectedBinId });
      toast.success('Bin assigned');
      setShowAssignModal(false);
      setDetailTask(null);
      if (setDetailId) setDetailId('');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); }
  };

  const handleComplete = async (taskId) => {
    setSubmitting(true);
    try {
      await API.put(`/putaway/${taskId}/complete`);
      toast.success('Putaway completed. Inventory moved to bin.');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); }
  };

  const handleQuickComplete = async (task) => {
    if (!bins.length) return toast.error('No bins available');
    setSubmitting(true);
    try {
      const binId = task.binId || bins[0].id;
      await API.put(`/putaway/${task.id}/assign-bin`, { binId });
      await API.put(`/putaway/${task.id}/complete`);
      toast.success('Quick complete done');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); }
  };

  // Create Putaway flow
  const openCreateModal = () => {
    setCreateStep(1);
    setSelectedSource('');
    setSourceItems([]);
    setSelectedItems([]);
    setShowCreateModal(true);
  };

  const handleSelectSource = async (source) => {
    if (!source) return;
    setSelectedSource(source);
    setLoadingSources(true);
    try {
      const params = selectedFacility?.id ? { warehouseId: selectedFacility.id } : {};
      const res = await API.get('/putaway/sources', { params: { ...params, type: source } });
      setSourceItems(Array.isArray(res.data) ? res.data : []);
      setCreateStep(2);
      setSelectedItems([]);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to load items'); } finally { setLoadingSources(false); }
  };

  const toggleItem = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.skuId === item.skuId && i.sourceId === item.sourceId);
      if (exists) return prev.filter(i => !(i.skuId === item.skuId && i.sourceId === item.sourceId));
      return [...prev, { ...item, expectedQty: item.pendingQty }];
    });
  };

  const updateItemQty = (item, qty) => {
    setSelectedItems(prev => prev.map(i =>
      i.skuId === item.skuId && i.sourceId === item.sourceId
        ? { ...i, expectedQty: Math.max(1, Math.min(qty || 1, i.pendingQty)) }
        : i
    ));
  };

  const handleCreateTasks = async () => {
    if (selectedItems.length === 0) return toast.error('Select at least one item');
    if (!selectedFacility?.id) return toast.error('Select a facility first');

    setSubmitting(true);
    try {
      const items = selectedItems.map(i => ({ skuId: i.skuId, expectedQty: i.expectedQty, sourceId: i.sourceId }));
      const res = await API.post('/putaway/task', {
        source: selectedSource,
        warehouseId: selectedFacility.id,
        items,
      });
      const { created, skipped, message } = res.data;
      if (skipped > 0) {
        toast.warning(message || `${skipped} item(s) skipped — already have pending tasks`);
      } else {
        toast.success(message || `${created} putaway task(s) created`);
      }
      setShowCreateModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); } finally { setSubmitting(false); }
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Putaway Tasks</h1>
        <button
          onClick={openCreateModal}
          disabled={!selectedFacility?.id}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus size={16} /> Create Putaway
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? <TableSkeleton rows={5} cols={6} /> : tasks.length === 0
          ? <EmptyState icon="orders" title="No putaway tasks" description="Create a putaway task from GRN, returns, cancelled orders, etc." />
          : <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[650px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Source</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">SKU</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Expected</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Completed</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Bin</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => (
                  <tr key={task.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        {task.source || 'PUTAWAY_GRN_ITEM'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{task.sku?.skuCode || '-'}</td>
                    <td className="px-4 py-3 text-sm">{task.sku?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm font-medium">{task.expectedQty}</td>
                    <td className="px-4 py-3 text-sm">{task.completedQty}</td>
                    <td className="px-4 py-3 text-sm font-mono">{task.bin?.code || <span className="text-slate-400">Not assigned</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {task.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button onClick={() => openAssign(task)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                            Assign Bin
                          </button>
                          <button onClick={() => handleQuickComplete(task)} disabled={submitting} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium">
                            {submitting ? <Loader size={12} className="animate-spin" /> : <CheckCircle size={14} />}
                            Quick
                          </button>
                        </div>
                      )}
                      {task.status === 'IN_PROGRESS' && (
                        <button onClick={() => handleComplete(task.id)} disabled={submitting} className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium">
                          {submitting ? <Loader size={12} className="animate-spin" /> : <CheckCircle size={14} />}
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
      </div>

      {/* Assign Bin Modal */}
      {showAssignModal && detailTask && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Assign Bin</h2>
              <button onClick={() => { setShowAssignModal(false); setDetailTask(null); if (setDetailId) setDetailId(''); }}><X size={20} /></button>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              <p><strong>Source:</strong> <span className="font-mono">{detailTask.source || 'PUTAWAY_GRN_ITEM'}</span></p>
              <p><strong>SKU:</strong> {detailTask.sku?.skuCode} - {detailTask.sku?.name}</p>
              <p><strong>Qty:</strong> {detailTask.expectedQty}</p>
            </div>
            <select value={selectedBinId} onChange={e => setSelectedBinId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option value="">Select a bin...</option>
              {bins.filter(b => b.isActive).map(bin => (
                <option key={bin.id} value={bin.id}>{bin.code}{bin.zone ? ` (Zone ${bin.zone})` : ''}</option>
              ))}
            </select>
            {bins.length === 0 && (
              <p className="text-xs text-amber-600">No bins found. Create bins in the Bin Locations page first.</p>
            )}
            <button onClick={handleAssignBin} disabled={!selectedBinId || submitting} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting && <Loader size={16} className="animate-spin" />}
              Assign & Start Putaway
            </button>
          </div>
        </div>
      )}

      {/* Create Putaway Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-2xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Create Putaway Task</h2>
              <button onClick={() => setShowCreateModal(false)}><X size={20} /></button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-2 text-sm">
              <span className={`px-2 py-1 rounded-full ${createStep >= 1 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>1. Source</span>
              <ArrowRight size={14} className="text-slate-300" />
              <span className={`px-2 py-1 rounded-full ${createStep >= 2 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>2. Items</span>
            </div>

            {createStep === 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Putaway Source Type</label>
                <div className="grid gap-2">
                  {PUTAWAY_SOURCES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => handleSelectSource(s.value)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${selectedSource === s.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
                    >
                      <Package size={20} className="text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{s.label}</div>
                        <div className="text-xs text-slate-500">{s.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {createStep === 2 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Items from <span className="font-mono">{PUTAWAY_SOURCES.find(s => s.value === selectedSource)?.label || selectedSource}</span>
                  </label>
                  <span className="text-xs text-slate-500">{selectedItems.length} selected</span>
                </div>

                {loadingSources ? (
                  <div className="flex justify-center py-8"><Loader size={24} className="animate-spin text-slate-400" /></div>
                ) : sourceItems.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Package size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No items available for putaway from this source.</p>
                    <button onClick={() => setCreateStep(1)} className="mt-2 text-sm text-blue-600 hover:underline">Pick a different source</button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {sourceItems.map((item, idx) => {
                      const isSelected = selectedItems.find(i => i.skuId === item.skuId && i.sourceId === item.sourceId);
                      const sel = selectedItems.find(i => i.skuId === item.skuId && i.sourceId === item.sourceId);
                      return (
                        <div
                          key={`${item.sourceId}-${item.skuId}-${idx}`}
                          onClick={() => toggleItem(item)}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                          <input type="checkbox" checked={!!isSelected} onChange={() => {}} className="rounded accent-blue-600" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{item.skuCode}</span>
                              <span className="text-sm font-medium truncate">{item.skuName}</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{item.sourceRef}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isSelected ? (
                              <input
                                type="number" min="1" max={item.pendingQty}
                                value={sel?.expectedQty || item.pendingQty}
                                onClick={e => e.stopPropagation()}
                                onChange={e => {
                                  e.stopPropagation();
                                  updateItemQty(item, parseInt(e.target.value) || 1);
                                }}
                                className="w-16 px-2 py-1 border rounded text-sm text-center"
                              />
                            ) : (
                              <span className="text-xs text-slate-400 whitespace-nowrap">Qty: {item.pendingQty}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {sourceItems.length > 0 && (
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setCreateStep(1)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Back</button>
                    <button
                      onClick={handleCreateTasks}
                      disabled={selectedItems.length === 0 || submitting}
                      className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting && <Loader size={16} className="animate-spin" />}
                      Create {selectedItems.length > 0 ? `${selectedItems.length} Task(s)` : 'Putaway Task'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Putaway;
