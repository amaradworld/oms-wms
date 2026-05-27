import React, { useState } from 'react';
import { Barcode, CheckCircle2, AlertCircle, PackageCheck, Loader2 } from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';
import EmptyState from '../components/EmptyState';

const ScanningScreen = () => {
  const [scanValue, setScanValue] = useState('');
  const [status, setStatus] = useState('idle');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!scanValue) return;
    setLoading(true);
    try {
      const res = await API.post('/scan/verify', { code: scanValue });
      setStatus('success');
      setLogs([{ id: Date.now(), value: scanValue, time: new Date().toLocaleTimeString(), type: 'SUCCESS', msg: res.data.message }, ...logs]);
      toast.success(res.data.message || 'Verified');
    } catch (err) {
      setStatus('error');
      setLogs([{ id: Date.now(), value: scanValue, time: new Date().toLocaleTimeString(), type: 'ERROR', msg: err.response?.data?.message || 'Invalid' }, ...logs]);
      toast.error(err.response?.data?.message || 'Invalid scan');
    } finally {
      setLoading(false);
      setScanValue('');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6 md:space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Barcode Scanner</h1>
        <p className="text-xs md:text-sm text-slate-500">Scan SKU or Bin Location to validate item</p>
      </div>

      <div className={`p-6 md:p-8 rounded-2xl border-2 transition-all text-center ${
        status === 'idle' ? 'border-slate-200 bg-white' : 
        status === 'success' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
      }`}>
        <div className="flex justify-center mb-4 md:mb-6">
          {loading ? <Loader2 size={48} className="text-slate-400 animate-spin" /> :
           status === 'idle' ? <Barcode size={48} className="text-slate-300" /> :
           status === 'success' ? <CheckCircle2 size={48} className="text-green-500" /> :
           <AlertCircle size={48} className="text-red-500" />}
        </div>

        <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <input autoFocus className="flex-1 px-4 py-3 border-2 rounded-xl text-base md:text-lg font-mono outline-none focus:ring-4 focus:ring-blue-200" placeholder="Scan now..." value={scanValue} onChange={(e) => setScanValue(e.target.value)} />
          <button disabled={loading} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50">{loading ? 'Verifying...' : 'Verify'}</button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b font-bold text-sm flex items-center gap-2"><PackageCheck size={16} /> Scan Logs</div>
        <div className="divide-y">
          {logs.length === 0 ? (
            <EmptyState icon="search" title="No scans recorded" description="Scan a barcode above to begin logging." />
          ) : logs.map(log => (
            <div key={log.id} className="p-3 flex justify-between items-center">
              <div className="min-w-0 flex-1">
                <span className="font-mono text-sm font-medium truncate mr-2 block">{log.value}</span>
                {log.msg && <span className="text-xs text-slate-400">{log.msg}</span>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-xs text-slate-400">{log.time}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${log.type === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{log.type}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScanningScreen;
