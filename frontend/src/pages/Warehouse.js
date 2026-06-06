import React, { useState, useEffect } from 'react';
import { Plus, X, ChevronDown, ChevronRight, Building2, Package, ShoppingCart, Eye, ArrowRight, Save, Upload, Pencil, Hash, Activity, PencilLine, Loader2 } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/EmptyState';
import { toast } from '../components/Toast';

const SECTIONS = [
  { id: 'general', label: 'General', icon: Building2 },
  { id: 'accounting', label: 'Accounting', icon: Package },
  { id: 'billing', label: 'Billing', icon: Package },
  { id: 'shipping', label: 'Shipping', icon: Package },
  { id: 'sequence', label: 'Sequence', icon: Hash },
  { id: 'activity', label: 'Activity Details', icon: Activity },
];

const emptyForm = () => ({
  name: '', code: '', type: 'Warehouse', displayName: '', partyName: '',
  websiteUrl: '', alternateCode: '', logoUrl: '', signatureUrl: '',
  isActive: true, posEnabled: false, processingCapacity: '', allowMaxLimit: false,
  operationalType: '', associatedPosChannel: '', itemSealEnabled: false,
  priority: 1, contactPerson: '', contactEmail: '', contactPhone: '',
  openingTime: '', closingTime: '', b2cTaxAddressType: 'BillingAddress',
  channelImageProcessing: false, autoPackageDimensions: false,
  pan: '', tin: '', cst: '', serviceTax: '', gstin: '',
  upiAddress: '', bankName: '', accountNumber: '', ifscCode: '',
  billingAddress1: '', billingAddress2: '', billingCity: '', billingPinCode: '',
  billingCountry: 'India', billingState: '', billingPhone: '', billingLatitude: '', billingLongitude: '',
  shippingSameAsBilling: true,
  shippingAddress1: '', shippingAddress2: '', shippingCity: '', shippingPinCode: '',
  shippingCountry: 'India', shippingState: '', shippingPhone: '', shippingLatitude: '', shippingLongitude: '',
});

const Input = ({ label, value, onChange, placeholder, required, type, disabled }) => (
  <div>
    <label className="block text-xs font-medium text-slate-500 mb-1">
      {required && <span className="text-red-500 mr-0.5">*</span>}{label}
    </label>
    {type === 'textarea' ? (
      <textarea value={value} onChange={onChange} rows={2} placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" disabled={disabled} />
    ) : (
      <input type={type || 'text'} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" disabled={disabled} />
    )}
  </div>
);

const Toggle = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs font-medium text-slate-500">{label}</span>
    <button type="button" onClick={() => onChange(!value)}
      className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
    </button>
  </div>
);

