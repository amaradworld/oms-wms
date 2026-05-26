import React, { useState } from 'react';

const Picklist = () => {
  const [activeList, setActiveList] = useState('pending');

  const picklists = [
    { id: 'PL-1001', warehouse: 'Mumbai Central Hub', items: 12, status: 'PENDING', picker: null },
    { id: 'PL-1002', warehouse: 'Delhi Logistics Park', items: 8, status: 'PICKING', picker: 'Rahul K.' },
    { id: 'PL-1003', warehouse: 'Mumbai Central Hub', items: 5, status: 'COMPLETED', picker: 'Sneha M.' },
  ];

  const filtered = picklists.filter(p => 
    activeList === 'all' ? true : p.status === activeList.toUpperCase()
  );

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Picklist Management</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-sm w-full sm:w-auto">+ Create Picklist</button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['pending', 'picking', 'completed', 'all'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveList(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeList === tab ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[500px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Picklist ID</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Warehouse</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Picker</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(pl => (
                <tr key={pl.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium">{pl.id}</td>
                  <td className="px-4 py-3 text-sm">{pl.warehouse}</td>
                  <td className="px-4 py-3 text-sm">{pl.items}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      pl.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      pl.status === 'PICKING' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>{pl.status}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{pl.picker || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Picklist;
