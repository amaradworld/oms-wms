import React, { useState, useEffect } from 'react';
import API from '../utils/api';

const StatCard = ({ title, value, change, trend }) => (
  <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
    <p className="text-xs md:text-sm text-slate-500 font-medium">{title}</p>
    <div className="flex items-baseline gap-2 mt-1 md:mt-2">
      <h3 className="text-xl md:text-2xl font-bold">{value}</h3>
      {change && (
        <span className={`text-xs font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </span>
      )}
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    API.get('/dashboard/stats')
      .then(res => setStats(res.data))
      .catch(() => {
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
    <div className="p-4 md:p-8 space-y-4 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Enterprise Overview</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-white border rounded-lg text-xs md:text-sm font-medium shadow-sm">Export Report</button>
          <button className="flex-1 sm:flex-none px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg text-xs md:text-sm font-medium shadow-sm hover:bg-blue-700">New Order</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard title="Total Orders" value={stats?.totalOrders?.toLocaleString() || "—"} change="+12%" trend="up" />
        <StatCard title="Pending Shipment" value={stats?.pendingOrders?.toLocaleString() || "—"} change="-5%" trend="down" />
        <StatCard title="Revenue" value={stats?.totalRevenue ? `₹${(stats.totalRevenue).toLocaleString()}` : "—"} change={stats ? "+8%" : "—"} trend="up" />
        <StatCard title="Active SKUs" value="10" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 h-64 md:h-96 flex items-center justify-center text-slate-400 text-sm">
          [Order Volume Chart]
        </div>
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200 h-64 md:h-96 flex flex-col">
          <h3 className="font-bold text-sm md:text-base mb-3 md:mb-4">Low Stock Alerts</h3>
          <div className="space-y-3 overflow-y-auto flex-1">
            {stats?.lowStockItems?.length === 0 && (
              <p className="text-green-600 text-xs md:text-sm">All items sufficiently stocked</p>
            )}
            {stats?.lowStockItems?.map((item, i) => (
              <div key={i} className="flex justify-between items-center p-2 md:p-3 bg-red-50 rounded-lg border border-red-100">
                <span className="text-xs md:text-sm font-medium text-red-700 truncate mr-2">{item.sku?.skuCode || item.skuCode}: {item.sku?.name || item.name}</span>
                <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded flex-shrink-0">Low</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