const Warehouse = () => {
  const { selectedFacility, setSelectedFacility } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [parentId, setParentId] = useState(null);
  const [activeSection, setActiveSection] = useState('general');
  const [saving, setSaving] = useState(false);
  const [selectedWH, setSelectedWH] = useState(null);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [expandWH, setExpandWH] = useState(null);
  const [masterView, setMasterView] = useState(null);
  const [showMaster, setShowMaster] = useState(false);
  const [sequences, setSequences] = useState([]);
  const [sequencesLoading, setSequencesLoading] = useState(false);
  const [sequenceEdits, setSequenceEdits] = useState({});
  const [sequenceSaving, setSequenceSaving] = useState(null);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

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

  const fetchSequences = async (whId) => {
    if (!whId) return;
    setSequencesLoading(true);
    try {
      const res = await API.get(`/warehouses/${whId}/sequences`);
      setSequences(Array.isArray(res.data) ? res.data : []);
      setSequenceEdits({});
    } catch { setSequences([]); } finally { setSequencesLoading(false); }
  };

  const fetchActivity = async (whId) => {
    if (!whId) return;
    setActivityLoading(true);
    try {
      const res = await API.get(`/warehouses/${whId}/activity`);
      setActivity(Array.isArray(res.data) ? res.data : []);
    } catch { setActivity([]); } finally { setActivityLoading(false); }
  };

  const handleSequenceEdit = (seqId, field, value) => {
    setSequenceEdits(prev => ({
      ...prev,
      [seqId]: { ...(prev[seqId] || {}), [field]: value },
    }));
  };

  const handleSaveSequence = async (seqId) => {
    const edit = sequenceEdits[seqId];
    if (!edit) return;
    setSequenceSaving(seqId);
    try {
      await API.patch(`/warehouses/${editingId}/sequences/${seqId}`, edit);
      toast.success('Sequence updated');
      await fetchSequences(editingId);
      await fetchActivity(editingId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update sequence');
    } finally { setSequenceSaving(null); }
  };

  const startEdit = async (id) => {
    await openEdit(id);
    setTimeout(() => {
      fetchSequences(id);
      fetchActivity(id);
    }, 100);
  };

  const fetchSequences = async (whId) => {
    if (!whId) return;
    setSequencesLoading(true);
    try {
      const res = await API.get(`/warehouses/${whId}/sequences`);
      setSequences(Array.isArray(res.data) ? res.data : []);
      setSequenceEdits({});
    } catch { setSequences([]); } finally { setSequencesLoading(false); }
  };

  const fetchActivity = async (whId) => {
    if (!whId) return;
    setActivityLoading(true);
    try {
      const res = await API.get(`/warehouses/${whId}/activity`);
      setActivity(Array.isArray(res.data) ? res.data : []);
    } catch { setActivity([]); } finally { setActivityLoading(false); }
  };

  const handleSequenceEdit = (seqId, field, value) => {
    setSequenceEdits(prev => ({
      ...prev,
      [seqId]: { ...(prev[seqId] || {}), [field]: value },
    }));
  };

  const handleSaveSequence = async (seqId) => {
    const edit = sequenceEdits[seqId];
    if (!edit) return;
    setSequenceSaving(seqId);
    try {
      await API.patch(`/warehouses/${editingId}/sequences/${seqId}`, edit);
      toast.success('Sequence updated');
      await fetchSequences(editingId);
      await fetchActivity(editingId);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update sequence');
    } finally { setSequenceSaving(null); }
  };

  const startEdit = async (id) => {
    await openEdit(id);
    setTimeout(() => {
      fetchSequences(id);
      fetchActivity(id);
    }, 100);
  };

  const openAdd = (whId = null) => {
    setForm(emptyForm());
    setEditingId(null);
    setParentId(whId);
    setActiveSection('general');
    setShowModal(true);
  };

  const openEdit = async (id) => {
    try {
      const res = await API.get(`/warehouses/${id}`);
      const w = res.data;
      setForm({
        isActive: w.isActive ?? true, name: w.name || '', code: w.code || '', type: w.type || 'Warehouse',
        displayName: w.displayName || '', partyName: w.partyName || '',
        websiteUrl: w.websiteUrl || '', alternateCode: w.alternateCode || '',
        logoUrl: w.logoUrl || '', signatureUrl: w.signatureUrl || '',
        posEnabled: w.posEnabled ?? false, processingCapacity: w.processingCapacity ?? '',
        allowMaxLimit: w.allowMaxLimit ?? false, operationalType: w.operationalType || '',
        associatedPosChannel: w.associatedPosChannel || '', itemSealEnabled: w.itemSealEnabled ?? false,
        priority: w.priority ?? 1, contactPerson: w.contactPerson || '', contactEmail: w.contactEmail || '',
        contactPhone: w.contactPhone || '', openingTime: w.openingTime || '', closingTime: w.closingTime || '',
        b2cTaxAddressType: w.b2cTaxAddressType || 'BillingAddress',
        channelImageProcessing: w.channelImageProcessing ?? false, autoPackageDimensions: w.autoPackageDimensions ?? false,
        pan: w.pan || '', tin: w.tin || '', cst: w.cst || '', serviceTax: w.serviceTax || '', gstin: w.gstin || '',
        upiAddress: w.upiAddress || '', bankName: w.bankName || '', accountNumber: w.accountNumber || '', ifscCode: w.ifscCode || '',
        billingAddress1: w.billingAddress1 || '', billingAddress2: w.billingAddress2 || '',
        billingCity: w.billingCity || '', billingPinCode: w.billingPinCode || '',
        billingCountry: w.billingCountry || 'India', billingState: w.billingState || '',
        billingPhone: w.billingPhone || '', billingLatitude: w.billingLatitude || '', billingLongitude: w.billingLongitude || '',
        shippingSameAsBilling: w.shippingSameAsBilling ?? true,
        shippingAddress1: w.shippingAddress1 || '', shippingAddress2: w.shippingAddress2 || '',
        shippingCity: w.shippingCity || '', shippingPinCode: w.shippingPinCode || '',
        shippingCountry: w.shippingCountry || 'India', shippingState: w.shippingState || '',
        shippingPhone: w.shippingPhone || '', shippingLatitude: w.shippingLatitude || '', shippingLongitude: w.shippingLongitude || '',
      });
      setEditingId(id);
      setParentId(w.parentId || null);
      setActiveSection('general');
      setShowModal(true);
      fetchSequences(id);
      fetchActivity(id);
    } catch {
      toast.error('Failed to load facility');
    }
  };

  const handleSaveFacility = async () => {
    if (!form.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        processingCapacity: form.processingCapacity ? Number(form.processingCapacity) : null,
        priority: Number(form.priority) || 1,
      };
      if (editingId) {
        await API.put(`/warehouses/${editingId}`, payload);
        toast.success('Facility updated');
      } else {
        if (parentId) {
          await API.post(`/warehouses/${parentId}/facilities`, payload);
        } else {
          await API.post('/warehouses', payload);
        }
        toast.success('Facility created');
      }
      setShowModal(false);
      fetchWarehouses();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
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

  const toggleActive = async (id, current) => {
    try {
      await API.put(`/warehouses/${id}`, { isActive: !current });
      toast.success(`Facility ${!current ? 'activated' : 'deactivated'}`);
      fetchWarehouses();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const up = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const upBool = (field) => (v) => setForm({ ...form, [field]: v });
  const [facilityForm, setFacilityForm] = useState({ name: '', location: '', address: '' });

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Warehouse & Facilities</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={fetchMasterView} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium w-full sm:w-auto">
            <Eye size={16} /> Master View
          </button>
          <button onClick={() => openAdd(null)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium w-full sm:w-auto">
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
        <EmptyState icon="warehouse" title="No warehouses yet" description="Create your first warehouse to start managing inventory and facilities."
          action={<button onClick={() => openAdd(null)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Create Warehouse</button>} />
      ) : (
        <div className="space-y-3">
          {warehouses.map(wh => (
            <div key={wh.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${wh.isActive === false ? 'border-slate-300 opacity-60' : 'border-slate-200'}`}>
              <div className="p-4 flex items-center justify-between hover:bg-slate-50 cursor-pointer" onClick={() => toggleExpand(wh.id)}>
                <div className="flex items-center gap-3">
                  {expandWH === wh.id ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                  <Building2 size={20} className={wh.isActive === false ? 'text-slate-400' : 'text-blue-600'} />
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {wh.displayName || wh.name}
                      {wh.isActive === false && <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Inactive</span>}
                    </div>
                    <div className="text-xs text-slate-500">{wh.code || wh.location || 'No code'} &middot; {wh.children?.length || 0} facilities</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={(e) => { e.stopPropagation(); toggleActive(wh.id, wh.isActive); }}
                    className={`text-[10px] font-medium px-2 py-1 rounded ${wh.isActive === false ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}>
                    {wh.isActive === false ? 'Enable' : 'Disable'}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); openEdit(wh.id); }} className="text-xs text-slate-500 hover:text-blue-600 p-1"><Pencil size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedWH(wh.id); setShowFacilityModal(true); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                    <Plus size={14} /> Add Facility
                  </button>
                </div>
              </div>
              {expandWH === wh.id && (
                <div className="border-t border-slate-100">
                  {wh.children?.length === 0 ? (
                    <EmptyState icon="warehouse" title="No facilities" description="Add a facility to organize inventory and orders under this warehouse." />
                  ) : wh.children.map(fac => (
                    <div key={fac.id} className={`px-4 py-3 flex items-center gap-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 ml-8 ${fac.isActive === false ? 'opacity-50' : ''} ${selectedFacility?.id === fac.id ? 'bg-indigo-50 border-indigo-200' : ''}`}>
                      <div className={`w-2 h-2 rounded-full ${fac.isActive === false ? 'bg-slate-300' : 'bg-green-400'}`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium flex items-center gap-2">
                          {fac.displayName || fac.name}
                          {fac.isActive === false && <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Inactive</span>}
                        </div>
                        <div className="text-xs text-slate-400">{fac.code || fac.location || '\u2014'}</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); toggleActive(fac.id, fac.isActive); }}
                        className={`text-[10px] font-medium px-2 py-1 rounded ${fac.isActive === false ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-red-600 bg-red-50 hover:bg-red-100'}`}>
                        {fac.isActive === false ? 'Enable' : 'Disable'}
                      </button>
                      <button onClick={() => openEdit(fac.id)} className="text-xs text-slate-400 hover:text-blue-600 p-1"><Pencil size={14} /></button>
                      <button onClick={() => setSelectedFacility({ id: fac.id, name: fac.name })} disabled={fac.isActive === false} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${fac.isActive === false ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
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

      {/* Add Facility Quick Modal */}
      {showFacilityModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md md:mx-4 p-5 md:p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Add Facility</h2>
              <button onClick={() => setShowFacilityModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <Input label="Facility Name" required value={facilityForm.name} onChange={e => setFacilityForm({ ...facilityForm, name: e.target.value })} placeholder="e.g. Section A - East Wing" />
              <Input label="Location" value={facilityForm.location} onChange={e => setFacilityForm({ ...facilityForm, location: e.target.value })} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleCreateFacility} disabled={!facilityForm.name} className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">Create</button>
              <button onClick={() => setShowFacilityModal(false)} className="px-4 py-2.5 border rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Full Facility Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-4xl md:mx-4 max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h2 className="text-lg font-bold">{editingId ? 'Edit Facility' : parentId ? 'Add Facility' : 'Add Warehouse'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={20} /></button>
            </div>

            <div className="flex border-b border-slate-200 shrink-0 overflow-x-auto">
              {SECTIONS.map(s => (
                <button key={s.id} onClick={() => setActiveSection(s.id)}
                  className={`px-5 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeSection === s.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* General Details */}
              {activeSection === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">General Details</h3>
                    <p className="text-xs text-slate-400 mb-4">Enter basic warehouse details and upload logo image file to be used on invoice</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Code" placeholder="eg: SURYA" value={form.code} onChange={up('code')} />
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                      <select value={form.type} onChange={up('type')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option>Warehouse</option>
                        <option>Store</option>
                        <option>Distribution Center</option>
                        <option>Pickup Point</option>
                      </select>
                    </div>
                    <Input label="Display Name" placeholder="eg: Surya Enterprises" value={form.displayName} onChange={up('displayName')} />
                    <Input label="Party Name" placeholder="eg: Surya Enterprises" value={form.partyName} onChange={up('partyName')} />
                    <Input label="Website URL" placeholder="www.google.com" value={form.websiteUrl} onChange={up('websiteUrl')} />
                    <Input label="Alternate Code" placeholder="eg: SURYA" value={form.alternateCode} onChange={up('alternateCode')} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Logo <span className="text-slate-300">(PNG JPEG JPG)</span></label>
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center text-xs text-slate-400 hover:border-blue-400 cursor-pointer">
                        <Upload size={20} className="mx-auto mb-1 text-slate-300" />
                        Click to upload
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Signature <span className="text-slate-300">(PNG JPEG JPG)</span></label>
                      <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center text-xs text-slate-400 hover:border-blue-400 cursor-pointer">
                        <Upload size={20} className="mx-auto mb-1 text-slate-300" />
                        Click to upload
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Toggle label="Active / Enabled" value={form.isActive} onChange={upBool('isActive')} />
                    <Toggle label="POS Enabled" value={form.posEnabled} onChange={upBool('posEnabled')} />
                    <Toggle label="Allow Maximum Limit" value={form.allowMaxLimit} onChange={upBool('allowMaxLimit')} />
                    <Input label="Processing Capacity" type="number" placeholder="Enter Processing Capacity" value={form.processingCapacity} onChange={up('processingCapacity')} />
                    <Input label="Operational Type" placeholder="Enter Operational Type" value={form.operationalType} onChange={up('operationalType')} />
                    <Input label="Associated POS Channel" placeholder="Enter Associated POS Channel" value={form.associatedPosChannel} onChange={up('associatedPosChannel')} />
                    <Toggle label="Item Seal Enabled" value={form.itemSealEnabled} onChange={upBool('itemSealEnabled')} />
                    <Input label="Priority" type="number" value={form.priority} onChange={up('priority')} />
                  </div>

                  <div className="border-t border-slate-200 pt-6">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">Contact Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input label="Contact Person Name" placeholder="Alok" value={form.contactPerson} onChange={up('contactPerson')} />
                      <Input label="Contact Person Email" placeholder="alok@example.com" value={form.contactEmail} onChange={up('contactEmail')} />
                      <Input label="Contact Person Phone" placeholder="9311931908" value={form.contactPhone} onChange={up('contactPhone')} />
                      <Input label="Opening Time (24h)" placeholder="HH:MM" value={form.openingTime} onChange={up('openingTime')} />
                      <Input label="Closing Time (24h)" placeholder="HH:MM" value={form.closingTime} onChange={up('closingTime')} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Taxable Address Type for B2C</label>
                      <select value={form.b2cTaxAddressType} onChange={up('b2cTaxAddressType')} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                        <option>BillingAddress</option>
                        <option>ShippingAddress</option>
                      </select>
                    </div>
                    <Toggle label="Channel Product Image Assisted Processing" value={form.channelImageProcessing} onChange={upBool('channelImageProcessing')} />
                    <Toggle label="Auto Populate Shipping Package Dimensions" value={form.autoPackageDimensions} onChange={upBool('autoPackageDimensions')} />
                  </div>
                </div>
              )}

              {/* Accounting Details */}
              {activeSection === 'accounting' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">Accounting Details</h3>
                    <p className="text-xs text-slate-400 mb-4">Specify tax registration numbers and prefix for invoice series</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="PAN" placeholder="Enter PAN" value={form.pan} onChange={up('pan')} />
                    <Input label="TIN" placeholder="Enter TIN" value={form.tin} onChange={up('tin')} />
                    <Input label="Central Sale Tax (CST)" placeholder="Enter Central Sale Tax" value={form.cst} onChange={up('cst')} />
                    <Input label="Service Tax" placeholder="Enter Service Tax" value={form.serviceTax} onChange={up('serviceTax')} />
                    <Input label="GSTIN" placeholder="07AAHCI3479D1ZI" value={form.gstin} onChange={up('gstin')} />
                    <Input label="UPI Address" placeholder="Enter UPI Address" value={form.upiAddress} onChange={up('upiAddress')} />
                    <Input label="Bank Name" placeholder="Enter Bank Name" value={form.bankName} onChange={up('bankName')} />
                    <Input label="Account Number" placeholder="Enter Account Number" value={form.accountNumber} onChange={up('accountNumber')} />
                    <Input label="IFSC Code" placeholder="Enter IFSC Code" value={form.ifscCode} onChange={up('ifscCode')} />
                  </div>
                </div>
              )}

              {/* Billing Address */}
              {activeSection === 'billing' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">Billing Address</h3>
                    <p className="text-xs text-slate-400 mb-4">Configure the billing address of the warehouse</p>
                  </div>
                  <div className="space-y-4">
                    <Input label="Address Line 1" required value={form.billingAddress1} onChange={up('billingAddress1')} placeholder="Enter Address Line 1" />
                    <Input label="Address Line 2" value={form.billingAddress2} onChange={up('billingAddress2')} placeholder="Enter Address Line 2" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input label="City" required value={form.billingCity} onChange={up('billingCity')} placeholder="Enter City" />
                      <Input label="Pin Code" required value={form.billingPinCode} onChange={up('billingPinCode')} placeholder="Enter Pin Code" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input label="Country" value={form.billingCountry} onChange={up('billingCountry')} placeholder="India" />
                      <Input label="State" required value={form.billingState} onChange={up('billingState')} placeholder="Enter State" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input label="Phone" value={form.billingPhone} onChange={up('billingPhone')} placeholder="Enter Phone" />
                      <Input label="Latitude" value={form.billingLatitude} onChange={up('billingLatitude')} placeholder="Enter Latitude" />
                      <Input label="Longitude" value={form.billingLongitude} onChange={up('billingLongitude')} placeholder="Enter Longitude" />
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {activeSection === 'shipping' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">Shipping Address</h3>
                    <p className="text-xs text-slate-400 mb-4">Configure the shipping address of the warehouse</p>
                  </div>
                  <Toggle label="Same as Billing Address" value={form.shippingSameAsBilling} onChange={upBool('shippingSameAsBilling')} />
                  {!form.shippingSameAsBilling && (
                    <div className="space-y-4">
                      <Input label="Address Line 1" required value={form.shippingAddress1} onChange={up('shippingAddress1')} placeholder="Enter Address Line 1" />
                      <Input label="Address Line 2" value={form.shippingAddress2} onChange={up('shippingAddress2')} placeholder="Enter Address Line 2" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="City" required value={form.shippingCity} onChange={up('shippingCity')} placeholder="Enter City" />
                        <Input label="Pin Code" required value={form.shippingPinCode} onChange={up('shippingPinCode')} placeholder="Enter Pin Code" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Country" value={form.shippingCountry} onChange={up('shippingCountry')} placeholder="India" />
                        <Input label="State" required value={form.shippingState} onChange={up('shippingState')} placeholder="Enter State" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Input label="Phone" value={form.shippingPhone} onChange={up('shippingPhone')} placeholder="Enter Phone" />
                        <Input label="Latitude" value={form.shippingLatitude} onChange={up('shippingLatitude')} placeholder="Enter Latitude" />
                        <Input label="Longitude" value={form.shippingLongitude} onChange={up('shippingLongitude')} placeholder="Enter Longitude" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sequence */}
              {activeSection === 'sequence' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">Sequence</h3>
                    <p className="text-xs text-slate-400 mb-4">Configure number sequences used to generate serial numbers for invoices, gatepasses, manifests and other facility documents.</p>
                  </div>
                  {sequencesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
                      <Loader2 size={16} className="animate-spin" /> Loading sequences...
                    </div>
                  ) : sequences.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">No sequences configured</div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Sequence Name</th>
                            <th className="px-3 py-2 font-semibold">Description</th>
                            <th className="px-3 py-2 font-semibold w-24">Prefix</th>
                            <th className="px-3 py-2 font-semibold w-24">Current Value</th>
                            <th className="px-3 py-2 font-semibold w-28">Next Year Prefix</th>
                            <th className="px-3 py-2 font-semibold w-28 text-center">Reset Counter</th>
                            <th className="px-3 py-2 font-semibold w-16"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sequences.map(seq => {
                            const edit = sequenceEdits[seq.id] || {};
                            const hasChanges = Object.keys(edit).length > 0;
                            return (
                              <tr key={seq.id} className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-mono text-[11px] font-semibold text-slate-700">{seq.sequenceName}</td>
                                <td className="px-3 py-2 text-slate-500 max-w-xs">
                                  <input
                                    value={edit.description ?? seq.description ?? ''}
                                    onChange={e => handleSequenceEdit(seq.id, 'description', e.target.value)}
                                    className="w-full px-2 py-1 border border-transparent hover:border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded text-[11px] bg-transparent focus:bg-white outline-none"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    value={edit.prefix ?? seq.prefix ?? ''}
                                    onChange={e => handleSequenceEdit(seq.id, 'prefix', e.target.value)}
                                    className="w-full px-2 py-1 border border-slate-200 rounded text-[11px] font-mono text-center focus:ring-1 focus:ring-blue-400 outline-none"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="number"
                                    value={edit.currentValue ?? seq.currentValue}
                                    onChange={e => handleSequenceEdit(seq.id, 'currentValue', e.target.value)}
                                    className="w-full px-2 py-1 border border-slate-200 rounded text-[11px] text-center focus:ring-1 focus:ring-blue-400 outline-none"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    value={edit.nextYearPrefix ?? seq.nextYearPrefix ?? ''}
                                    onChange={e => handleSequenceEdit(seq.id, 'nextYearPrefix', e.target.value)}
                                    className="w-full px-2 py-1 border border-slate-200 rounded text-[11px] font-mono text-center focus:ring-1 focus:ring-blue-400 outline-none"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleSequenceEdit(seq.id, 'resetCounterNextYear', !(edit.resetCounterNextYear ?? seq.resetCounterNextYear))}
                                    className={`relative w-9 h-4 rounded-full transition-colors ${(edit.resetCounterNextYear ?? seq.resetCounterNextYear) ? 'bg-blue-600' : 'bg-slate-300'}`}
                                  >
                                    <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${(edit.resetCounterNextYear ?? seq.resetCounterNextYear) ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                  </button>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {hasChanges && (
                                    <button
                                      onClick={() => handleSaveSequence(seq.id)}
                                      disabled={sequenceSaving === seq.id}
                                      className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-medium hover:bg-blue-700 disabled:opacity-50"
                                    >
                                      {sequenceSaving === seq.id ? <Loader2 size={10} className="animate-spin" /> : 'Save'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Activity Details */}
              {activeSection === 'activity' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-1">Activity Details</h3>
                    <p className="text-xs text-slate-400 mb-4">History of changes made to this facility's configuration.</p>
                  </div>
                  {activityLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 py-8 justify-center">
                      <Loader2 size={16} className="animate-spin" /> Loading activity...
                    </div>
                  ) : activity.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">No activity recorded yet</div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <ul className="divide-y divide-slate-100">
                        {activity.map(log => (
                          <li key={log.id} className="p-3 md:p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <p className="text-sm text-slate-700 flex-1">{log.description}</p>
                              <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap shrink-0">
                                {new Date(log.timestamp).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">
                              <span className="font-mono">{log.userEmail || 'system'}</span>
                              {log.field && <span className="text-slate-300"> &middot; </span>}
                              {log.field && <span className="text-slate-400">{log.field}</span>}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
              <button onClick={handleSaveFacility} disabled={saving || !form.name} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                <Save size={16} /> {saving ? 'Saving...' : editingId ? 'Update Facility' : 'Create Facility'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Warehouse;