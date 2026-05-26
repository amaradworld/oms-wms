import React, { useState } from 'react';
import { RotateCcw, Search, Filter, AlertTriangle } from 'lucide-react';
import ImportButton from '../components/ImportButton';
import SampleCSVButton from '../components/SampleCSVButton';

const Returns = () => {
  const [tab, setTab] = useState('returns');

  const returns = [
    { id: 'RET-001', order: 'ORD-1001', sku: 'TSH-BLU-M', qty: 1, reason: 'Size mismatch', status: 'QC_PASSED', date: '2026-05-20' },
    { id: 'RET-002', order: 'ORD-1005', sku: 'JNS-BLK-32', qty: 1, reason: 'Defective', status: 'QC_FAILED', date: '2026-05-21' },
    { id: 'RET-003', order: 'ORD-1010', sku: 'SHK-WHT-10', qty: 1, reason: 'Wrong item', status: 'RECEIVED', date: '2026-05-22' },
  ];

  const rtoItems = [
    { id: 'RTO-001', order: 'ORD-1008', courier: 'Shiprocket', reason: 'Customer refused', status: 'PENDING_QC', date: '2026-05-19' },
    { id: 'RTO-002', order: 'ORD-1012', courier: 'Delhivery', reason: 'Address incorrect', status: 'QC_PASSED', date: '2026-05-20' },
  ];

  const data = tab === 'returns' ? returns : rtoItems;

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl md:text-2xl font-bold">Returns & RTO Management</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <SampleCSVButton type="returns" />
          <ImportButton label="Returns" endpoint="returns" />
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">+ Return</button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setTab('returns')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            tab === 'returns' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'
          }`}
        >
          <RotateCcw size={16} /> Returns
        </button>
        <button
          onClick={() => setTab('rto')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            tab === 'rto' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle size={16} /> RTO
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input type="text" placeholder="Search by Return ID, Order or SKU..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium w-full sm:w-auto justify-center"><Filter size={16} /> Filters</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium">{item.id}</td>
                  <td className="px-4 py-3 text-sm">{item.order}</td>
                  <td className="px-4 py-3 text-sm font-mono">{item.sku}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[120px] md:max-w-none">{item.reason}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                      item.status === 'QC_PASSED' ? 'bg-green-100 text-green-700' :
                      item.status === 'QC_FAILED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {item.status?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">{item.date}</td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-blue-600 font-medium hover:underline whitespace-nowrap">Process QC</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Returns;
