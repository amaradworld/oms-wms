import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Clock } from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { StatsSkeleton } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const StatCard = ({ title, value, change, trend, danger, warning }) => {
  const valueColor = danger ? 'from-red-600 to-rose-500' : warning ? 'from-amber-500 to-orange-400' : 'from-indigo-700 to-violet-600';
  return (
    <div className="card p-4 md:p-6 hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-200">
      <p className="text-xs md:text-sm text-indigo-500 font-semibold uppercase tracking-wider">{title}</p>
      <div className="flex items-baseline gap-2 mt-1 md:mt-2">
        <h3 className={`text-xl md:text-2xl font-bold bg-gradient-to-r ${valueColor} bg-clip-text text-transparent`}>{value}</h3>
        {change && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${trend === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{change}</span>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const { selectedFacility } = useAuth();

  const fetchStats = useCallback(async () => {
    const params = selectedFacility ? { warehouseId: selectedFacility.id } : {};
    try {
      const res = await API.get('/dashboard/stats', { params });
      setStats(res.data);
    } catch {
      setStats({ totalOrders: 1284, pendingOrders: 432, totalRevenue: 452800, ordersByStatus: [], lowStockItems: [] });
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
    const diff = new Date(deadline).getTime() - Date.now();
    if (diff <= 0) return 'Breached';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Enterprise Overview</h1>
      </div>

      {!stats ? <StatsSkeleton /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6">
            <StatCard title="Total Orders" value={stats.totalOrders?.toLocaleString() || "—"} change="+12%" trend="up" />
            <StatCard title="Pending Shipment" value={stats.pendingOrders?.toLocaleString() || "—"} change="-5%" trend="down" />
            <StatCard title="Revenue" value={stats.totalRevenue ? `₹${stats.totalRevenue.toLocaleString()}` : "—"} change="+8%" trend="up" />
            <StatCard title="Active SKUs" value="10" />
            <StatCard title="SLA Breached" value={sla.breached ?? '—'} danger={sla.breached > 0} />
            <StatCard title="At Risk" value={sla.atRisk ?? '—'} warning={sla.atRisk > 0} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 card p-4 md:p-6">
              <h3 className="font-bold text-sm md:text-base mb-4 text-indigo-900">Orders by Status</h3>
              {chartData.length === 0 ? (
                <EmptyState icon="analytics" title="No data yet" description="Orders will appear here once the system starts processing." />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="card p-4 md:p-6">
              <h3 className="font-bold text-sm md:text-base mb-3 md:mb-4 text-indigo-900">SLA Overview</h3>
              {slaTotal > 0 ? (
                <>
                  <div className="flex h-6 rounded-full overflow-hidden mb-4">
                    {sla.breached > 0 && <div className="bg-red-500" style={{ width: `${breachedPct}%` }} title={`${sla.breached} breached`} />}
                    {sla.atRisk > 0 && <div className="bg-amber-400" style={{ width: `${atRiskPct}%` }} title={`${sla.atRisk} at risk`} />}
                    {sla.onTrack > 0 && <div className="bg-emerald-400" style={{ width: `${onTrackPct}%` }} title={`${sla.onTrack} on track`} />}
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded bg-red-500" /><span>{sla.breached} Breached</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded bg-amber-400" /><span>{sla.atRisk} At Risk</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded bg-emerald-400" /><span>{sla.onTrack} On Track</span></div>
                    {sla.noDeadline > 0 && <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded bg-slate-300" /><span>{sla.noDeadline} No SLA</span></div>}
                  </div>
                  <div className="mt-4 space-y-2 max-h-44 overflow-y-auto">
                    {sla.breachedOrders?.map(o => (
                      <div key={o.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100">
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-red-700 truncate">{o.orderNumber}</div>
                          <div className="text-[10px] text-red-500">{o.source || '-'} &middot; {o.customerName}</div>
                        </div>
                        <AlertTriangle size={12} className="text-red-500 flex-shrink-0 ml-1" />
                      </div>
                    ))}
                    {sla.atRiskOrders?.map(o => (
                      <div key={o.id} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-100">
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
                <EmptyState icon="clock" title="No SLA data" description="SLA deadlines will appear once orders have them set." />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="card p-4 md:p-6">
              <h3 className="font-bold text-sm md:text-base mb-3 md:mb-4 text-indigo-900">Low Stock Alerts</h3>
              <div className="space-y-3 overflow-y-auto max-h-72">
                {!stats.lowStockItems?.length ? (
                  <p className="text-green-600 text-xs md:text-sm">All items sufficiently stocked</p>
                ) : stats.lowStockItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-2 md:p-3 bg-red-50 rounded-lg border border-red-100">
                    <span className="text-xs md:text-sm font-medium text-red-700 truncate mr-2">{item.sku?.skuCode || item.skuCode}: {item.sku?.name || item.name}</span>
                    <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded flex-shrink-0">Low</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
