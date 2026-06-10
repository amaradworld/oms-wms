import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Search, X, Check, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { TableSkeleton } from '../components/Skeleton';

const MENU_CATALOG = [
  { id: 'dashboard', label: 'Dashboard', children: ['dashboard'] },
  {
    id: 'order-management', label: 'Order Management',
    children: ['orders', 'returns', 'waves', 'packing', 'manifests', 'ndr'],
  },
  {
    id: 'warehouse-ops', label: 'Warehouse Operations',
    children: ['warehouse', 'scanning', 'mobile-scan'],
  },
  {
    id: 'inventory-stock', label: 'Inventory & Stock Control',
    children: ['inventory', 'cyclecount', 'inventory-alerts', 'sku-history', 'stock-expiry', 'replenishment', 'batch-trace'],
  },
  {
    id: 'inbound-supply', label: 'Inbound & Supply Chain',
    children: ['purchaseorders', 'asn', 'grn', 'putaway'],
  },
  {
    id: 'outbound', label: 'Outbound',
    children: ['gatepass', 'stocktransfer', 'gatepass-order'],
  },
  {
    id: 'administration', label: 'Administration',
    children: ['sku-master', 'integrations', 'parties', 'companies', 'leads', 'courier-routing', 'marketplace', 'analytics', 'productivity', 'bins', 'audit-logs', 'reports-ftp', 'invitation-mail', 'settings'],
  },
];

