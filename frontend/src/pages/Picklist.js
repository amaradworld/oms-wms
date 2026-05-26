import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import API from '../utils/api';

const Picklist = () => {
  const [activeList, setActiveList] = useState('pending');
  const [picklists, setPicklists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

  const fetchPicklists = async () => {
    setLoading(true);
    try {
      const res = await API.get('/picklists');
      setPicklists(res.data);
    } catch {
      setPicklists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPicklists(); }, []);

  const handleCreate = async () => {
    if (!selectedWarehouse) return;
    try {
      await API.post('/picklists', { warehouseId: selectedWarehouse, items: [] });
      setShowModal(false);
      setSelectedWarehouse('');
      fetchPicklists();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create picklist');
    }
  };

  const filtered = picklists.filter(p =>
    activeList === 'all' ? true : p.status === activeList.toUpperCase()
  );

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Picklist Management</h1>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-sm w-full sm:w-auto">
          <Plus size={16} /> Create Picklist
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['pending', 'picking', 'completed', 'all'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveList(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeList === tab ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Picklist ID</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Warehouse</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Picker</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">No picklists found</td></tr>
              ) : filtered.map(pl => (
                <tr key={pl.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium">{pl.id?.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-sm">{pl.warehouse?.name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      pl.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      pl.status === 'PICKING' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>{pl.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{pl.pickerId || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{pl.createdAt ? new Date(pl.createdAt).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md md:mx-4 p-5 md:p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Create Picklist</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Select Warehouse</label>
              <select
                value={selectedWarehouse}
                onChange={e => setSelectedWarehouse(e.target.value)}
                className="w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Choose warehouse...</option>
                <option value="wh-1">Mumbai Central Hub</option>
                <option value="wh-2">Delhi Logistics Park</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleCreate} disabled={!selectedWarehouse} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                Create Picklist
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

export default Picklist;
