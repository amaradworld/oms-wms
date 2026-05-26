import React, { useState } from 'react';
import { Search, Filter, MoreVertical } from 'lucide-react';
import ImportButton from '../components/ImportButton';

const OrderRow = ({ order }) => (
  <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
    <td className="px-4 py-3 text-sm font-medium text-slate-900">{order.id}</td>
    <td className="px-4 py-3 text-sm text-slate-600">{order.customer}</td>
    <td className="px-4 py-3 text-sm text-slate-600">{order.sku_count} items</td>
    <td className="px-4 py-3 text-sm">
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
        order.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 
        order.status === 'Shipped' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
      }`}>
        {order.status}
      </span>
    </td>
    <td className="px-4 py-3 text-sm text-slate-600">{order.date}</td>
    <td className="px-4 py-3 text-right">
      <button className="p-1 hover:bg-slate-200 rounded-full"><MoreVertical size={16} /></button>
    </td>
  </tr>
);

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const mockOrders = [
    { id: 'ORD-1001', customer: 'Rahul Sharma', sku_count: 2, status: 'Pending', date: '2026-05-24' },
    { id: 'ORD-1002', customer: 'Priya Patel', sku_count: 1, status: 'Shipped', date: '2026-05-23' },
    { id: 'ORD-1003', customer: 'Amit Kumar', sku_count: 5, status: 'Pending', date: '2026-05-24' },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Order Management</h1>
        <div className="flex gap-3">
          <ImportButton label="Orders" endpoint="orders" />
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-sm">+ New Order</button>
        </div>
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by Order ID, Customer or SKU..." 
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">
          <Filter size={16} /> Filters
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase uppercase tracking-wider">Order ID</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {mockOrders.map(order => <OrderRow key={order.id} order={order} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