const MenuSelector = ({ value, onChange }) => {
  const selected = new Set(Array.isArray(value) ? value : []);

  const allLeafIds = MENU_CATALOG.flatMap(g => g.children);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  const toggleGroup = (group) => {
    const kids = group.children || [];
    const next = new Set(selected);
    const allSelected = kids.every(c => next.has(c));
    if (allSelected) kids.forEach(c => next.delete(c));
    else kids.forEach(c => next.add(c));
    onChange(Array.from(next));
  };

  const toggleAll = () => {
    if (selected.size === allLeafIds.length) onChange([]);
    else onChange([...allLeafIds]);
  };

  const allSelected = selected.size === allLeafIds.length;
  const someSelected = selected.size > 0 && !allSelected;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={toggleAll}
          className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${
            allSelected ? 'bg-blue-100 text-blue-700' : someSelected ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
        <span className="text-xs text-slate-400">{selected.size}/{allLeafIds.length} menus</span>
      </div>
      {MENU_CATALOG.map(group => {
        const kids = group.children || [];
        const groupSelected = kids.length > 0 && kids.every(c => selected.has(c));
        const groupPartial = kids.some(c => selected.has(c)) && !groupSelected;
        return (
          <div key={group.id} className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => toggleGroup(group)}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                groupSelected ? 'bg-blue-600 border-blue-600' : groupPartial ? 'bg-blue-200 border-blue-400' : 'border-slate-300'
              }`}>
                {groupSelected && <Check size={10} className="text-white" />}
                {groupPartial && <div className="w-2 h-0.5 bg-blue-600 rounded" />}
              </div>
              <span className="text-sm font-medium text-slate-700">{group.label}</span>
            </div>
            <div className="px-3 py-2 space-y-1.5 border-t border-slate-100">
              {kids.map(childId => (
                <label key={childId} className="flex items-center gap-2 cursor-pointer py-0.5 group">
                  <input
                    type="checkbox"
                    checked={selected.has(childId)}
                    onChange={() => toggle(childId)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors">{childId}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

class CompaniesErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error('Companies error:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 md:p-6 max-w-6xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-medium mb-2">Companies module hit an error</p>
            <p className="text-sm text-red-600 mb-4">{String(this.state.error?.message || 'Unknown error')}</p>
            <button onClick={() => this.setState({ hasError: false, error: null })} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Try Again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const safeStr = (v) => (v == null ? '' : String(v));

const CompaniesInner = () => {
  const { refreshCompanies } = useAuth();
  const confirm = useConfirm();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ id: '', name: '', slug: '' });
  const [adminForm, setAdminForm] = useState({ email: '', password: '', fullName: '' });
  const [menuAccess, setMenuAccess] = useState(null);
  const [createdCreds, setCreatedCreds] = useState(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/tenants');
      const data = Array.isArray(res.data) ? res.data.filter(c => c && typeof c === 'object' && c.id) : [];
      setCompanies(data);
    } catch (e) {
      console.error('Failed to fetch companies:', e);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const resetForm = () => {
    setForm({ id: '', name: '', slug: '' });
    setAdminForm({ email: '', password: '', fullName: '' });
    setMenuAccess(null);
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (c) => {
    if (!c) return;
    setForm({ id: c.id || '', name: c.name || '', slug: c.slug || '' });
    const ma = c.menuAccess;
    setMenuAccess(Array.isArray(ma) ? ma : null);
    setEditId(c.id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.id.trim() || !form.slug.trim()) return toast.error('ID, Name, and Slug are required');
    setSubmitting(true);
    try {
      if (editId) {
        const payload = { name: form.name, slug: form.slug };
        if (menuAccess !== null) payload.menuAccess = menuAccess;
        const res = await API.put(`/tenants/${editId}`, payload);
        if (res.data && res.data.id) {
          setCompanies(prev => prev.map(c => c.id === editId ? res.data : c));
        }
        toast.success('Company updated');
      } else {
        const payload = { id: form.id.trim(), name: form.name.trim(), slug: form.slug.trim() };
        if (menuAccess !== null) payload.menuAccess = menuAccess;
        if (adminForm.email && adminForm.password) {
          payload.adminEmail = adminForm.email;
          payload.adminPassword = adminForm.password;
          payload.adminName = adminForm.fullName;
        }
        const res = await API.post('/tenants', payload);
        if (res.data && res.data.id) {
          setCompanies(prev => [res.data, ...prev]);
          if (res.data.adminEmail) {
            setCreatedCreds({ email: res.data.adminEmail, password: res.data.adminPassword || '', company: form.name });
          } else {
            toast.success('Company created');
          }
        } else {
          toast.success('Company created');
          fetchCompanies();
        }
      }
      setShowModal(false);
      resetForm();
      try { refreshCompanies(); } catch (_) {}
    } catch (err) {
      console.error('Company save error:', err);
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally { setSubmitting(false); }
  };

  const toggleActive = async (c) => {
    if (!c || !c.id) return;
    try {
      const res = await API.put(`/tenants/${c.id}`, { isActive: !c.isActive });
      if (res.data && res.data.id) {
        setCompanies(prev => prev.map(x => x.id === c.id ? res.data : x));
        toast.success(`Company ${res.data.isActive ? 'enabled' : 'disabled'}`);
      }
      try { refreshCompanies(); } catch (_) {}
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle');
    }
  };

  const handleDelete = async (c) => {
    if (!c || !c.id) return;
    const cName = c.name || c.id;
    try {
      const confirmed = await confirm({
        title: `Delete "${cName}"?`,
        message: `This will permanently delete the tenant, all its users, warehouses, orders, inventory, and history. This CANNOT be undone. Type the company name to confirm.`,
        confirmText: 'Delete permanently',
        variant: 'danger',
        requireText: cName,
      });
      if (!confirmed) return;
      await API.delete(`/tenants/${c.id}`);
      setCompanies(prev => prev.filter(x => x.id !== c.id));
      toast.success('Company deleted');
      try { refreshCompanies(); } catch (_) {}
    } catch (err) {
      if (err) toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const searchLower = (search || '').toLowerCase();
  const filtered = (companies || []).filter(c => {
    if (!c) return false;
    return safeStr(c.name).toLowerCase().includes(searchLower) ||
      safeStr(c.id).toLowerCase().includes(searchLower) ||
      safeStr(c.slug).toLowerCase().includes(searchLower);
  });

  const getMenusLabel = (c) => {
    const ma = c?.menuAccess;
    if (Array.isArray(ma)) return `${ma.length} menus`;
    return 'All';
  };

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
                  <th className="text-left px-4 py-3 font-medium">Menus</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">No companies found</td></tr>
                ) : filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{safeStr(c.id)}</td>
                    <td className="px-4 py-3 font-medium">{safeStr(c.name)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{safeStr(c.slug)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">{getMenusLabel(c)}</span>
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
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
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
                        placeholder="e.g. admin@company.com"
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
                        placeholder="e.g. Company Admin"
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm font-medium text-slate-700 mb-1">Menu Access</p>
                <p className="text-xs text-slate-400 mb-3">Leave all selected for full access. Deselect menus to restrict this company.</p>
                <MenuSelector value={menuAccess} onChange={setMenuAccess} />
              </div>
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

      {createdCreds && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold">Company Created</h2>
              <p className="text-sm text-slate-500 mt-1">One-time credentials for <strong>{safeStr(createdCreds.company)}</strong></p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 space-y-3 mb-6">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-0.5">Email</label>
                <p className="font-mono text-sm font-medium text-slate-900 bg-white px-3 py-2 rounded-lg border select-all">{safeStr(createdCreds.email)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-0.5">Password</label>
                <p className="font-mono text-sm font-medium text-slate-900 bg-white px-3 py-2 rounded-lg border select-all">{safeStr(createdCreds.password)}</p>
              </div>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4 text-center">
              These credentials will not be shown again. Copy them now.
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`Email: ${safeStr(createdCreds.email)}\nPassword: ${safeStr(createdCreds.password)}`);
                toast.success('Credentials copied');
                setCreatedCreds(null);
                setShowModal(false);
                resetForm();
              }}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Copy & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Companies = () => (
  <CompaniesErrorBoundary>
    <CompaniesInner />
  </CompaniesErrorBoundary>
);

export default Companies;
