import React, { useState, useEffect } from 'react';
import API from '../utils/api';

const StatCard = ({ title, value, change, trend }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
    <p className="text-sm text-slate-500 font-medium">{title}</p>
    <div className="flex items-baseline gap-2 mt-2">
      <h3 className="text-2xl font-bold">{value}</h3>
      <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
        {change}
      </span>
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    API.get('/dashboard/stats')
      .then(res => setStats(res.data))
      .catch(() => {
        // Fallback to mock data if API is not responsive
        setStats({
          totalOrders: 1284,
          pendingOrders: 432,
          totalRevenue: 452800,
          lowStockItems: [
            { sku: { skuCode: 'TSH-BLU-S', name: 'Blue T-Shirt (S)' } },
            { sku: { skuCode: 'SHK-WHT-10', name: 'White Sneakers (10)' } },
            { sku: { skuCode: 'ACC-WLT-BRW', name: 'Brown Wallet' } },
          ]
        });
      });
  }, []);

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Enterprise Overview</h1>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border rounded-lg text-sm font-medium shadow-sm">Export Report</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-blue-700">New Order</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Orders" value={stats?.totalOrders?.toLocaleString() || "—"} change="+12%" trend="up" />
        <StatCard title="Pending Shipment" value={stats?.pendingOrders?.toLocaleString() || "—"} change="-5%" trend="down" />
        <StatCard title="Revenue" value={stats?.totalRevenue ? `₹${(stats.totalRevenue).toLocaleString()}` : "—"} change={stats ? "+8%" : "—"} trend="up" />
        <StatCard title="Active SKUs" value="10" change="" trend="up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96 flex items-center justify-center text-slate-400">
          [Order Volume Chart]
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-96 flex flex-col">
          <h3 className="font-bold mb-4">Low Stock Alerts</h3>
          <div className="space-y-4 overflow-y-auto">
            {stats?.lowStockItems?.length === 0 && (
              <p className="text-green-600 text-sm">All items sufficiently stocked</p>
            )}
            {stats?.lowStockItems?.map((item, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                <span className="text-sm font-medium text-red-700">{item.sku?.skuCode || item.skuCode}: {item.sku?.name || item.name}</span>
                <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">Low</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
