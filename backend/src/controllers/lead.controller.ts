import { Request, Response } from 'express';
import prisma from '../services/prisma';
import { logAudit } from '../services/audit.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_VOLUMES = ['<500', '500-1k', '1k-5k', '5k-25k', '25k+'];
const VALID_PLANS = ['starter', 'pro', 'enterprise'];
const VALID_SOURCES = ['marketing_site', 'demo_cta', 'plan_starter', 'plan_pro', 'plan_enterprise', 'footer', 'navbar', 'cta_section'];

const isFreeEmail = (email: string): boolean => {
  const lower = email.toLowerCase();
  return /(gmail|yahoo|outlook|hotmail|rediff|protonmail|icloud|aol|mail\.ru|qq|163|yandex|zoho)\./.test(lower);
};

export const createLead = async (req: Request, res: Response) => {
  const { name, email, company, phone, monthlyOrders, plan, message, source } = req.body || {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ message: 'Please enter your full name' });
  }
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid work email address' });
  }
  if (monthlyOrders && !VALID_VOLUMES.includes(monthlyOrders)) {
    return res.status(400).json({ message: 'Invalid order volume' });
  }
  if (plan && !VALID_PLANS.includes(plan)) {
    return res.status(400).json({ message: 'Invalid plan' });
  }

  // soft rate limit: 1 lead per email per hour
  try {
    const recent = await prisma.lead.findFirst({
      where: { email: email.toLowerCase(), createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
    });
    if (recent) {
      return res.status(429).json({ message: 'A request from this email was received in the last hour. Our team will reach out shortly.' });
    }
  } catch {}

  const lead = await prisma.lead.create({
    data: {
      name: name.trim().slice(0, 200),
      email: email.toLowerCase().slice(0, 200),
      company: company ? company.trim().slice(0, 200) : null,
      phone: phone ? phone.trim().slice(0, 50) : null,
      monthlyOrders: monthlyOrders || null,
      plan: plan || null,
      message: message ? message.trim().slice(0, 2000) : null,
      source: VALID_SOURCES.includes(source) ? source : 'marketing_site',
      referrer: (req.headers.referer || req.headers.referrer || '').toString().slice(0, 500) || null,
      status: isFreeEmail(email) ? 'NEW' : 'NEW',
    },
    select: { id: true, createdAt: true },
  });

  // Audit log (platform-level; tenantId is null)
  logAudit({
    tenantId: null,
    userId: null,
    action: 'LEAD_CREATED',
    entityType: 'Lead',
    entityId: lead.id,
    newValue: { name: name.trim(), email: email.toLowerCase(), company, plan, source },
  });

  res.status(201).json({ id: lead.id, message: 'Thanks! Our team will reach out within 24 hours.' });
};

export const getLeads = async (req: Request, res: Response) => {
  const { status, q } = req.query;
  const where: any = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { name: { contains: q as string, mode: 'insensitive' } },
      { email: { contains: q as string, mode: 'insensitive' } },
      { company: { contains: q as string, mode: 'insensitive' } },
    ];
  }
  const leads = await prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 });
  res.json(leads);
};

export const updateLead = async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { status, notes } = req.body || {};
  const data: any = {};
  if (status) data.status = status;
  if (notes !== undefined) data.notes = notes;
  const lead = await prisma.lead.update({ where: { id }, data });
  res.json(lead);
};
