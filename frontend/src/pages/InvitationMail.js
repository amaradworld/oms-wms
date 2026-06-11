import React, { useState, useCallback, useRef } from 'react';
import { Mail, Send, Eye, ExternalLink, Check, Loader2, Copy, X } from 'lucide-react';
import API from '../utils/api';
import { toast } from '../components/Toast';

const InvitationMail = () => {
  const [form, setForm] = useState({ clientName: '', clientEmail: '', companyName: '', customMessage: '' });
  const [sending, setSending] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const iframeRef = useRef(null);
  const [history, setHistory] = useState([]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const res = await API.post('/invitations/preview', {
        clientName: form.clientName || '[Client Name]',
        clientEmail: form.clientEmail || '[email]',
        companyName: form.companyName || '[Company]',
        customMessage: form.customMessage,
      });
      setPreviewHtml(res.data.html);
      setShowPreview(true);
    } catch {
      toast.error('Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  }, [form]);

  const handleSend = useCallback(async () => {
    if (!form.clientEmail.trim()) return toast.error('Client email is required');
    if (!form.companyName.trim()) return toast.error('Company name is required');
    setSending(true);
    try {
      const res = await API.post('/invitations/send', form);
      if (res.data.fallback) {
        toast.info('SMTP not configured — opening Gmail with pre-filled email');
        window.open(res.data.gmailUrl, '_blank');
      } else {
        toast.success(`Invitation sent to ${form.clientEmail}`);
      }
      setHistory(prev => [{ name: form.clientName, email: form.clientEmail, company: form.companyName, time: new Date().toLocaleString(), fallback: !!res.data.fallback }, ...prev]);
      setForm({ clientName: '', clientEmail: '', companyName: '', customMessage: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  }, [form]);

  const openInGmail = useCallback(async () => {
    try {
      const res = await API.get('/invitations/gmail', {
        params: { name: form.clientName, email: form.clientEmail, company: form.companyName, message: form.customMessage },
      });
      window.open(res.data.url, '_blank');
    } catch {
      toast.error('Failed to generate Gmail link');
    }
  }, [form]);

  const copyHtml = useCallback(async () => {
    try {
      const res = await API.post('/invitations/preview', {
        clientName: form.clientName || '[Client Name]',
        clientEmail: form.clientEmail || '[email]',
        companyName: form.companyName || '[Company]',
        customMessage: form.customMessage,
      });
      await navigator.clipboard.writeText(res.data.html);
      toast.success('HTML copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  }, [form]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Mail size={24} className="text-blue-600" /> Invitation Mail
          </h1>
          <p className="text-sm text-slate-500">Send 45-Day Pilot Program invitations to prospective clients</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Client Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client Name</label>
                <input
                  type="text"
                  value={form.clientName}
                  onChange={e => handleChange('clientName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Client Email *</label>
                <input
                  type="email"
                  required
                  value={form.clientEmail}
                  onChange={e => handleChange('clientEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="rahul@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={form.companyName}
                  onChange={e => handleChange('companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Acme Retail Pvt Ltd"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Personal Note (optional)</label>
                <textarea
                  value={form.customMessage}
                  onChange={e => handleChange('customMessage', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="e.g. We spoke at the Mumbai ecommerce meet last week..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {sending ? 'Sending...' : 'Send Email'}
              </button>
              <button
                onClick={openInGmail}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                title="Open in Gmail"
              >
                <ExternalLink size={16} /> Gmail
              </button>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={loadPreview}
                disabled={previewLoading}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Eye size={14} /> Preview
              </button>
              <button
                onClick={copyHtml}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Copy size={14} /> Copy HTML
              </button>
            </div>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 mt-4">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Sent History (this session)</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-green-50 rounded-lg text-xs">
                    <Check size={14} className="text-green-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 truncate">{h.company}{h.fallback ? ' (Gmail)' : ''}</p>
                      <p className="text-slate-500">{h.email} &bull; {h.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="lg:col-span-3">
          {showPreview ? (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-xs text-slate-500 font-mono ml-2">Email Preview</span>
                </div>
                <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-slate-200 rounded">
                  <X size={14} className="text-slate-400" />
                </button>
              </div>
              <iframe
                ref={iframeRef}
                srcDoc={previewHtml}
                title="Email Preview"
                className="w-full border-0"
                style={{ height: 'calc(100vh - 280px)', minHeight: '600px' }}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center text-center min-h-[500px]">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
                <Mail size={28} className="text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Email Preview</h3>
              <p className="text-sm text-slate-500 max-w-sm mb-6">
                Fill in the client details and click "Preview" to see how the invitation email will look before sending.
              </p>
              <button
                onClick={loadPreview}
                disabled={previewLoading}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
              >
                {previewLoading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                Generate Preview
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvitationMail;
