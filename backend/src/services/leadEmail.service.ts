import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { logAudit } from './audit.service';
import { AuthRequest } from '../middlewares/auth.middleware';

const WEB3FORMS_KEY = process.env.WEB3FORMS_KEY || 'f1c4903f-5c5d-4c8d-9dab-9a5badf3064e';
const SALES_EMAIL = process.env.SALES_NOTIFICATION_EMAIL || 'sales@globalsupply.in';
const SITE_URL = process.env.SITE_URL || 'https://globalsupply.in';
const APP_URL = process.env.APP_URL || 'https://globalsupply.in/app';

const formatVolume = (v?: string | null) => v ? ({ '<500': '<500/mo', '500-1k': '500-1k/mo', '1k-5k': '1k-5k/mo', '5k-25k': '5k-25k/mo', '25k+': '25k+/mo' } as any)[v] || v : '—';
const formatPlan = (p?: string | null) => p ? ({ starter: 'Starter (₹2,999/mo)', pro: 'Pro (₹9,999/mo)', enterprise: 'Enterprise' } as any)[p] || p : 'Not sure yet';

export const sendNewLeadEmail = async (lead: any) => {
  const subject = `New lead: ${lead.name} — ${lead.company || lead.email}`;
  const fields: Record<string, string> = {
    subject,
    'Lead name': lead.name,
    'Email': lead.email,
    'Company': lead.company || '—',
    'Phone': lead.phone || '—',
    'Plan': formatPlan(lead.plan),
    'Monthly orders': formatVolume(lead.monthlyOrders),
    'Source': lead.source || 'marketing_site',
    'Message': (lead.message || '—').slice(0, 500),
    'Submitted': new Date(lead.createdAt || Date.now()).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  };
  if (lead.referrer) fields['Referrer'] = lead.referrer;

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#3B82F6,#6366F1);color:#fff;padding:24px 28px;border-radius:12px 12px 0 0;">
        <div style="font-size:13px;opacity:0.85;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;margin-bottom:4px;">New lead from marketing site</div>
        <div style="font-size:24px;font-weight:700;letter-spacing:-0.02em;">${escapeHtml(lead.name)}</div>
        <div style="font-size:14px;opacity:0.9;margin-top:4px;">${escapeHtml(lead.company || lead.email)}</div>
      </div>
      <div style="background:#fff;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 12px 12px;padding:24px 28px;">
        ${Object.entries(fields).map(([k, v]) => `
          <div style="display:flex;padding:8px 0;border-bottom:1px solid #F1F5F9;">
            <div style="width:140px;font-size:12px;font-weight:600;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;flex-shrink:0;">${k}</div>
            <div style="flex:1;font-size:14px;color:#0F172A;word-break:break-word;">${escapeHtml(String(v))}</div>
          </div>
        `).join('')}
        <div style="margin-top:24px;text-align:center;">
          <a href="${APP_URL}/leads" style="display:inline-block;padding:12px 24px;background:#0F172A;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Open in Leads admin →</a>
        </div>
      </div>
      <div style="text-align:center;font-size:11px;color:#94A3B8;margin-top:16px;">
        Reply directly to <a href="mailto:${lead.email}" style="color:#0D9488;">${lead.email}</a> to follow up.
      </div>
    </div>
  `;

  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        from_name: 'SupplyHub Leads',
        replyto: lead.email,
        subject,
        html,
        ...fields,
      }),
    });
    const json: any = await res.json().catch(() => ({}));
    console.log(`[email] New lead email: status=${res.status} success=${json?.success} message=${json?.message || '-'}`);
    return { ok: res.ok && json?.success !== false, status: res.status, message: json?.message, data: json };
  } catch (e: any) {
    console.error('[email] Failed to send new lead email:', e.message);
    return { ok: false, error: e.message };
  }
};

export const sendDailyDigest = async (req: AuthRequest, res: Response) => {
  const hours = Number(req.query.hours) || 24;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const newLeads = await prisma.lead.findMany({
    where: { createdAt: { gt: since } },
    orderBy: { createdAt: 'desc' },
  });
  const allOpen = await prisma.lead.count({ where: { status: { in: ['NEW', 'CONTACTED', 'QUALIFIED'] } } });
  const wonThisWeek = await prisma.lead.count({
    where: { status: 'WON', createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
  });
  const totalLeads = await prisma.lead.count();

  const subject = `SupplyHub leads digest — ${newLeads.length} new in last ${hours}h`;
  const rowsHtml = newLeads.length === 0
    ? '<tr><td colspan="4" style="padding:24px;text-align:center;color:#94A3B8;font-size:14px;">No new leads in this period.</td></tr>'
    : newLeads.map(l => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-size:13px;font-weight:600;color:#0F172A;">${escapeHtml(l.name)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-size:13px;"><a href="mailto:${escapeHtml(l.email)}" style="color:#0D9488;text-decoration:none;">${escapeHtml(l.email)}</a></td>
        <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-size:13px;color:#475569;">${escapeHtml(l.company || '—')}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #F1F5F9;font-size:13px;color:#475569;">${escapeHtml(formatPlan(l.plan))}</td>
      </tr>
    `).join('');

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:0 auto;">
      <div style="background:#0F172A;color:#fff;padding:24px 28px;border-radius:12px 12px 0 0;">
        <div style="font-size:13px;opacity:0.7;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;margin-bottom:4px;">Daily leads digest</div>
        <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em;">${newLeads.length} new in last ${hours}h</div>
        <div style="font-size:12px;opacity:0.7;margin-top:4px;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</div>
      </div>
      <div style="background:#fff;border:1px solid #E2E8F0;border-top:none;padding:0;">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-bottom:1px solid #E2E8F0;">
          <div style="padding:18px 20px;text-align:center;border-right:1px solid #E2E8F0;">
            <div style="font-size:24px;font-weight:700;color:#0F172A;">${newLeads.length}</div>
            <div style="font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;margin-top:2px;">New (${hours}h)</div>
          </div>
          <div style="padding:18px 20px;text-align:center;border-right:1px solid #E2E8F0;">
            <div style="font-size:24px;font-weight:700;color:#6366F1;">${allOpen}</div>
            <div style="font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;margin-top:2px;">Open pipeline</div>
          </div>
          <div style="padding:18px 20px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#10B981;">${wonThisWeek}</div>
            <div style="font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;font-weight:600;margin-top:2px;">Won (7d)</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-top:8px;">
          <thead>
            <tr style="background:#F8FAFC;">
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;">Name</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;">Email</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;">Company</th>
              <th style="text-align:left;padding:10px 12px;font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.04em;">Plan</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div style="padding:20px 24px;text-align:center;background:#F8FAFC;border-radius:0 0 12px 12px;">
          <a href="${APP_URL}/leads" style="display:inline-block;padding:12px 24px;background:#3B82F6;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Open Leads admin →</a>
        </div>
      </div>
    </div>
  `;

  try {
    const r = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        from_name: 'SupplyHub Leads',
        subject,
        html,
        'New in period': String(newLeads.length),
        'Open pipeline': String(allOpen),
        'Won (7d)': String(wonThisWeek),
        'Total all-time': String(totalLeads),
      }),
    });
    const json: any = await r.json().catch(() => ({}));
    const ok = r.ok && json?.success !== false;
    logAudit({
      tenantId: null,
      userId: req.user?.id || null,
      action: ok ? 'LEAD_DIGEST_SENT' : 'LEAD_DIGEST_FAILED',
      entityType: 'Lead',
      entityId: null,
      newValue: { hours, newCount: newLeads.length, allOpen, wonThisWeek, web3formsMessage: json?.message || json?.data || '' },
    });
    res.json({
      ok,
      sent: { hours, newCount: newLeads.length, allOpen, wonThisWeek, totalLeads },
      web3forms: { status: r.status, success: json?.success, message: json?.message || json?.data },
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
};

const escapeHtml = (s: string) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
