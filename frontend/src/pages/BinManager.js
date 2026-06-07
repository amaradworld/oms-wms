import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const BinManager = () => {
  const { selectedFacility } = useAuth();
  const confirm = useConfirm();
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [form, setForm] = useState({ code: '', zone: '', aisle: '', rack: '', shelf: '' });
  const [bulkCodes, setBulkCodes] = useState('');

  const fetchBins = useCallback(async () => {
    setLoading(true);
    try {
      const params = selectedFacility?.id ? { params: { warehouseId: selectedFacility.id } } : {};
      const { data } = await API.get('/bins', params);
      setBins(Array.isArray(data) ? data : []);
    } catch { setBins([]); } finally { setLoading(false); }
  }, [selectedFacility]);

  useEffect(() => { fetchBins(); }, [fetchBins]);

  const handleCreate = async () => {
    if (!form.code || !selectedFacility?.id) return toast.error('Enter bin code and select a facility');
    try {
      await API.post('/bins', { ...form, warehouseId: selectedFacility.id });
      toast.success('Bin created');
      setShowModal(false);
      setForm({ code: '', zone: '', aisle: '', rack: '', shelf: '' });
      fetchBins();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleBulkCreate = async () => {
    if (!bulkCodes.trim() || !selectedFacility?.id) return toast.error('Enter bin codes and select a facility');
    const codes = bulkCodes.split('\n').map(s => s.trim()).filter(Boolean);
    try {
      const { data } = await API.post('/bins/bulk', { warehouseId: selectedFacility.id, codes });
      toast.success(`${data.created} created, ${data.skipped} skipped`);
      setShowBulkModal(false);
      setBulkCodes('');
      fetchBins();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!await confirm({
      title: 'Delete this bin?',
      message: 'Inventory in this bin will not be deleted, but the bin will be removed from the location list. This cannot be undone.',
      confirmText: 'Delete bin',
      variant: 'danger',
    })) return;
    try {
      await API.delete(`/bins/${id}`);
      toast.success('Bin deleted');
      fetchBins();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Bin Locations</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowBulkModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">
            <Plus size={16} /> Bulk Create
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> Add Bin
          </button>
        </div>
      </div>

      {!selectedFacility && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm">
          Select a facility from the Warehouse page to manage bins for that warehouse.
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? <TableSkeleton rows={5} cols={4} /> : bins.length === 0
          ? <EmptyState icon="orders" title="No bins" description="Create bin locations for putaway operations." />
          : <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px]">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Code</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Zone</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Aisle</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Rack</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Shelf</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {bins.map(bin => (
                  <tr key={bin.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-sm font-medium">{bin.code}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{bin.zone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{bin.aisle || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{bin.rack || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{bin.shelf || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bin.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {bin.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(bin.id)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Add Bin Location</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Bin Code * (e.g. A-01-01)" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input placeholder="Zone (e.g. A)" value={form.zone} onChange={e => setForm({ ...form, zone: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input placeholder="Aisle" value={form.aisle} onChange={e => setForm({ ...form, aisle: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input placeholder="Rack" value={form.rack} onChange={e => setForm({ ...form, rack: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input placeholder="Shelf" value={form.shelf} onChange={e => setForm({ ...form, shelf: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <button onClick={handleCreate} disabled={!form.code} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">Create Bin</button>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-lg p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Bulk Create Bins</h2>
              <button onClick={() => setShowBulkModal(false)}><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-500">Enter one bin code per line:</p>
            <textarea placeholder={`A-01-01\nA-01-02\nA-01-03`} value={bulkCodes} onChange={e => setBulkCodes(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm font-mono" rows={8} />
            <button onClick={handleBulkCreate} disabled={!bulkCodes.trim()} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">Create {bulkCodes.trim() ? bulkCodes.split('\n').filter(Boolean).length : 0} Bins</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BinManager;
