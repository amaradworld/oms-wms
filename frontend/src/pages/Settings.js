import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Users, Key, Bell, Download, Clock, Save, Lock, Eye, EyeOff } from 'lucide-react';
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
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ lowStock: true, rtoAlert: true, syncFailure: true, weeklyReport: false });
  const [exporting, setExporting] = useState(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await API.get('/users');
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch { setUsers([]); } finally { setUsersLoading(false); }
  }, []);

  const fetchAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await API.get('/audit-logs');
      setAuditLogs(Array.isArray(res.data) ? res.data : []);
    } catch { setAuditLogs([]); } finally { setAuditLoading(false); }
  }, []);

  useEffect(() => { if (activeTab === 'users') fetchUsers(); }, [activeTab, fetchUsers]);
  useEffect(() => { if (activeTab === 'audit') fetchAudit(); }, [activeTab, fetchAudit]);

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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-bold flex items-center gap-2"><Users size={20} /> Team Members</h2>
          </div>
          {usersLoading ? <TableSkeleton rows={4} cols={3} /> : users.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No team members found</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">{u.fullName || '—'}</td>
                    <td className="px-4 py-3 text-sm font-mono">{u.email}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{u.role?.replace(/_/g, ' ')}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
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
            <button disabled={pwSubmitting} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {pwSubmitting ? 'Updating...' : <><Save size={16} /> Update Password</>}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-6 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Download size={20} /> Data Export</h2>
          <p className="text-sm text-slate-500">Download your data as CSV files for backup or analysis.</p>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => handleExport('orders')} disabled={exporting === 'orders'} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {exporting === 'orders' ? 'Exporting...' : <><Download size={16} /> Export Orders</>}
            </button>
            <button onClick={() => handleExport('inventory')} disabled={exporting === 'inventory'} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {exporting === 'inventory' ? 'Exporting...' : <><Download size={16} /> Export Inventory</>}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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

      <div className="flex gap-1 md:gap-2 overflow-x-auto pb-1 bg-white rounded-xl border border-slate-200 p-1 shadow-sm">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
            <tab.icon size={16} /> <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {tabContent}
    </div>
  );
};

export default Settings;
