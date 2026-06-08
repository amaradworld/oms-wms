import React, { useRef, useState } from 'react';
import { Upload, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import API from '../utils/api';

const ImportButton = ({ label = 'Import', endpoint, onSuccess, warehouseId }) => {
  const fileRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setStatus('uploading');
    setMessage(`Uploading ${file.name}...`);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const params = warehouseId ? `?warehouseId=${encodeURIComponent(warehouseId)}` : '';
      const res = await API.post(`/${endpoint}/import${params}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setStatus('success');
      setMessage(res.data.message || 'Imported successfully');
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Connection error');
    }

    setTimeout(() => { setStatus('idle'); setMessage(''); }, 4000);
  };

  return (
    <div className="relative">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFile}
        className="hidden"
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={status === 'uploading'}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          status === 'uploading' ? 'bg-slate-200 text-slate-500 cursor-wait' :
          status === 'success' ? 'bg-green-100 text-green-700 border border-green-300' :
          status === 'error' ? 'bg-red-100 text-red-700 border border-red-300' :
          'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
        }`}
      >
        {status === 'uploading' ? <Loader2 size={16} className="animate-spin" /> :
         status === 'success' ? <CheckCircle2 size={16} /> :
         status === 'error' ? <XCircle size={16} /> :
         <Upload size={16} />}
        {status === 'idle' ? `Import ${label}` : message}
      </button>
    </div>
  );
};

export default ImportButton;
