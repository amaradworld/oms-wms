import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Users, Key, Bell, Download, Clock, Save, Lock, Eye, EyeOff, Check, X, UserPlus, Loader2, Shield, Smartphone } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';

const TABS = [
  { id: 'profile', label: 'Profile', icon: Building2 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'security', label: 'Security', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'data', label: 'Data', icon: Download },
  { id: 'audit', label: 'Audit Log', icon: Clock },
];

const Settings = () => {
  const { user, company } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editUserId, setEditUserId] = useState(null);
  const [editForm, setEditForm] = useState({ role: '', warehouseId: '' });
  const [savingId, setSavingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', password: '', fullName: '', role: 'PICKER', warehouseId: '' });
  const [addingUser, setAddingUser] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ lowStock: true, rtoAlert: true, syncFailure: true, weeklyReport: false });
  const [exporting, setExporting] = useState(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [mfaStatus, setMfaStatus] = useState(null);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaSecret, setMfaSecret] = useState(null);
  const [mfaQrCode, setMfaQrCode] = useState(null);
  const [mfaVerifyToken, setMfaVerifyToken] = useState('');
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaDisableToken, setMfaDisableToken] = useState('');
  const [mfaDisabling, setMfaDisabling] = useState(false);
  const [mfaSetupLoading, setMfaSetupLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await API.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch { setUsers([]); } finally { setUsersLoading(false); }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await API.get('/warehouses');
      setWarehouses(Array.isArray(res.data) ? res.data : []);
    } catch { setWarehouses([]); }
  }, []);

  const handleEditUser = (u) => {
    setEditUserId(u.id);
    setEditForm({ role: u.role || 'PICKER', warehouseId: u.warehouseId || '' });
  };

  const handleSaveUser = async (id) => {
    setSavingId(id);
    try {
      const res = await API.put(`/users/${id}`, {
        role: editForm.role,
        warehouseId: editForm.warehouseId || null,
      });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...res.data } : u));
      toast.success('User updated');
      setEditUserId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    } finally { setSavingId(null); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!addForm.email || !addForm.password) return toast.error('Email and password are required');
    setAddingUser(true);
    try {
      const res = await API.post('/users', addForm);
      setUsers(prev => [res.data, ...prev]);
      toast.success('User created');
      setShowAddModal(false);
      setAddForm({ email: '', password: '', fullName: '', role: 'PICKER', warehouseId: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    } finally { setAddingUser(false); }
  };

  const ROLE_OPTIONS = ['SUPER_ADMIN', 'WAREHOUSE_MGR', 'PICKER', 'PACKER'];

  const fetchAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await API.get('/audit-logs');
      setAuditLogs(Array.isArray(res.data) ? res.data : []);
    } catch { setAuditLogs([]); } finally { setAuditLoading(false); }
  }, []);

  const fetchMfaStatus = useCallback(async () => {
    setMfaLoading(true);
    try {
      const res = await API.get('/auth/mfa/status');
      setMfaStatus(res.data?.mfaEnabled || false);
    } catch { setMfaStatus(false); } finally { setMfaLoading(false); }
  }, []);

  const handleMfaSetup = async () => {
    setMfaSetupLoading(true);
    try {
      const res = await API.post('/auth/mfa/setup');
      setMfaSecret(res.data.secret);
      setMfaQrCode(res.data.qrCode);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to setup MFA');
    } finally { setMfaSetupLoading(false); }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    if (mfaVerifyToken.length < 6) return toast.error('Enter a valid 6-digit code');
    setMfaVerifying(true);
    try {
      await API.post('/auth/mfa/verify', { token: mfaVerifyToken });
      toast.success('MFA enabled successfully');
      setMfaStatus(true);
      setMfaSecret(null);
      setMfaQrCode(null);
      setMfaVerifyToken('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code');
    } finally { setMfaVerifying(false); }
  };

  const handleMfaDisable = async (e) => {
    e.preventDefault();
    if (mfaDisableToken.length < 6) return toast.error('Enter a valid 6-digit code');
    setMfaDisabling(true);
    try {
      await API.post('/auth/mfa/disable', { token: mfaDisableToken });
      toast.success('MFA disabled');
      setMfaStatus(false);
      setMfaDisableToken('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disable MFA');
    } finally { setMfaDisabling(false); }
  };

  useEffect(() => { if (activeTab === 'users') { fetchUsers(); fetchWarehouses(); } }, [activeTab, fetchUsers, fetchWarehouses]);
  useEffect(() => { if (activeTab === 'audit') fetchAudit(); }, [activeTab, fetchAudit]);
  useEffect(() => { if (activeTab === 'security') fetchMfaStatus(); }, [activeTab, fetchMfaStatus]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (pwForm.newPassword.length < 4) {
      return toast.error('Password must be at least 4 characters');
    }
    setPwSubmitting(true);
    try {
      await API.post('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setPwSubmitting(false); }
  };

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const res = await API.get(`/export/${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${type} exported`);
    } catch { toast.error('Export failed'); } finally { setExporting(null); }
  };

  const tabContent = (
    <div className="space-y-4 md:space-y-6">
      {activeTab === 'profile' && (
        <div className="card p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Building2 size={20} /> Company Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs text-slate-500 block mb-1">Company Name</label><p className="font-medium">{company?.name || '—'}</p></div>
            <div><label className="text-xs text-slate-500 block mb-1">Email</label><p className="font-medium">{user?.email || company?.email || '—'}</p></div>
            <div><label className="text-xs text-slate-500 block mb-1">Tenant ID</label><p className="font-mono text-sm">{company?.id || company?.tenantId || '—'}</p></div>
            <div><label className="text-xs text-slate-500 block mb-1">Your Name</label><p className="font-medium">{user?.name || '—'}</p></div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-indigo-100/60 flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center gap-2"><Users size={20} /> Team Members</h2>
            <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-1.5 text-xs md:text-sm px-3 py-1.5 md:px-4 md:py-2">
              <UserPlus size={16} /> <span className="hidden sm:inline">Add User</span>
            </button>
          </div>
          {usersLoading ? <TableSkeleton rows={4} cols={4} /> : users.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No team members found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr>
                    <th className="table-header">Name</th>
                    <th className="table-header">Email</th>
                    <th className="table-header">Role</th>
                    <th className="table-header">Warehouse / Facility</th>
                    <th className="table-header">Created</th>
                    <th className="table-header">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="table-cell font-medium">{u.fullName || '—'}</td>
                      <td className="table-cell font-mono text-xs">{u.email}</td>
                      <td className="table-cell">
                        {editUserId === u.id ? (
                          <select
                            value={editForm.role}
                            onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                            className="input-field text-xs py-1.5 px-2"
                          >
                            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                          </select>
                        ) : (
                          <span className="badge-info">{u.role?.replace(/_/g, ' ')}</span>
                        )}
                      </td>
                      <td className="table-cell">
                        {editUserId === u.id ? (
                          <select
                            value={editForm.warehouseId}
                            onChange={e => setEditForm({ ...editForm, warehouseId: e.target.value })}
                            className="input-field text-xs py-1.5 px-2"
                          >
                            <option value="">— None —</option>
                            {warehouses.map(w => (
                              <optgroup key={w.id} label={w.name}>
                                <option value={w.id}>{w.name} (Main)</option>
                                {w.children?.map(f => (
                                  <option key={f.id} value={f.id}>↳ {f.name}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-slate-600">{u.warehouseId ? warehouses.find(w => w.id === u.warehouseId || w.children?.some(c => c.id === u.warehouseId))?.name || 'Assigned' : '—'}</span>
                        )}
                      </td>
                      <td className="table-cell text-slate-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="table-cell">
                        {editUserId === u.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleSaveUser(u.id)} disabled={savingId === u.id} className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors"><Check size={14} /></button>
                            <button onClick={() => setEditUserId(null)} className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors"><X size={14} /></button>
                          </div>
                        ) : (
                          <button onClick={() => handleEditUser(u)} disabled={u.id === user?.id} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-30 disabled:cursor-not-allowed" title={u.id === user?.id ? 'Cannot edit yourself' : 'Edit role & facility'}>
                            {u.id === user?.id ? 'You' : 'Edit'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2"><UserPlus size={20} /> Add Team Member</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
                <input value={addForm.fullName} onChange={e => setAddForm({ ...addForm, fullName: e.target.value })} className="input-field" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
                <input type="email" required value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} className="input-field" placeholder="user@company.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Password *</label>
                <input type="password" required minLength={4} value={addForm.password} onChange={e => setAddForm({ ...addForm, password: e.target.value })} className="input-field" placeholder="Min 4 characters" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                <select value={addForm.role} onChange={e => setAddForm({ ...addForm, role: e.target.value })} className="input-field">
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Assign to Warehouse / Facility</label>
                <select value={addForm.warehouseId} onChange={e => setAddForm({ ...addForm, warehouseId: e.target.value })} className="input-field">
                  <option value="">— None —</option>
                  {warehouses.map(w => (
                    <optgroup key={w.id} label={w.name}>
                      <option value={w.id}>{w.name} (Main)</option>
                      {w.children?.map(f => <option key={f.id} value={f.id}>↳ {f.name}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={addingUser} className="btn-primary flex-1 disabled:opacity-50">
                  {addingUser ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="card p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Lock size={20} /> Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Current Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={pwForm.currentPassword} onChange={e => setPwForm({ ...pwForm, currentPassword: e.target.value })} required className="w-full px-3 py-2 border rounded-lg text-sm pr-10 focus:ring-2 focus:ring-blue-500 outline-none" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">New Password</label>
              <input type="password" value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} required minLength={4} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Confirm New Password</label>
              <input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} required minLength={4} className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <button disabled={pwSubmitting} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {pwSubmitting ? 'Updating...' : <><Save size={16} /> Update Password</>}
            </button>
          </form>

          <hr className="my-6 border-slate-200" />

          <h2 className="text-lg font-bold flex items-center gap-2"><Shield size={20} /> Two-Factor Authentication (MFA)</h2>
          {mfaLoading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : !mfaStatus ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Add an extra layer of security by requiring a one-time code from your authenticator app (Google Authenticator, Authy, etc.) when signing in.</p>
              {!mfaQrCode ? (
                <button onClick={handleMfaSetup} disabled={mfaSetupLoading} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  {mfaSetupLoading ? 'Setting up...' : <><Smartphone size={16} /> Setup MFA</>}
                </button>
              ) : (
                <div className="space-y-4 p-4 bg-slate-50 rounded-xl">
                  <div className="text-center">
                    <img src={mfaQrCode} alt="MFA QR Code" className="mx-auto w-48 h-48 border-2 border-white shadow-md rounded-lg" />
                    <p className="text-xs text-slate-500 mt-2">Scan this QR code with your authenticator app</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 mb-1">Or enter this key manually:</p>
                    <code className="text-xs bg-white px-3 py-1.5 rounded border font-mono select-all">{mfaSecret}</code>
                  </div>
                  <form onSubmit={handleMfaVerify} className="space-y-3 max-w-xs mx-auto">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Enter the 6-digit code from your app</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={mfaVerifyToken}
                        onChange={e => setMfaVerifyToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full text-center text-xl tracking-[0.3em] px-3 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="000000"
                      />
                    </div>
                    <button type="submit" disabled={mfaVerifying || mfaVerifyToken.length < 6} className="btn-primary w-full disabled:opacity-50">
                      {mfaVerifying ? 'Verifying...' : 'Verify & Enable MFA'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <Shield size={20} className="text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-800 text-sm">MFA is enabled</p>
                  <p className="text-xs text-emerald-600">Your account is protected by two-factor authentication.</p>
                </div>
              </div>
              <form onSubmit={handleMfaDisable} className="space-y-3 max-w-xs">
                <p className="text-xs text-slate-500">Enter a code from your authenticator app to disable MFA:</p>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={mfaDisableToken}
                  onChange={e => setMfaDisableToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full text-center text-xl tracking-[0.3em] px-3 py-2 border rounded-lg font-mono focus:ring-2 focus:ring-red-500 outline-none"
                  placeholder="000000"
                />
                <button type="submit" disabled={mfaDisabling || mfaDisableToken.length < 6} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 text-sm">
                  {mfaDisabling ? 'Disabling...' : 'Disable MFA'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="card p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Bell size={20} /> Notification Preferences</h2>
          <div className="space-y-3">
            {[
              { key: 'lowStock', label: 'Low Stock Alerts', desc: 'Notify when inventory falls below threshold' },
              { key: 'rtoAlert', label: 'RTO Alerts', desc: 'Notify when an order is returned to origin' },
              { key: 'syncFailure', label: 'Sync Failures', desc: 'Notify when marketplace sync fails' },
              { key: 'weeklyReport', label: 'Weekly Report', desc: 'Receive a weekly summary via email' },
            ].map(n => (
              <label key={n.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer">
                <div><p className="font-medium text-sm">{n.label}</p><p className="text-xs text-slate-400">{n.desc}</p></div>
                <div className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${notifPrefs[n.key] ? 'bg-blue-600' : 'bg-slate-300'}`} onClick={() => setNotifPrefs({ ...notifPrefs, [n.key]: !notifPrefs[n.key] })}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${notifPrefs[n.key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="card p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Download size={20} /> Data Export</h2>
          <p className="text-sm text-slate-500">Download your data as CSV files for backup or analysis.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { key: 'orders', label: 'Orders Report', color: 'bg-indigo-600 hover:bg-indigo-700' },
              { key: 'inventory', label: 'Inventory Report', color: 'bg-emerald-600 hover:bg-emerald-700' },
              { key: 'inventory-added', label: 'Inventory Added Report', color: 'bg-teal-600 hover:bg-teal-700' },
              { key: 'stock-transfers', label: 'Stock Transfer Report', color: 'bg-blue-600 hover:bg-blue-700' },
              { key: 'returns', label: 'Returns Report', color: 'bg-rose-600 hover:bg-rose-700' },
              { key: 'purchase-orders', label: 'Purchase Orders Report', color: 'bg-amber-600 hover:bg-amber-700' },
              { key: 'cycle-counts', label: 'Cycle Count Report', color: 'bg-cyan-600 hover:bg-cyan-700' },
              { key: 'pick-waves', label: 'Pick Wave Report', color: 'bg-purple-600 hover:bg-purple-700' },
              { key: 'audit-logs', label: 'Audit Log Report', color: 'bg-slate-600 hover:bg-slate-700' },
            ].map(btn => (
              <button key={btn.key} onClick={() => handleExport(btn.key)} disabled={exporting === btn.key} className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-white shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 ${btn.color}`}>
                {exporting === btn.key ? <><Loader2 size={16} className="animate-spin" /> Exporting...</> : <><Download size={16} /> {btn.label}</>}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-bold flex items-center gap-2"><Clock size={20} /> Audit Log</h2>
          </div>
          {auditLoading ? <TableSkeleton rows={5} cols={4} /> : auditLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No audit logs yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[500px]">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entity</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium">{log.action}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{log.entityType}{log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{log.user?.email || log.userId?.slice(0, 8) || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold">Settings</h1>

      <div className="flex gap-1 md:gap-2 overflow-x-auto pb-1 bg-indigo-50/60 border border-indigo-100/60 rounded-xl p-1">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/80 text-indigo-700 hover:bg-white hover:shadow-sm'}`}>
            <tab.icon size={16} /> <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {tabContent}
    </div>
  );
};

export default Settings;
