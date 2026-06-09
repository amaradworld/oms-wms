import React, { useState, useEffect, useCallback } from 'react';
import { Folder, FolderOpen, FileText, Download, Eye, Calendar, Filter, ChevronRight, X, Loader2, RefreshCw } from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

const TYPE_LABELS = {
  GRN: 'GRN Reports',
  ORDER: 'Order Reports',
  STOCK_TRANSFER: 'Stock Transfer',
  INVENTORY_SNAPSHOT: 'Inventory Snapshot',
  DISPATCH_MANIFEST: 'Dispatch/Manifest',
};

const TYPE_COLORS = {
  GRN: 'text-teal-600',
  ORDER: 'text-blue-600',
  STOCK_TRANSFER: 'text-purple-600',
  INVENTORY_SNAPSHOT: 'text-green-600',
  DISPATCH_MANIFEST: 'text-amber-600',
};

const ReportsFtp = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [expandedDates, setExpandedDates] = useState(new Set());
  const [previewReport, setPreviewReport] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedType) params.type = selectedType;
      if (selectedDate) {
        params.from = selectedDate;
        params.to = selectedDate;
      }
      const res = await API.get('/ftp/reports', { params });
      setReports(res.data || {});
      const dates = Object.keys(res.data || {}).sort().reverse();
      if (dates.length > 0) {
        setExpandedDates(prev => prev.size === 0 ? new Set([dates[0]]) : prev);
      }
    } catch {
      setReports({});
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedDate]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const toggleDate = (date) => {
    const next = new Set(expandedDates);
    if (next.has(date)) next.delete(date);
    else next.add(date);
    setExpandedDates(next);
  };

  const handleDownload = async (report) => {
    try {
      const res = await API.get(`/ftp/reports/${report.id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = report.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success(`Downloaded ${report.fileName}`);
    } catch {
      toast.error('Download failed');
    }
  };

  const handlePreview = async (report) => {
    setPreviewReport(report);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await API.get(`/ftp/reports/${report.id}/preview`);
      setPreviewData(res.data);
    } catch {
      toast.error('Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await API.post('/ftp/reports/generate');
      toast.success('Reports generated for current hour');
      fetchReports();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const dates = Object.keys(reports).sort().reverse();
  const totalReports = Object.values(reports).reduce((sum, types) =>
    sum + Object.values(types).reduce((s, files) => s + files.length, 0), 0
  );

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports (FTP)</h1>
          <p className="text-sm text-slate-500">Auto-generated hourly reports. Download CSV files for GRN, Orders, Transfers, Inventory, and Dispatch.</p>
        </div>
        {(user?.role === 'SUPER_ADMIN' || user?.role === 'PLATFORM_ADMIN') && (
          <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
            {generating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Generate Now
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-slate-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-slate-400">{totalReports} report{totalReports !== 1 && 's'} found</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : dates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">No reports yet</h3>
          <p className="text-sm text-slate-400 mb-4">Reports are generated hourly. Click "Generate Now" to create reports for the current hour.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dates.map(date => {
            const isExpanded = expandedDates.has(date);
            const types = reports[date];
            const fileCount = Object.values(types).reduce((s, f) => s + f.length, 0);
            return (
              <div key={date} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div
                  onClick={() => toggleDate(date)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  {isExpanded ? <FolderOpen size={18} className="text-blue-500" /> : <Folder size={18} className="text-slate-400" />}
                  <ChevronRight size={14} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  <span className="font-medium text-sm text-slate-700">{date}</span>
                  <span className="text-xs text-slate-400">{fileCount} file{fileCount !== 1 && 's'}</span>
                </div>
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {Object.entries(types).map(([type, files]) => (
                      <div key={type}>
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50">
                          <Folder size={14} className="text-slate-400" />
                          <span className={`text-xs font-medium ${TYPE_COLORS[type] || 'text-slate-600'}`}>{TYPE_LABELS[type] || type}</span>
                          <span className="text-xs text-slate-400">({files.length})</span>
                        </div>
                        {files.map(file => (
                          <div key={file.id} className="flex items-center gap-3 px-4 py-2.5 pl-10 hover:bg-slate-50 transition-colors">
                            <FileText size={14} className="text-slate-400" />
                            <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{file.fileName}</span>
                            <span className="text-xs text-slate-400">{formatFileSize(file.fileSize)}</span>
                            <button onClick={() => handlePreview(file)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 hover:text-blue-700" title="Preview">
                              <Eye size={14} />
                            </button>
                            <button onClick={() => handleDownload(file)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-500 hover:text-green-700" title="Download">
                              <Download size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewReport && (
        <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 p-4" onClick={() => setPreviewReport(null)}>
          <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold">{previewReport.fileName}</h2>
                <p className="text-xs text-slate-400">{TYPE_LABELS[previewReport.reportType]} • {previewReport.period?.slice(0, 16).replace('T', ' ')}</p>
              </div>
              <button onClick={() => setPreviewReport(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              {previewLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-slate-400" />
                </div>
              ) : previewData ? (
                <div>
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-xs text-slate-500">{previewData.totalRows} total rows</span>
                    <span className="text-xs text-slate-400">(showing first 100)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <pre className="text-xs font-mono text-slate-700 bg-slate-50 rounded-lg p-4 whitespace-pre-wrap border">{previewData.preview}</pre>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-3 px-5 py-3 border-t border-slate-200">
              <button onClick={() => handleDownload(previewReport)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                <Download size={14} /> Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsFtp;
