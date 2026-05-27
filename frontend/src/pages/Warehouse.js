import React, { useState, useEffect } from 'react';
import { Plus, X, ChevronDown, ChevronRight, Building2, Package, ShoppingCart, Eye, ArrowRight } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/EmptyState';

const Warehouse = () => {
  const { selectedFacility, setSelectedFacility } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [selectedWH, setSelectedWH] = useState(null);
  const [expandWH, setExpandWH] = useState(null);
  const [masterView, setMasterView] = useState(null);
  const [showMaster, setShowMaster] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', address: '' });
  const [facilityForm, setFacilityForm] = useState({ name: '', location: '', address: '' });

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await API.get('/warehouses');
      setWarehouses(Array.isArray(res.data) ? res.data : []);
    } catch { setWarehouses([]); } finally { setLoading(false); }
  };

  const fetchMasterView = async () => {
    try {
      const res = await API.get('/warehouses/master-view');
      setMasterView(res.data);
      setShowMaster(true);
    } catch { alert('Failed to load master view'); }
  };

  useEffect(() => { fetchWarehouses(); }, []);

  const handleCreate = async () => {
    if (!form.name) return;
    try {
      await API.post('/warehouses', form);
      setShowModal(false);
      setForm({ name: '', location: '', address: '' });
      fetchWarehouses();
    } catch (err) { alert(err.response?.data?.message || 'Failed to create'); }
  };

  const handleCreateFacility = async () => {
    if (!facilityForm.name || !selectedWH) return;
    try {
      await API.post(`/warehouses/${selectedWH}/facilities`, facilityForm);
      setShowFacilityModal(false);
      setFacilityForm({ name: '', location: '', address: '' });
      fetchWarehouses();
    } catch (err) { alert(err.response?.data?.message || 'Failed to create facility'); }
  };

  const toggleExpand = (id) => {
    setExpandWH(expandWH === id ? null : id);
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Warehouse & Facilities</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={fetchMasterView} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium w-full sm:w-auto">
            <Eye size={16} /> Master View
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium w-full sm:w-auto">
            <Plus size={16} /> Add WH
          </button>
        </div>
      </div>

      {selectedFacility && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Building2 size={16} className="text-indigo-600" />
            <span className="font-medium text-indigo-800">Active Facility:</span>
            <span className="text-indigo-700">{selectedFacility.name}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : warehouses.length === 0 ? (
        <EmptyState icon="warehouse" title="No warehouses yet" description="Create your first warehouse to start managing inventory and facilities." action={<button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create Warehouse</button>} />
      ) : (
        <div className="space-y-3">
          {warehouses.map(wh => (
            <div key={wh.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer" onClick={() => toggleExpand(wh.id)}>
                <div className="flex items-center gap-3">
                  {expandWH === wh.id ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                  <Building2 size={20} className="text-blue-600" />
                  <div>
                    <div className="font-semibold">{wh.name}</div>
                    <div className="text-xs text-slate-500">{wh.location || 'No location'} · {wh.children?.length || 0} facilities</div>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setSelectedWH(wh.id); setShowFacilityModal(true); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                  <Plus size={14} /> Add Facility
                </button>
              </div>

                  {expandWH === wh.id && (
                <div className="border-t border-slate-100">
                  {wh.children?.length === 0 ? (
                    <EmptyState icon="warehouse" title="No facilities" description="Add a facility to organize inventory and orders under this warehouse." />
                  ) : wh.children.map(fac => (
                    <div key={fac.id} className={`px-4 py-3 flex items-center gap-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 ml-8 ${selectedFacility?.id === fac.id ? 'bg-indigo-50 border-indigo-200' : ''}`}>
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{fac.name}</div>
                        <div className="text-xs text-slate-400">{fac.location || '—'}</div>
                      </div>
                      <button onClick={() => setSelectedFacility({ id: fac.id, name: fac.name })} className="flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 font-medium transition-colors">
                        Load <ArrowRight size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Master View Modal */}
      {showMaster && masterView && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-3xl md:mx-4 p-5 md:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Master Warehouse View</h2>
              <button onClick={() => setShowMaster(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              {masterView.warehouses.filter(w => !w.parentId).map(wh => (
                <div key={wh.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-blue-700">{wh.name}</h3>
                  {wh.children.map(fac => {
                    const facOrders = masterView.orders.filter(o => o.warehouseId === fac.id);
                    return (
                      <div key={fac.id} className="ml-4 mt-2 p-3 bg-slate-50 rounded-lg">
                        <div className="font-medium text-sm">{fac.name}</div>
                        <div className="flex gap-4 mt-2 text-xs text-slate-600">
                          <span className="flex items-center gap-1"><Package size={14} /> {fac._count?.inventory || 0} SKUs</span>
                          <span className="flex items-center gap-1"><ShoppingCart size={14} /> {facOrders.length} orders</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Warehouse Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md md:mx-4 p-5 md:p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Add Warehouse</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mumbai Central Hub" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
                <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="e.g. Mumbai, Maharashtra" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Address</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleCreate} disabled={!form.name} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Create</button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Facility Modal */}
      {showFacilityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md md:mx-4 p-5 md:p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Add Facility</h2>
              <button onClick={() => setShowFacilityModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Facility Name *</label>
                <input type="text" value={facilityForm.name} onChange={e => setFacilityForm({ ...facilityForm, name: e.target.value })} placeholder="e.g. Section A - East Wing" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
                <input type="text" value={facilityForm.location} onChange={e => setFacilityForm({ ...facilityForm, location: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleCreateFacility} disabled={!facilityForm.name} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Create Facility</button>
              <button onClick={() => setShowFacilityModal(false)} className="px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouse;
