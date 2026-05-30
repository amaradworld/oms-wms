import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Search, X, Check, Loader2, Smartphone, Mail, MapPin, User, Hash, FileText, Download } from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';
import ImportButton from '../components/ImportButton';

const SAMPLE_CSV = `code,name,contactPerson,email,phone,address,gstin
VENDOR01,Acme Corp,John Doe,john@acme.com,+919876543210,123 Industrial Area New Delhi,07AAAAA0000A1Z5
VENDOR02,Beta Supplies,Jane Smith,jane@beta.com,+919812345678,456 Sector 21 Gurgaon,06BBBBB1111B2Z6`;

const Parties = () => {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', contactPerson: '', email: '', phone: '', address: '', gstin: '' });

  const fetchParties = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/suppliers');
      setParties(Array.isArray(res.data) ? res.data : []);
    } catch { setParties([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchParties(); }, [fetchParties]);

  const resetForm = () => {
    setForm({ code: '', name: '', contactPerson: '', email: '', phone: '', address: '', gstin: '' });
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (p) => {
    setForm({ code: p.code || '', name: p.name || '', contactPerson: p.contactPerson || '', email: p.email || '', phone: p.phone || '', address: p.address || '', gstin: p.gstin || '' });
    setEditId(p.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Party name is required');
    setSubmitting(true);
    try {
      if (editId) {
        const res = await API.put(`/suppliers/${editId}`, form);
        setParties(prev => prev.map(p => p.id === editId ? res.data : p));
        toast.success('Party updated');
      } else {
        const res = await API.post('/suppliers', form);
        setParties(prev => [res.data, ...prev]);
        toast.success('Party created');
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save party');
    } finally { setSubmitting(false); }
  };

  const toggleActive = async (p) => {
    try {
      const res = await API.put(`/suppliers/${p.id}`, { isActive: !p.isActive });
      setParties(prev => prev.map(x => x.id === p.id ? res.data : x));
      toast.success(res.data.isActive ? 'Party enabled' : 'Party disabled');
    } catch { toast.error('Failed to toggle status'); }
  };

  const filtered = parties.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.code?.toLowerCase().includes(search.toLowerCase()) ||
    p.contactPerson?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Building2 size={24} /> Party Master
        </h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9 py-2 text-sm w-48 md:w-64" placeholder="Search by name or code..." />
          </div>
          <button onClick={() => { const a = document.createElement('a'); const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' }); a.href = URL.createObjectURL(blob); a.download = 'parties-sample.csv'; a.click(); URL.revokeObjectURL(a.href); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors">
            <Download size={15} /> Sample
          </button>
          <ImportButton label="Parties" endpoint="suppliers" onSuccess={fetchParties} />
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2">
            <Plus size={16} /> Add Party
          </button>
        </div>
      </div>

      {loading ? <TableSkeleton rows={6} cols={6} /> : filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <Building2 size={48} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">{search ? 'No parties match your search' : 'No parties yet'}</p>
          {!search && <p className="text-sm mt-1">Add vendors, suppliers, and partners for Gatepass Orders and POs.</p>}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="table-header">Code</th>
                  <th className="table-header">Name</th>
                  <th className="table-header">Contact</th>
                  <th className="table-header">Phone</th>
                  <th className="table-header">GSTIN</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell font-mono text-xs font-medium">{p.code || '—'}</td>
                    <td className="table-cell font-medium">{p.name}</td>
                    <td className="table-cell text-sm text-slate-600">
                      {p.contactPerson && <span className="flex items-center gap-1"><User size={12} />{p.contactPerson}</span>}
                      {p.email && <span className="flex items-center gap-1 text-xs text-slate-400 mt-0.5"><Mail size={10} />{p.email}</span>}
                    </td>
                    <td className="table-cell text-sm">{p.phone || '—'}</td>
                    <td className="table-cell font-mono text-xs">{p.gstin || '—'}</td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {p.isActive ? <Check size={10} /> : <X size={10} />}
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                        <button onClick={() => toggleActive(p)} className={`text-xs font-medium ${p.isActive ? 'text-amber-600 hover:text-amber-800' : 'text-emerald-600 hover:text-emerald-800'}`}>
                          {p.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t text-xs text-slate-400 text-center">
            {filtered.length} {filtered.length === 1 ? 'party' : 'parties'}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => { if (!submitting) { setShowModal(false); resetForm(); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Building2 size={20} /> {editId ? 'Edit Party' : 'Add Party'}
              </h3>
              <button onClick={() => { if (!submitting) { setShowModal(false); resetForm(); } }} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><Hash size={12} /> Code</label>
                  <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="input-field" placeholder="VENDOR01" />
                  <p className="text-[10px] text-slate-400 mt-0.5">Used as "To Party" in Gatepass CSV</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><Building2 size={12} /> Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="input-field" placeholder="Acme Corp" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><User size={12} /> Contact Person</label>
                  <input value={form.contactPerson} onChange={e => setForm({ ...form, contactPerson: e.target.value })} className="input-field" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><Mail size={12} /> Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" placeholder="john@acme.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><Smartphone size={12} /> Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field" placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><FileText size={12} /> GSTIN</label>
                  <input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value })} className="input-field" placeholder="22AAAAA0000A1Z5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1"><MapPin size={12} /> Address</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} className="input-field" placeholder="123 Main St, City, State" />
              </div>

              <div className="flex gap-3 pt-2">
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

export default Parties;
