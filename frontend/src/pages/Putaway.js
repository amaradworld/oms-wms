import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, Loader } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const Putaway = () => {
  const { selectedFacility } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailTask, setDetailTask] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBinId, setSelectedBinId] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">Putaway Tasks</h1>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? <TableSkeleton rows={5} cols={5} /> : tasks.length === 0
          ? <EmptyState icon="orders" title="No putaway tasks" description="Approve a GRN to generate putaway tasks." />
          : <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">SKU</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">GRN</th>
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
                    <td className="px-4 py-3 font-mono text-sm">{task.sku?.skuCode || '-'}</td>
                    <td className="px-4 py-3 text-sm">{task.sku?.name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{task.grn?.grnNumber || '-'}</td>
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
                        <button onClick={() => openAssign(task)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                          Assign Bin
                        </button>
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

      {showAssignModal && detailTask && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Assign Bin</h2>
              <button onClick={() => { setShowAssignModal(false); setDetailTask(null); }}><X size={20} /></button>
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              <p><strong>SKU:</strong> {detailTask.sku?.skuCode} - {detailTask.sku?.name}</p>
              <p><strong>Qty:</strong> {detailTask.expectedQty}</p>
              <p><strong>GRN:</strong> {detailTask.grn?.grnNumber}</p>
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
    </div>
  );
};

export default Putaway;
