import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserPlus, Search, Filter, Mail, Phone, Building2, MessageSquare,
  Clock, Tag, Loader2, X, Check, ChevronRight, TrendingUp, Users,
  Calendar, ExternalLink, Copy, Inbox, Send
} from 'lucide-react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { toast } from '../components/Toast';
import { TableSkeleton } from '../components/Skeleton';
import { exportToCSV } from '../utils/csvExport';

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'New', color: 'bg-blue-100 text-blue-700' },
  { value: 'CONTACTED', label: 'Contacted', color: 'bg-amber-100 text-amber-700' },
  { value: 'QUALIFIED', label: 'Qualified', color: 'bg-violet-100 text-violet-700' },
  { value: 'WON', label: 'Won', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'LOST', label: 'Lost', color: 'bg-slate-200 text-slate-600' },
];

const PLAN_LABELS = {
  starter: 'Starter (₹8,999/mo)',
  pro: 'Pro (₹17,999/mo)',
  enterprise: 'Enterprise',
};

const SOURCE_LABELS = {
  marketing_site: 'Marketing site',
  navbar: 'Navbar',
  cta_section: 'Hero CTA',
  demo_cta: 'Demo CTA',
  plan_starter: 'Starter plan',
  plan_pro: 'Pro plan',
  plan_enterprise: 'Enterprise plan',
  pricing_detail: 'Pricing detail',
  footer: 'Footer',
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const StatusPill = ({ status }) => {
  const opt = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${opt.color}`}>
      {opt.label}
    </span>
  );
};

const Leads = () => {
  const { user } = useAuth();
  const isPlatform = user?.role === 'PLATFORM_ADMIN';
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [digestSending, setDigestSending] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.q = search;
      const res = await API.get('/leads', { params });
      setLeads(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error('Only platform owner can view leads');
      } else {
        toast.error('Failed to load leads');
      }
      setLeads([]);
    } finally { setLoading(false); }
  }, [statusFilter, search]);

  useEffect(() => {
    if (isPlatform) fetchLeads();
  }, [fetchLeads, isPlatform]);

  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    return {
      total: leads.length,
      new: leads.filter(l => l.status === 'NEW').length,
      contacted: leads.filter(l => l.status === 'CONTACTED').length,
      qualified: leads.filter(l => l.status === 'QUALIFIED').length,
      won: leads.filter(l => l.status === 'WON').length,
      lost: leads.filter(l => l.status === 'LOST').length,
      thisWeek: leads.filter(l => new Date(l.createdAt).getTime() > weekAgo).length,
    };
  }, [leads]);

  const sources = useMemo(() => {
    const set = new Set(leads.map(l => l.source).filter(Boolean));
    return Array.from(set);
  }, [leads]);

  const filtered = useMemo(() => leads.filter(l => {
    if (planFilter && l.plan !== planFilter) return false;
    if (sourceFilter && l.source !== sourceFilter) return false;
    return true;
  }), [leads, planFilter, sourceFilter]);

  const openDetail = (lead) => {
    setSelected(lead);
    setNotes(lead.notes || '');
  };

  const closeDetail = () => {
    setSelected(null);
    setNotes('');
  };

  const updateLead = async (id, updates) => {
    setSaving(true);
    try {
      const res = await API.put(`/leads/${id}`, updates);
      setLeads(prev => prev.map(l => l.id === id ? res.data : l));
      if (selected?.id === id) setSelected(res.data);
      toast.success('Lead updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setSaving(false); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleExport = () => {
    exportToCSV('leads', filtered.map(l => ({
      Name: l.name,
      Email: l.email,
      Company: l.company || '',
      Phone: l.phone || '',
      'Monthly Orders': l.monthlyOrders || '',
      Plan: l.plan ? (PLAN_LABELS[l.plan] || l.plan) : '',
      Source: SOURCE_LABELS[l.source] || l.source || '',
      Status: l.status,
      Message: l.message || '',
      Notes: l.notes || '',
      'Created At': new Date(l.createdAt).toISOString(),
    })));
    toast.success(`${filtered.length} leads exported`);
  };

  const handleSendDigest = async () => {
    if (digestSending) return;
    setDigestSending(true);
    try {
      // Fetch all leads (last 7d) for the digest body
      const res = await API.get('/leads');
      const all = Array.isArray(res.data) ? res.data : [];
      const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recent = all.filter(l => new Date(l.createdAt).getTime() > since);
      const allOpen = all.filter(l => ['NEW', 'CONTACTED', 'QUALIFIED'].includes(l.status)).length;
      const wonThisWeek = all.filter(l => l.status === 'WON' && new Date(l.createdAt).getTime() > since).length;

      const escapeHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      const planLabel = (p) => p ? ({ starter: 'Starter (₹8,999/mo)', pro: 'Pro (₹17,999/mo)', enterprise: 'Enterprise' })[p] || p : '—';
      const subject = `GlobalSupply leads digest — ${recent.length} new in last 7 days`;
      const rowsHtml = recent.length === 0
        ? '<tr><td colspan="4" style="padding:20px;text-align:center;color:#94A3B8;">No new leads in this period.</td></tr>'
        : recent.map(l => `
          <tr>
            <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-size:13px;font-weight:600;color:#0F172A;">${escapeHtml(l.name)}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-size:13px;"><a href="mailto:${escapeHtml(l.email)}" style="color:#0D9488;">${escapeHtml(l.email)}</a></td>
            <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-size:13px;color:#475569;">${escapeHtml(l.company || '—')}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-size:13px;color:#475569;">${escapeHtml(planLabel(l.plan))}</td>
          </tr>
        `).join('');
      const html = `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;">
          <div style="background:#0F172A;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;">
            <div style="font-size:12px;opacity:0.7;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;margin-bottom:4px;">Weekly leads digest</div>
            <div style="font-size:22px;font-weight:700;">${recent.length} new in last 7 days</div>
            <div style="font-size:11px;opacity:0.7;margin-top:4px;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</div>
          </div>
          <div style="background:#fff;border:1px solid #E2E8F0;border-top:none;padding:0;">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid #E2E8F0;">
              <div style="padding:16px;text-align:center;border-right:1px solid #E2E8F0;">
                <div style="font-size:22px;font-weight:700;">${recent.length}</div>
                <div style="font-size:10px;color:#64748B;text-transform:uppercase;font-weight:600;margin-top:2px;">New (7d)</div>
              </div>
              <div style="padding:16px;text-align:center;border-right:1px solid #E2E8F0;">
                <div style="font-size:22px;font-weight:700;color:#6366F1;">${allOpen}</div>
                <div style="font-size:10px;color:#64748B;text-transform:uppercase;font-weight:600;margin-top:2px;">Open pipeline</div>
              </div>
              <div style="padding:16px;text-align:center;">
                <div style="font-size:22px;font-weight:700;color:#10B981;">${wonThisWeek}</div>
                <div style="font-size:10px;color:#64748B;text-transform:uppercase;font-weight:600;margin-top:2px;">Won (7d)</div>
              </div>
            </div>
            <table style="width:100%;border-collapse:collapse;">
              <thead><tr style="background:#F8FAFC;">
                <th style="text-align:left;padding:10px 12px;font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;">Name</th>
                <th style="text-align:left;padding:10px 12px;font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;">Email</th>
                <th style="text-align:left;padding:10px 12px;font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;">Company</th>
                <th style="text-align:left;padding:10px 12px;font-size:10px;font-weight:700;color:#64748B;text-transform:uppercase;">Plan</th>
              </tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
        </div>
      `;

      const w3fRes = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: 'f1c4903f-5c5d-4c8d-9dab-9a5badf3064e',
          from_name: 'GlobalSupply Leads',
          subject,
          html,
          'New (7d)': String(recent.length),
          'Open pipeline': String(allOpen),
          'Won (7d)': String(wonThisWeek),
        }),
      });
      const w3fJson = await w3fRes.json().catch(() => ({}));
      if (w3fJson.success) {
        toast.success(`Digest sent — ${recent.length} new, ${allOpen} open`);
      } else {
        toast.error(w3fJson.message || 'Digest failed');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Digest failed');
    } finally { setDigestSending(false); }
  };

  if (!isPlatform) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-slate-400">
          <div className="text-5xl mb-4">🔒</div>
          <p className="text-lg font-medium">Access Denied</p>
          <p className="text-sm mt-1">Only platform owner can view leads.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserPlus size={22} className="text-blue-600" /> Leads
          </h1>
          <p className="text-sm text-slate-500">Marketing site signups and demo requests</p>
        </div>
        <button onClick={handleSendDigest} disabled={digestSending} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          {digestSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          Send digest to sales
        </button>
        <button onClick={handleExport} disabled={filtered.length === 0} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <ExternalLink size={16} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Users} label="Total leads" value={stats.total} color="blue" />
        <StatCard icon={Inbox} label="New" value={stats.new} color="indigo" />
        <StatCard icon={Calendar} label="This week" value={stats.thisWeek} color="emerald" />
        <StatCard icon={TrendingUp} label="Qualified + Won" value={stats.qualified + stats.won} color="amber" />
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search name, email, company..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
          <option value="">All plans</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        {sources.length > 0 && (
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            <option value="">All sources</option>
            {sources.map(s => <option key={s} value={s}>{SOURCE_LABELS[s] || s}</option>)}
          </select>
        )}
      </div>

      {loading ? <TableSkeleton rows={8} /> : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium">Lead</th>
                  <th className="text-left px-4 py-3 font-medium">Company</th>
                  <th className="text-left px-4 py-3 font-medium">Plan</th>
                  <th className="text-left px-4 py-3 font-medium">Source</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-right px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                    <Inbox size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No leads yet</p>
                    <p className="text-xs mt-1">When visitors fill out the form on globalsupply.in, they'll appear here</p>
                  </td></tr>
                ) : filtered.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => openDetail(l)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {l.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate">{l.name}</div>
                          <div className="text-xs text-slate-500 truncate">{l.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {l.company || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {l.plan ? (
                        <span className="font-medium">{PLAN_LABELS[l.plan] || l.plan}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {SOURCE_LABELS[l.source] || l.source || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={l.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs" title={new Date(l.createdAt).toLocaleString()}>
                      {formatDate(l.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight size={16} className="inline text-slate-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
            <span>{filtered.length} lead{filtered.length !== 1 ? 's' : ''}</span>
            {filtered.length > 0 && <span>Newest first</span>}
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeDetail}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-sm font-semibold">
                  {selected.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selected.name}</h2>
                  <p className="text-xs text-slate-500">{new Date(selected.createdAt).toLocaleString()}</p>
                </div>
              </div>
              <button onClick={closeDetail} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ContactRow icon={Mail} label="Email" value={selected.email} onCopy={() => copyToClipboard(selected.email)} />
                <ContactRow icon={Phone} label="Phone" value={selected.phone} onCopy={() => selected.phone && copyToClipboard(selected.phone)} />
                <ContactRow icon={Building2} label="Company" value={selected.company} />
                <ContactRow icon={Tag} label="Monthly orders" value={selected.monthlyOrders} />
                <ContactRow icon={Tag} label="Plan" value={selected.plan ? PLAN_LABELS[selected.plan] : null} />
                <ContactRow icon={Clock} label="Source" value={SOURCE_LABELS[selected.source] || selected.source} />
                {selected.referrer && (
                  <div className="md:col-span-2">
                    <ContactRow icon={ExternalLink} label="Referrer" value={selected.referrer} />
                  </div>
                )}
              </div>

              {selected.message && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2">
                    <MessageSquare size={14} /> Message
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selected.message}</p>
                </div>
              )}

              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button
                      key={s.value}
                      onClick={() => selected.status !== s.value && updateLead(selected.id, { status: s.value })}
                      disabled={saving}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all disabled:opacity-50 ${
                        selected.status === s.value
                          ? s.color + ' border-current'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {selected.status === s.value && <Check size={12} className="inline mr-1" />}
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Internal notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Notes from your call, demo time, requirements, follow-up cadence..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button
                    onClick={() => setNotes(selected.notes || '')}
                    disabled={saving || notes === (selected.notes || '')}
                    className="px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => updateLead(selected.id, { notes })}
                    disabled={saving || notes === (selected.notes || '')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving && <Loader2 size={12} className="animate-spin" />}
                    Save notes
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-2">
                <a
                  href={`mailto:${selected.email}?subject=Re: Your GlobalSupply enquiry&body=Hi ${encodeURIComponent(selected.name?.split(' ')[0] || '')},%0D%0A%0D%0AThanks for your interest in GlobalSupply Technologies!`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
                >
                  <Mail size={12} /> Email lead
                </a>
                {selected.phone && (
                  <a
                    href={`tel:${selected.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors"
                  >
                    <Phone size={12} /> Call
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => {
  const colorMap = {
    blue: 'from-blue-500 to-blue-600',
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${colorMap[color] || colorMap.blue} flex items-center justify-center flex-shrink-0`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-slate-900 leading-tight">{value}</div>
        <div className="text-xs text-slate-500 truncate">{label}</div>
      </div>
    </div>
  );
};

const ContactRow = ({ icon: Icon, label, value, onCopy }) => {
  if (!value) return (
    <div className="flex items-start gap-2">
      <Icon size={14} className="text-slate-400 mt-1 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-slate-500">{label}</div>
        <div className="text-sm text-slate-300">—</div>
      </div>
    </div>
  );
  return (
    <div className="flex items-start gap-2 group">
      <Icon size={14} className="text-slate-400 mt-1 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-slate-500">{label}</div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-slate-800 break-all">{value}</span>
          {onCopy && (
            <button onClick={onCopy} className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-slate-100 rounded" title="Copy">
              <Copy size={12} className="text-slate-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Leads;
