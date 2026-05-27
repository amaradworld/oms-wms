import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Package, IndianRupee } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import API from '../utils/api';
import { StatsSkeleton } from '../components/Skeleton';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

const Analytics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get('/dashboard/stats');
      setStats(res.data);
    } catch {
      setStats({ totalOrders: 0, pendingOrders: 0, totalRevenue: 0, ordersByStatus: [], lowStockItems: [] });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const chartData = stats?.ordersByStatus?.map(s => ({ name: s.orderStatus, count: s._count })) || [];
  const pieData = chartData.length ? chartData : [
    { name: 'Pending', count: 40 }, { name: 'Processing', count: 25 }, { name: 'Shipped', count: 20 }, { name: 'Delivered', count: 90 }, { name: 'Cancelled', count: 10 },
  ];

  if (loading) return <div className="p-4 md:p-8 space-y-6"><StatsSkeleton /></div>;

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2"><BarChart3 size={24} /> Analytics</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-blue-600 mb-2"><Package size={18} /><span className="text-xs font-medium text-slate-500">Total Orders</span></div>
          <h3 className="text-xl md:text-2xl font-bold">{stats?.totalOrders || 0}</h3>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-amber-600 mb-2"><TrendingUp size={18} /><span className="text-xs font-medium text-slate-500">Pending</span></div>
          <h3 className="text-xl md:text-2xl font-bold">{stats?.pendingOrders || 0}</h3>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-green-600 mb-2"><IndianRupee size={18} /><span className="text-xs font-medium text-slate-500">Revenue</span></div>
          <h3 className="text-xl md:text-2xl font-bold">₹{(stats?.totalRevenue || 0).toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 text-indigo-600 mb-2"><BarChart3 size={18} /><span className="text-xs font-medium text-slate-500">Avg Order Value</span></div>
          <h3 className="text-xl md:text-2xl font-bold">₹{stats?.totalOrders ? Math.round((stats.totalRevenue || 0) / stats.totalOrders).toLocaleString() : 0}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-sm md:text-base mb-4">Orders by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pieData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-sm md:text-base mb-4">Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
