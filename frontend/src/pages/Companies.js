import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Search, X, Check, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';

const Companies = () => {
  const { refreshCompanies } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', slug: '' });
  const [adminForm, setAdminForm] = useState({ email: '', password: '', fullName: '' });

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/tenants');
      setCompanies(Array.isArray(res.data) ? res.data : []);
    } catch { setCompanies([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const resetForm = () => {
    setForm({ id: '', name: '', slug: '' });
    setAdminForm({ email: '', password: '', fullName: '' });
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (c) => {
    setForm({ id: c.id, name: c.name, slug: c.slug });
    setEditId(c.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.id.trim() || !form.slug.trim()) return toast.error('ID, Name, and Slug are required');
    setSubmitting(true);
    try {
      if (editId) {
        const res = await API.put(`/tenants/${editId}`, { name: form.name, slug: form.slug });
        setCompanies(prev => prev.map(c => c.id === editId ? res.data : c));
        toast.success('Company updated');
      } else {
        const payload = { ...form };
        if (adminForm.email && adminForm.password) {
          payload.adminEmail = adminForm.email;
          payload.adminPassword = adminForm.password;
          payload.adminName = adminForm.fullName;
        }
        const res = await API.post('/tenants', payload);
        setCompanies(prev => [res.data, ...prev]);
        if (res.data.adminEmail) {
          toast.success(`Company created. Initial admin: ${res.data.adminEmail} / ${res.data.adminPassword}`);
        } else {
          toast.success('Company created');
        }
      }
      setShowModal(false);
      resetForm();
      refreshCompanies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally { setSubmitting(false); }
  };

  const toggleActive = async (c) => {
    try {
      const res = await API.put(`/tenants/${c.id}`, { isActive: !c.isActive });
      setCompanies(prev => prev.map(x => x.id === c.id ? res.data : x));
      toast.success(`Company ${res.data.isActive ? 'enabled' : 'disabled'}`);
      refreshCompanies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle');
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete company "${c.name}"? This cannot be undone.`)) return;
    try {
      await API.delete(`/tenants/${c.id}`);
      setCompanies(prev => prev.filter(x => x.id !== c.id));
      toast.success('Company deleted');
      refreshCompanies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toLowerCase().includes(search.toLowerCase()) ||
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Companies</h1>
          <p className="text-sm text-slate-500">Manage companies/tenants in the system</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          <Plus size={16} /> Add Company
        </button>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text" placeholder="Search companies..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {loading ? <TableSkeleton rows={5} /> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="text-left px-4 py-3 font-medium">ID</th>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Slug</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">No companies found</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.id}</td>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{c.slug}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {c.isActive ? <Check size={12} /> : <X size={12} />}
                        {c.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => toggleActive(c)} title={c.isActive ? 'Disable' : 'Enable'} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700">
                          {c.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>
                        <button onClick={() => openEdit(c)} title="Edit" className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 hover:text-blue-700">
                          <Building2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(c)} title="Delete" className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 hover:text-red-700">
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            {filtered.length} company{filtered.length !== 1 && 'ies'}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !submitting && setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">{editId ? 'Edit Company' : 'Add Company'}</h2>
              <button onClick={() => { if (!submitting) { setShowModal(false); resetForm(); } }} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tenant ID</label>
                <input
                  type="text" required disabled={!!editId}
                  value={form.id} onChange={e => setForm({ ...form, id: e.target.value.replace(/\s/g, '-').toLowerCase() })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
                  placeholder="e.g. tenant-6"
                />
                {!editId && <p className="text-xs text-slate-400 mt-1">Unique identifier, auto-lowercased</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
                <input
                  type="text" required
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. My Company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
                <input
                  type="text" required
                  value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.replace(/\s/g, '').toLowerCase() })}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. mycompany"
                />
                <p className="text-xs text-slate-400 mt-1">Used for subdomain routing (e.g. mycompany.app.globalsupply.in)</p>
              </div>
              {!editId && (
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Initial Admin User (optional)</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. admin@leosales.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                      <input
                        type="text"
                        value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. admin123"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name (optional)</label>
                      <input
                        type="text"
                        value={adminForm.fullName} onChange={e => setAdminForm({ ...adminForm, fullName: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Leo Sales Admin"
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {editId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Companies;
