import React, { useState, useRef, useEffect } from 'react';
import { Barcode, CheckCircle2, AlertCircle, Loader2, ScanLine, Package, MapPin, ShoppingCart, ClipboardCheck, History, RotateCcw, Camera, Volume2, VolumeX } from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';
import CameraScanner from '../components/CameraScanner';

const SCAN_MODES = [
  { id: 'sku', label: 'SKU', icon: Package, desc: 'Verify SKU code' },
  { id: 'bin', label: 'Bin', icon: MapPin, desc: 'Verify bin location' },
  { id: 'order', label: 'Order', icon: ShoppingCart, desc: 'Look up order' },
  { id: 'inventory', label: 'Inventory', icon: ClipboardCheck, desc: 'Verify item in bin' },
];

const MobileScan = () => {
  const [scanValue, setScanValue] = useState('');
  const [mode, setMode] = useState('sku');
  const [status, setStatus] = useState('idle');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const inputRef = useRef(null);
  const scanTimerRef = useRef(null);

  useEffect(() => {
    if (!showCamera) inputRef.current?.focus();
  }, [mode, showCamera]);

  const playBeep = (type) => {
    if (!soundOn) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = type === 'success' ? 880 : 440;
      osc.type = 'sine';
      gain.gain.value = 0.15;
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close(); }, 150);
    } catch {}
    if (navigator.vibrate) navigator.vibrate(type === 'success' ? 50 : [50, 50, 50]);
  };

  const handleScan = async (e, overrideValue) => {
    if (e && e.preventDefault) e.preventDefault();
    const val = (overrideValue || scanValue).trim();
    if (!val) return;

    setLoading(true);
    setStatus('scanning');
    setResult(null);

    try {
      let res;
      switch (mode) {
        case 'sku':
          res = await API.get(`/skus?q=${encodeURIComponent(val)}`);
          if (res.data?.length > 0) {
            setStatus('success'); setResult({ type: 'SKU', data: res.data[0] });
            playBeep('success');
            toast.success(`SKU: ${res.data[0].skuCode}`);
          } else { throw new Error('SKU not found'); }
          break;
        case 'bin':
          res = await API.get(`/bins?q=${encodeURIComponent(val)}`);
          if (res.data?.length > 0) {
            setStatus('success'); setResult({ type: 'Bin', data: res.data[0] });
            playBeep('success');
            toast.success(`Bin: ${res.data[0].code}`);
          } else { throw new Error('Bin not found'); }
          break;
        case 'order':
          res = await API.get(`/orders?search=${encodeURIComponent(val)}`);
          if (res.data?.orders?.length > 0) {
            setStatus('success'); setResult({ type: 'Order', data: res.data.orders[0] });
            playBeep('success');
            toast.success(`Order: ${res.data.orders[0].orderNumber}`);
          } else { throw new Error('Order not found'); }
          break;
        case 'inventory':
          res = await API.post('/scan/verify', { code: val });
          setStatus('success'); setResult({ type: 'Inventory', data: res.data });
          playBeep('success');
          toast.success(res.data.message || 'Verified');
          break;
        default:
          res = await API.post('/scan/verify', { code: val });
          setStatus('success'); setResult({ type: 'Scan', data: res.data });
          playBeep('success');
      }
      setLogs(prev => [{ id: Date.now(), value: val, mode, time: new Date().toLocaleTimeString(), type: 'SUCCESS' }, ...prev]);
    } catch (err) {
      setStatus('error');
      const msg = err.response?.data?.message || err.message || 'Scan failed';
      setResult({ type: 'Error', message: msg });
      playBeep('error');
      toast.error(msg);
      setLogs(prev => [{ id: Date.now(), value: val, mode, time: new Date().toLocaleTimeString(), type: 'ERROR', msg }, ...prev]);
    } finally {
      setLoading(false);
      setScanValue('');
      scanTimerRef.current = setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleCameraScan = (code) => {
    setShowCamera(false);
    setScanValue(code);
    handleScan(null, code);
  };

  useEffect(() => {
    return () => { if (scanTimerRef.current) clearTimeout(scanTimerRef.current); };
  }, []);

  return (
    <div className="min-h-[calc(100vh-60px)] bg-slate-50 flex flex-col">
      {/* Mode Selector */}
      <div className="bg-white border-b border-slate-200 px-2 py-2 sticky top-0 z-10">
        <div className="flex gap-1 overflow-x-auto max-w-lg mx-auto">
          {SCAN_MODES.map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); setStatus('idle'); setResult(null); }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                mode === m.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <m.icon size={16} /> {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-4 max-w-lg mx-auto w-full space-y-4">
        {/* Scan Area */}
        <div className={`p-6 rounded-2xl border-2 transition-all text-center ${
          status === 'idle' ? 'border-slate-200 bg-white' :
          status === 'scanning' ? 'border-amber-400 bg-amber-50' :
          status === 'success' ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'
        }`}>
          <div className="flex justify-center mb-4">
            {loading ? <Loader2 size={56} className="text-slate-400 animate-spin" /> :
             status === 'success' ? <CheckCircle2 size={56} className="text-emerald-500" /> :
             status === 'error' ? <AlertCircle size={56} className="text-red-500" /> :
             <ScanLine size={56} className="text-slate-300" />}
          </div>

          <p className="text-lg font-bold mb-1">{SCAN_MODES.find(m => m.id === mode)?.label} Scan</p>
          <p className="text-xs text-slate-400 mb-4">{SCAN_MODES.find(m => m.id === mode)?.desc}</p>

          <form onSubmit={handleScan} className="flex flex-col gap-3">
            <input ref={inputRef} autoFocus autoComplete="off"
              className="w-full px-4 py-4 border-2 rounded-xl text-lg font-mono text-center outline-none focus:ring-4 focus:ring-indigo-200 focus:border-indigo-400"
              placeholder="Tap to scan or type..." value={scanValue} onChange={e => setScanValue(e.target.value)}
              aria-label="Scan input"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowCamera(true)}
                className="flex-1 py-4 bg-slate-700 text-white rounded-xl font-bold text-base hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                aria-label="Use camera to scan">
                <Camera size={20} /> Camera
              </button>
              <button disabled={loading || !scanValue.trim()} className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold text-base hover:bg-indigo-700 disabled:opacity-40 active:scale-[0.98] transition-all">
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </form>
        </div>

        {/* Scan Result */}
        {result && (
          <div className={`p-4 rounded-xl border-2 text-sm space-y-2 ${
            status === 'success' ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'
          }`}>
            <p className="font-bold">{status === 'success' ? '✓ Verified' : '✗ Failed'}</p>
            {result.type === 'SKU' && (
              <div><p className="font-mono text-base">{result.data.skuCode}</p><p className="text-slate-600">{result.data.name}</p></div>
            )}
            {result.type === 'Bin' && (
              <div><p className="font-mono text-base">{result.data.code}</p><p className="text-slate-600">{result.data.zone || ''} {result.data.aisle ? `/ ${result.data.aisle}` : ''}</p></div>
            )}
            {result.type === 'Order' && (
              <div><p className="font-mono text-base">{result.data.orderNumber}</p><p className="text-slate-600">{result.data.customerName} · {result.data.orderStatus}</p></div>
            )}
            {result.type === 'Error' && <p className="text-red-600">{result.message}</p>}
            {result.type === 'Inventory' && <p className="text-slate-600">{result.data.message}</p>}
          </div>
        )}

        {/* History Toggle */}
        {logs.length > 0 && (
          <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 text-sm text-slate-500 font-medium w-full justify-center py-2">
            <History size={16} /> {showHistory ? 'Hide' : 'Show'} History ({logs.length})
          </button>
        )}

        {/* Scan History */}
        {showHistory && logs.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="font-bold text-sm flex items-center gap-1.5"><History size={15} /> Scan History</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSoundOn(!soundOn)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700" aria-label={soundOn ? 'Mute' : 'Unmute'}>
                  {soundOn ? <Volume2 size={12} /> : <VolumeX size={12} />}
                </button>
                <button onClick={() => setLogs([])} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-500">
                  <RotateCcw size={12} /> Clear
                </button>
              </div>
            </div>
            <div className="divide-y max-h-64 overflow-y-auto">
              {logs.map(log => (
                <div key={log.id} className="p-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.type === 'SUCCESS' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-medium truncate">{log.value}</p>
                    <p className="text-xs text-slate-400">{log.mode} · {log.msg || ''}</p>
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showCamera && (
        <CameraScanner
          onScan={handleCameraScan}
          onClose={() => setShowCamera(false)}
          label={`Scanning ${SCAN_MODES.find(m => m.id === mode)?.label || 'barcode'}`}
        />
      )}
    </div>
  );
};

export default MobileScan;
