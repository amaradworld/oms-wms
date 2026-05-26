import React, { useState } from 'react';
import { Package, Search, CheckCircle2, AlertCircle, Printer } from 'lucide-react';

const Picklist = () => {
  const [activeList, setActiveList] = useState('pending');

  const picklists = [
    { id: 'PL-1001', warehouse: 'Mumbai Central Hub', items: 12, status: 'PENDING', picker: null },
    { id: 'PL-1002', warehouse: 'Delhi Logistics Park', items: 8, status: 'PICKING', picker: 'Rahul K.' },
    { id: 'PL-1003', warehouse: 'Mumbai Central Hub', items: 5, status: 'COMPLETED', picker: 'Sneha M.' },
  ];

  const filteredLists = picklists.filter(p => 
    activeList === 'all' ? true : p.status.toLowerCase() === activeList
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Picklist Management</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Generate Picklists</button>
      </div>

      <div className="flex gap-3">
        {['pending', 'picking', 'completed', 'all'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveList(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeList === tab ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredLists.map(pl => (
          <div key={pl.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <Package size={24} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold">{pl.id}</h3>
                <p className="text-sm text-slate-500">{pl.warehouse} • {pl.items} items</p>
                {pl.picker && <p className="text-xs text-slate-400">Picker: {pl.picker}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                pl.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                pl.status === 'PICKING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {pl.status}
              </span>
              {pl.status === 'PENDING' && (
                <button className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium">Assign Picker</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Picklist;
