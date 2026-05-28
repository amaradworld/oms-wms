import React, { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ShoppingCart, Package, IndianRupee, AlertTriangle, Clock, RefreshCw, BarChart3, TrendingUp } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { StatsSkeleton } from '../components/Skeleton';
import { toast } from '../components/Toast';

const StatCard = ({ title, value, subtitle, icon: Icon, color }) => {
  const colors = {
    blue: 'text-blue-600 bg-blue-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    rose: 'text-rose-600 bg-rose-50',
    violet: 'text-violet-600 bg-violet-50',
    cyan: 'text-cyan-600 bg-cyan-50',
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${c}`}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { selectedFacility } = useAuth();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    const params = selectedFacility ? { warehouseId: selectedFacility.id } : {};
    try {
      const res = await API.get('/dashboard/stats', { params });
      setStats(res.data);
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedFacility]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const chartData = stats?.ordersByStatus?.map(s => ({ name: s.orderStatus, count: s._count })) || [];
  const sla = stats?.sla || {};

  const slaTotal = sla.total ?? 0;
  const denom = slaTotal || 1;
  const breachedPct = Math.round((sla.breached / denom) * 100);
  const atRiskPct = Math.round((sla.atRisk / denom) * 100);
  const onTrackPct = Math.round((sla.onTrack / denom) * 100);

  const formatTimeRemaining = (deadline) => {
    if (!deadline) return 'ΓÇö';
    const ms = new Date(deadline).getTime();
    if (isNaN(ms)) return 'ΓÇö';
    const diff = ms - Date.now();
    if (diff <= 0) return 'Breached';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Real-time warehouse operations overview</p>
        </div>
        <button onClick={fetchStats} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? <StatsSkeleton /> : !stats ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <p className="text-slate-400">Dashboard data unavailable.</p>
          <button onClick={fetchStats} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"><RefreshCw size={14} /> Retry</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard title="Total Orders" value={stats.totalOrders?.toLocaleString() || "ΓÇö"} subtitle="All time" icon={ShoppingCart} color="blue" />
            <StatCard title="Pending Shipment" value={stats.pendingOrders?.toLocaleString() || "ΓÇö"} subtitle="Awaiting dispatch" icon={Package} color="amber" />
            <StatCard title="Revenue" value={stats.totalRevenue ? `Γé╣${stats.totalRevenue.toLocaleString()}` : "ΓÇö"} subtitle="Total value" icon={IndianRupee} color="emerald" />
            <StatCard title="Active SKUs" value={stats.activeSkus?.toLocaleString() || 'ΓÇö'} subtitle="In inventory" icon={BarChart3} color="violet" />
            <StatCard title="SLA Breached" value={sla.breached ?? 'ΓÇö'} subtitle={sla.breached > 0 ? 'Requires attention' : 'All good'} icon={AlertTriangle} color="rose" />
            <StatCard title="At Risk" value={sla.atRisk ?? 'ΓÇö'} subtitle={sla.atRisk > 0 ? 'Approaching deadline' : 'On track'} icon={Clock} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <BarChart3 size={16} className="text-slate-400" />
                <h3 className="font-semibold text-sm text-slate-700">Orders by Status</h3>
              </div>
              {chartData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <BarChart3 size={32} className="mb-2 text-slate-300" />
                  <p className="text-sm">No data yet</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} fill="url(#colorCount)" dot={{ fill: '#3b82f6', stroke: '#fff', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={16} className="text-slate-400" />
                <h3 className="font-semibold text-sm text-slate-700">SLA Overview</h3>
              </div>
              {slaTotal > 0 ? (
                <>
                  <div className="flex h-2 rounded-full overflow-hidden mb-5 bg-slate-100">
                    {sla.breached > 0 && <div className="bg-rose-500" style={{ width: `${breachedPct}%` }} title={`${sla.breached} breached`} />}
                    {sla.atRisk > 0 && <div className="bg-amber-400" style={{ width: `${atRiskPct}%` }} title={`${sla.atRisk} at risk`} />}
                    {sla.onTrack > 0 && <div className="bg-emerald-400" style={{ width: `${onTrackPct}%` }} title={`${sla.onTrack} on track`} />}
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-slate-600">Breached</span></div>
                      <span className="font-semibold text-slate-800">{sla.breached}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-slate-600">At Risk</span></div>
                      <span className="font-semibold text-slate-800">{sla.atRisk}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-slate-600">On Track</span></div>
                      <span className="font-semibold text-slate-800">{sla.onTrack}</span>
                    </div>
                    {sla.noDeadline > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-300" /><span className="text-slate-600">No SLA</span></div>
                        <span className="font-semibold text-slate-800">{sla.noDeadline}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 space-y-2 max-h-44 overflow-y-auto">
                    {sla.breachedOrders?.map(o => (
                      <div key={o.id} className="flex items-center justify-between p-2.5 bg-rose-50 rounded-lg border border-rose-100">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-rose-700 truncate">{o.orderNumber}</div>
                          <div className="text-[10px] text-rose-500">{o.source || '-'} &middot; {o.customerName}</div>
                        </div>
                        <AlertTriangle size={12} className="text-rose-500 flex-shrink-0 ml-1" />
                      </div>
                    ))}
                    {sla.atRiskOrders?.map(o => (
                      <div key={o.id} className="flex items-center justify-between p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-amber-700 truncate">{o.orderNumber}</div>
                          <div className="text-[10px] text-amber-500">{formatTimeRemaining(o.slaDeadline)} left</div>
                        </div>
                        <Clock size={12} className="text-amber-500 flex-shrink-0 ml-1" />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Clock size={32} className="mb-2 text-slate-300" />
                  <p className="text-sm">No SLA data</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package size={16} className="text-slate-400" />
              <h3 className="font-semibold text-sm text-slate-700">Low Stock Alerts</h3>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {!stats.lowStockItems?.length ? (
                <p className="text-emerald-600 text-sm flex items-center gap-1.5"><TrendingUp size={14} /> All items sufficiently stocked</p>
              ) : stats.lowStockItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-100">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-rose-700">{item.sku?.skuCode || item.skuCode}</span>
                    <span className="text-xs text-rose-500 ml-2">{item.sku?.name || item.name}</span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-200 text-rose-800">Low Stock</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
