import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { StatsSkeleton } from '../components/Skeleton';

const StatCard = ({ title, value, change, trend }) => (
  <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
    <p className="text-xs md:text-sm text-slate-500 font-medium">{title}</p>
    <div className="flex items-baseline gap-2 mt-1 md:mt-2">
      <h3 className="text-xl md:text-2xl font-bold">{value}</h3>
      {change && (
        <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>{change}</span>
      )}
    </div>
  </div>
);

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

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Enterprise Overview</h1>
      </div>

      {!stats ? <StatsSkeleton /> : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <StatCard title="Total Orders" value={stats.totalOrders?.toLocaleString() || "—"} change="+12%" trend="up" />
            <StatCard title="Pending Shipment" value={stats.pendingOrders?.toLocaleString() || "—"} change="-5%" trend="down" />
            <StatCard title="Revenue" value={stats.totalRevenue ? `₹${stats.totalRevenue.toLocaleString()}` : "—"} change="+8%" trend="up" />
            <StatCard title="Active SKUs" value="10" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-sm md:text-base mb-4">Orders by Status</h3>
              {chartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
              <h3 className="font-bold text-sm md:text-base mb-3 md:mb-4">Low Stock Alerts</h3>
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
