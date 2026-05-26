import React, { useState } from 'react';
import { Search, Filter, Package, MoreVertical } from 'lucide-react';
import ImportButton from '../components/ImportButton';

const Inventory = () => {
  const [search, setSearch] = useState('');

  const items = [
    { sku: 'TSH-BLU-M', name: 'Blue Cotton T-Shirt (M)', warehouse: 'Mumbai', bin: 'BIN-12', qty: 45, reserved: 3, available: 42 },
    { sku: 'JNS-BLK-32', name: 'Black Jeans (32)', warehouse: 'Mumbai', bin: 'BIN-08', qty: 28, reserved: 2, available: 26 },
    { sku: 'SHK-WHT-10', name: 'White Sneakers (10)', warehouse: 'Delhi', bin: 'BIN-21', qty: 15, reserved: 1, available: 14 },
    { sku: 'ACC-WLT-BRW', name: 'Brown Wallet', warehouse: 'Mumbai', bin: 'BIN-05', qty: 60, reserved: 0, available: 60 },
    { sku: 'TSH-BLU-S', name: 'Blue T-Shirt (S)', warehouse: 'Delhi', bin: 'BIN-15', qty: 8, reserved: 4, available: 4 },
  ];

  const filtered = items.filter(i =>
    i.sku.toLowerCase().includes(search.toLowerCase()) ||
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <div className="flex gap-3">
          <ImportButton label="Inventory" endpoint="inventory" />
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">+ Add SKU</button>
        </div>
      </div>

      <div className="flex gap-4 items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by SKU or Product Name..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium"><Filter size={16} /> Filters</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Warehouse</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bin</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">On Hand</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Available</th>
              <th className="px-4 py-3 text-right"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-sm font-mono font-medium">{item.sku}</td>
                <td className="px-4 py-3 text-sm">{item.name}</td>
                <td className="px-4 py-3 text-sm">{item.warehouse}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-500">{item.bin}</td>
                <td className="px-4 py-3 text-sm">{item.qty}</td>
                <td className="px-4 py-3">
                  <span className={`text-sm font-semibold ${item.available < 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {item.available}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="p-1 hover:bg-slate-200 rounded-full"><MoreVertical size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;
