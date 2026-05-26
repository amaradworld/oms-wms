import React, { useState, useEffect } from 'react';
import { Barcode, CheckCircle2, AlertCircle, PackageCheck } from 'lucide-react';

const ScanningScreen = () => {
  const [scanValue, setScanValue] = useState('');
  const [status, setStatus] = useState('idle'); // idle, success, error
  const [logs, setLogs] = useState([]);

  const handleScan = (e) => {
    e.preventDefault();
    if (!scanValue) return;

    // Mock Validation Logic
    if (scanValue.startsWith('SKU-')) {
      setStatus('success');
      setLogs([{id: Date.now(), value: scanValue, time: new Date().toLocaleTimeString(), type: 'SUCCESS'}, ...logs]);
    } else {
      setStatus('error');
      setLogs([{id: Date.now(), value: scanValue, time: new Date().toLocaleTimeString(), type: 'ERROR'}, ...logs]);
    }
    setScanValue('');
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Barcode Scanner</h1>
        <p className="text-slate-500">Scan SKU or Bin Location to validate item</p>
      </div>

      <div className={`p-8 rounded-2xl border-2 transition-all text-center ${
        status === 'idle' ? 'border-slate-200 bg-white' : 
        status === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
      }`}>
        <div className="flex justify-center mb-6">
          {status === 'idle' && <Barcode size={64} className="text-slate-300" />}
          {status === 'success' && <CheckCircle2 size={64} className="text-green-500" />}
          {status === 'error' && <AlertCircle size={64} className="text-red-500" />}
        </div>

        <form onSubmit={handleScan} className="flex gap-3">
          <input 
            autoFocus
            className="flex-1 px-4 py-3 border-2 rounded-xl text-lg font-mono outline-none focus:ring-4 focus:ring-blue-200"
            placeholder="Scan now..."
            value={scanValue}
            onChange={(e) => setScanValue(e.target.value)}
          />
          <button className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800">
            Verify
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b font-bold flex items-center gap-2">
          <PackageCheck size={18} /> Scan Logs
        </div>
        <div className="divide-y">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No scans recorded yet</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="p-3 flex justify-between items-center">
                <span className="font-mono font-medium">{log.value}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">{log.time}</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    log.type === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {log.type}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanningScreen;
