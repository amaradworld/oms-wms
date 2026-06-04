import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Package, IndianRupee, Clock, Shield, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import API from '../utils/api';
import { StatsSkeleton } from '../components/Skeleton';
import { toast } from '../components/Toast';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const STATUS_COLORS = { PENDING: '#f59e0b', PROCESSING: '#3b82f6', PICKING: '#8b5cf6', PACKING: '#06b6d4', SHIPPED: '#10b981', DISPATCHED: '#14b8a6', DELIVERED: '#22c55e', CANCELLED: '#ef4444', ON_HOLD: '#f43f5e' };

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [activeReport, setActiveReport] = useState('overview');
  const [exporting, setExporting] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/dashboard/stats');
      setStats(res.data);
    } catch {
      setStats({ totalOrders: 0, pendingOrders: 0, totalRevenue: 0, ordersByStatus: [], lowStockItems: [], activeSkus: 0, sla: { breached: 0, atRisk: 0, onTrack: 0, noDeadline: 0 } });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const chartData = stats?.ordersByStatus?.map(s => ({ name: s.orderStatus, count: s._count })) || [];
  const pieData = chartData.length ? chartData : [{ name: 'Pending', count: 0 }];
  const total = stats?.totalOrders || 1;
  const onTimeRate = stats?.sla ? Math.round(((stats.sla.onTrack) / Math.max(stats.sla.total, 1)) * 100) : 0;

  const handleExport = async (type) => {
    setExporting(type);
    try {
      const res = await API.get(`/export/${type}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `${type}.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${type} exported`);
    } catch { toast.error('Export failed'); } finally { setExporting(null); }
  };

  if (loading) return <div className="p-4 md:p-8 space-y-6"><StatsSkeleton /></div>;

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><BarChart3 size={24} /> Reports & Analytics</h1>
        <div className="flex gap-2">
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="input-field text-xs py-1.5 px-2">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'orders', label: 'Orders', icon: TrendingUp },
          { id: 'inventory', label: 'Inventory', icon: Package },
          { id: 'sla', label: 'SLA', icon: Clock },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveReport(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${activeReport === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {activeReport === 'overview' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1"><Package size={16} /><span className="text-xs font-medium text-slate-500">Total Orders</span></div>
              <h3 className="text-xl md:text-2xl font-bold">{stats?.totalOrders || 0}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{stats?.pendingOrders || 0} pending</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-green-600 mb-1"><IndianRupee size={16} /><span className="text-xs font-medium text-slate-500">Revenue</span></div>
              <h3 className="text-xl md:text-2xl font-bold">₹{(stats?.totalRevenue || 0).toLocaleString()}</h3>
              <p className="text-xs text-slate-400 mt-0.5">Avg ₹{stats?.totalOrders ? Math.round((stats.totalRevenue || 0) / stats.totalOrders).toLocaleString() : 0}</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-indigo-600 mb-1"><TrendingUp size={16} /><span className="text-xs font-medium text-slate-500">Active SKUs</span></div>
              <h3 className="text-xl md:text-2xl font-bold">{stats?.activeSkus || 0}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{stats?.lowStockItems?.length || 0} low stock</p>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2 text-amber-600 mb-1"><Shield size={16} /><span className="text-xs font-medium text-slate-500">SLA Performance</span></div>
              <h3 className="text-xl md:text-2xl font-bold">{onTimeRate}%</h3>
              <p className="text-xs text-slate-400 mt-0.5">{stats?.sla?.breached || 0} breached</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="card p-4 md:p-6">
              <h3 className="font-bold text-sm md:text-base mb-4">Orders by Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pieData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {pieData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-4 md:p-6">
              <h3 className="font-bold text-sm md:text-base mb-4">Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip /> <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SLA + Low Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="card p-4 md:p-6">
              <h3 className="font-bold text-sm md:text-base mb-4 flex items-center gap-2"><Clock size={16} className="text-amber-500" /> SLA Overview</h3>
              <div className="space-y-3">
                {[
                  { label: 'On Track', value: stats?.sla?.onTrack || 0, color: 'bg-emerald-500' },
                  { label: 'At Risk', value: stats?.sla?.atRisk || 0, color: 'bg-amber-500' },
                  { label: 'Breached', value: stats?.sla?.breached || 0, color: 'bg-red-500' },
                  { label: 'No Deadline', value: stats?.sla?.noDeadline || 0, color: 'bg-slate-400' },
                ].map(item => {
                  const pct = stats?.sla?.total ? ((item.value / stats.sla.total) * 100).toFixed(1) : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1"><span>{item.label}</span><span className="font-bold">{item.value} ({pct}%)</span></div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${item.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-4 md:p-6">
              <h3 className="font-bold text-sm md:text-base mb-4 flex items-center gap-2"><AlertTriangle size={16} className="text-amber-500" /> Low Stock Items</h3>
              {(!stats?.lowStockItems || stats.lowStockItems.length === 0) ? (
                <p className="text-sm text-slate-400 text-center py-4">No low stock items</p>
              ) : (
                <div className="space-y-2">
                  {stats.lowStockItems.map((item, i) => (
                    <div key={item.id || i} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.sku?.skuCode}</p>
                        <p className="text-xs text-slate-400 truncate">{item.sku?.name}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="font-bold text-red-600">{item.quantityAvailable}</p>
                        <p className="text-xs text-slate-400">min {item.reorderPoint}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeReport === 'orders' && (
        <div className="space-y-4">
          <div className="card p-4 md:p-6">
            <h3 className="font-bold text-sm md:text-base mb-4">Status Distribution</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={pieData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {pieData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => handleExport('orders')} disabled={exporting === 'orders'} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50">
              {exporting === 'orders' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export CSV
            </button>
          </div>
        </div>
      )}

      {activeReport === 'inventory' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card p-4"><span className="text-xs text-slate-500">Active SKUs</span><p className="text-xl font-bold">{stats?.activeSkus || 0}</p></div>
            <div className="card p-4"><span className="text-xs text-slate-500">Low Stock Items</span><p className="text-xl font-bold text-amber-600">{stats?.lowStockItems?.length || 0}</p></div>
            <div className="card p-4"><span className="text-xs text-slate-500">Total Orders</span><p className="text-xl font-bold">{stats?.totalOrders || 0}</p></div>
            <div className="card p-4"><span className="text-xs text-slate-500">Pending Orders</span><p className="text-xl font-bold text-amber-600">{stats?.pendingOrders || 0}</p></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => handleExport('inventory')} disabled={exporting === 'inventory'} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50">
              {exporting === 'inventory' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Export CSV
            </button>
          </div>
        </div>
      )}

      {activeReport === 'sla' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card p-4"><span className="text-xs text-slate-500">Total Active</span><p className="text-xl font-bold">{stats?.sla?.total || 0}</p></div>
            <div className="card p-4"><span className="text-xs text-slate-500">On Track</span><p className="text-xl font-bold text-emerald-600">{stats?.sla?.onTrack || 0}</p></div>
            <div className="card p-4"><span className="text-xs text-slate-500">At Risk</span><p className="text-xl font-bold text-amber-600">{stats?.sla?.atRisk || 0}</p></div>
            <div className="card p-4"><span className="text-xs text-slate-500">Breached</span><p className="text-xl font-bold text-red-600">{stats?.sla?.breached || 0}</p></div>
          </div>

          <div className="card p-4 md:p-6">
            <h3 className="font-bold text-sm mb-4">Breached Orders</h3>
            {stats?.sla?.breachedOrders?.length ? (
              <div className="space-y-2">
                {stats.sla.breachedOrders.map((o, i) => (
                  <div key={o.id || i} className="flex justify-between items-center p-2 bg-red-50 rounded-lg text-sm">
                    <div><span className="font-medium">{o.orderNumber}</span><span className="text-slate-500 ml-2">{o.customerName}</span></div>
                    <div className="text-xs text-red-600">Deadline: {o.slaDeadline ? new Date(o.slaDeadline).toLocaleString() : '—'}</div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-400 text-center py-4">No breached orders</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
